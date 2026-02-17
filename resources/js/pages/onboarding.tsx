import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OnboardingDemoBanner } from '@/components/onboarding-demo-banner';
import { OnboardingTour, type TourStep } from '@/components/onboarding-tour';
import { OverlapPeriodModal } from '@/components/overlap-period-modal';
import { PeriodList } from '@/components/period-list';
import {
    addMonthsClamp,
    calculateDaysInclusive,
    dateKey,
    formatDateShort,
    formatMonthRange,
    isValidDate,
} from '@/lib/date';
import {
    createOnboardingPeriod,
    loadOnboardingPeriods,
    type OnboardingPeriod,
} from '@/lib/onboarding-periods';
import {
    isTourCompleted,
    isTourStarted,
    markTourCompleted,
    markTourStarted,
} from '@/lib/onboarding-session';
import type { DashboardPeriodItem } from '@/types/period';

const buildPeriodMeta = (period: DashboardPeriodItem) => {
    const hasValidDates =
        isValidDate(period.start_date) && isValidDate(period.end_date);
    const days = hasValidDates
        ? calculateDaysInclusive(period.start_date, period.end_date)
        : 0;

    return {
        title: hasValidDates
            ? `${formatDateShort(period.start_date)} — ${formatDateShort(
                  period.end_date,
              )}`
            : 'Период',
        subtitle: hasValidDates
            ? `${days} дней · ${formatMonthRange(
                  period.start_date,
                  period.end_date,
              )}`
            : 'Даты не заданы',
    };
};

const sortByDateDesc = (items: DashboardPeriodItem[]) =>
    [...items].sort((a, b) => {
        const aTs = new Date(a.start_date).getTime();
        const bTs = new Date(b.start_date).getTime();
        return bTs - aTs;
    });

const loadPeriods = (): DashboardPeriodItem[] =>
    sortByDateDesc(
        loadOnboardingPeriods().map((period: OnboardingPeriod) => ({
            id: period.id,
            start_date: period.start_date,
            end_date: period.end_date,
            is_pinned: period.is_pinned,
            is_closed: period.is_closed,
            actual_remaining: period.actual_remaining,
        })),
    );

export default function Onboarding() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [overlapPeriod, setOverlapPeriod] = useState<DashboardPeriodItem | null>(
        null,
    );
    const [pendingForce, setPendingForce] = useState(false);
    const [periods, setPeriods] = useState<DashboardPeriodItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [hasStartedGuide, setHasStartedGuide] = useState(() => isTourStarted());
    const [isGuideActive, setIsGuideActive] = useState(
        () => isTourStarted() && !isTourCompleted(),
    );
    const [tourInstance, setTourInstance] = useState(0);
    const [lastCreatedPeriodId, setLastCreatedPeriodId] = useState<number | null>(
        null,
    );
    const startInputRef = useRef<HTMLInputElement>(null);
    const endInputRef = useRef<HTMLInputElement>(null);
    const saveButtonRef = useRef<HTMLButtonElement>(null);
    const createdPeriodRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        setIsLoading(true);
        setLoadError(null);
        try {
            setPeriods(loadPeriods());
        } catch (err) {
            setLoadError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось загрузить периоды.',
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleCreatePeriod = async (force = false) => {
        if (!startDate || !endDate) {
            setError('Укажите даты начала и конца периода.');
            return;
        }

        if (!force) {
            const startKey = dateKey(startDate);
            const endKey = dateKey(endDate);
            const localOverlap = periods.find((period) => {
                const periodStart = dateKey(period.start_date);
                const periodEnd = dateKey(period.end_date);
                if (
                    !Number.isFinite(startKey) ||
                    !Number.isFinite(endKey) ||
                    !Number.isFinite(periodStart) ||
                    !Number.isFinite(periodEnd)
                ) {
                    return false;
                }
                return startKey < periodEnd && endKey > periodStart;
            });

            if (localOverlap) {
                setOverlapPeriod(localOverlap);
                setPendingForce(true);
                return;
            }
        }

        setIsSaving(true);
        setError(null);

        try {
            const created = createOnboardingPeriod(startDate, endDate);
            setLastCreatedPeriodId(created.id);
            setPeriods(loadPeriods());

            setStartDate('');
            setEndDate('');
            setOverlapPeriod(null);
            setPendingForce(false);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось сохранить период.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    const pinnedPeriod = useMemo(
        () => periods.find((period) => period.is_pinned),
        [periods],
    );

    const tourSteps = useMemo<TourStep[]>(
        () => [
            {
                stepId: 'start-date',
                title: 'Шаг 1',
                text: 'Выберете старт периода',
                targetRef: startInputRef,
                placement: 'top',
                nextCondition: Boolean(startDate),
                autoAdvance: true,
            },
            {
                stepId: 'end-date',
                title: 'Шаг 2',
                text: 'Теперь выберете дату окончания периода',
                targetRef: endInputRef,
                placement: 'top',
                nextCondition: Boolean(startDate && endDate),
                autoAdvance: true,
            },
            {
                stepId: 'save',
                title: 'Шаг 3',
                text: 'Нажмите "Сохранить", чтобы завершить шаг онбординга',
                targetRef: saveButtonRef,
                placement: 'top',
                nextCondition: Boolean(lastCreatedPeriodId),
                autoAdvance: true,
                hideNext: true,
            },
            {
                stepId: 'open-created-period',
                title: 'Шаг 4',
                text: 'Нажмите на созданный период, чтобы открыть его',
                targetRef: createdPeriodRef,
                placement: 'top',
                captureClick: true,
                hideNext: true,
            },
        ],
        [startDate, endDate, lastCreatedPeriodId],
    );

    return (
        <div className="flex min-h-screen w-full flex-col">
            <Head title="Onboarding" />
            <OnboardingDemoBanner />
            <main className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl pt-16">
                <div className="relative flex flex-1 flex-col gap-8 overflow-x-hidden rounded-xl p-6 font-body text-[#1c1a17] dark:text-[#f7f3ee]">
                    <div className="pointer-events-none absolute inset-0 rounded-3xl bg-aurora opacity-35 dark:hidden" />
                    <div className="pointer-events-none absolute inset-0 hidden rounded-3xl bg-aurora-night opacity-45 dark:block" />
                    <section className="relative z-10 flex flex-wrap items-end justify-between gap-6">
                        <div>
                            <h1 className="mt-3 font-display text-3xl">
                                Периоды учета
                            </h1>
                            <p className="mt-2 max-w-xl text-sm text-[#6a5d52] dark:text-white/70">
                                Добавьте новый период сверху и управляйте
                                историей ниже. При клике откроется отдельная
                                страница периода.
                            </p>
                        </div>
                    </section>

                    <section
                        className={`relative rounded-[28px] border border-black/10 bg-white/85 p-6 shadow-[0_22px_44px_-28px_rgba(28,26,23,0.6)] backdrop-blur dark:border-white/10 dark:bg-white/10 ${
                            isGuideActive ? 'z-50' : 'z-10'
                        }`}
                    >
                        <div
                            className="flex flex-wrap items-center justify-between gap-4"
                        >
                            <div>
                                <p className="text-xs uppercase tracking-[0.4em] text-[#6a5d52] dark:text-white/60">
                                    Новый период
                                </p>
                                <h2 className="mt-2 font-display text-2xl">
                                    Добавить диапазон дат
                                </h2>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr_1fr]">
                            <label className="relative z-[60] grid cursor-pointer grid-cols-[32px_minmax(0,1fr)] items-center gap-3 text-xs text-[#6a5d52] dark:text-white/70">
                                <span>С</span>
                                <input
                                    ref={startInputRef}
                                    type="date"
                                    value={startDate}
                                    onChange={(event) =>
                                        setStartDate(event.target.value)
                                    }
                                    min={
                                        endDate
                                            ? addMonthsClamp(endDate, -3)
                                            : undefined
                                    }
                                    max={endDate || undefined}
                                    className="date-input ml-auto w-[80%] rounded-lg border border-black/10 bg-white/90 px-4 py-3 text-sm text-[#1c1a17] outline-none transition focus:border-black/30 dark:border-white/10 dark:bg-white/10 dark:text-white sm:ml-0 sm:w-full"
                                />
                            </label>

                            <label className="grid cursor-pointer grid-cols-[32px_minmax(0,1fr)] items-center gap-3 text-xs text-[#6a5d52] dark:text-white/70">
                                <span>По</span>
                                <input
                                    ref={endInputRef}
                                    type="date"
                                    value={endDate}
                                    onChange={(event) =>
                                        setEndDate(event.target.value)
                                    }
                                    min={startDate || undefined}
                                    max={
                                        startDate
                                            ? addMonthsClamp(startDate, 3)
                                            : undefined
                                    }
                                    className="date-input ml-auto w-[80%] rounded-lg border border-black/10 bg-white/90 px-4 py-3 text-sm text-[#1c1a17] outline-none transition focus:border-black/30 dark:border-white/10 dark:bg-white/10 dark:text-white sm:ml-0 sm:w-full"
                                />
                            </label>

                            <div className="flex flex-col justify-end">
                                <button
                                    ref={saveButtonRef}
                                    className="rounded-2xl bg-[#4e3f7f] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(78,63,127,0.85)] transition hover:-translate-y-0.5 hover:bg-[#66529f] disabled:cursor-not-allowed disabled:opacity-70"
                                    type="button"
                                    onClick={() => {
                                        void handleCreatePeriod(false);
                                    }}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Сохранение...' : 'Сохранить'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="mt-3 text-xs text-[#b0352b] dark:text-[#ff8b7c]">
                                {error}
                            </p>
                        )}
                    </section>

                    <section className="relative z-10 grid gap-4">
                        {Boolean(pinnedPeriod) && (
                            <div className="rounded-[28px] border border-black/10 bg-white/70 p-5 shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
                                <p className="text-xs uppercase tracking-[0.4em] text-[#6a5d52] dark:text-white/60">
                                    Закреплённый период
                                </p>
                                <div className="mt-4">
                                    {(() => {
                                        if (!pinnedPeriod) {
                                            return null;
                                        }
                                        const meta = buildPeriodMeta(pinnedPeriod);
                                        return (
                                            <PeriodList
                                                items={[
                                                    {
                                                        id: pinnedPeriod.id,
                                                        title: meta.title,
                                                        subtitle: meta.subtitle,
                                                        isClosed: Boolean(
                                                            pinnedPeriod.is_closed,
                                                        ),
                                                        actualRemaining:
                                                            pinnedPeriod.actual_remaining ??
                                                            null,
                                                        elementRef:
                                                            pinnedPeriod.id ===
                                                            lastCreatedPeriodId
                                                                ? createdPeriodRef
                                                                : undefined,
                                                    },
                                                ]}
                                                itemHref={(period) =>
                                                    `/onboarding/periods/${period.id}`
                                                }
                                            />
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <h2 className="font-display text-2xl">
                                История периодов
                            </h2>
                            <span className="text-xs text-[#6a5d52] dark:text-white/60">
                                Сначала новые
                            </span>
                        </div>

                        <div className="grid gap-4">
                            {isLoading && (
                                <div className="rounded-[28px] border border-black/10 bg-white/70 p-5 text-sm text-[#6a5d52] dark:border-white/10 dark:bg-white/10 dark:text-white/70">
                                    Загружаем периоды...
                                </div>
                            )}
                            {loadError && (
                                <div className="rounded-[28px] border border-black/10 bg-white/70 p-5 text-sm text-[#b0352b] dark:border-white/10 dark:bg-white/10 dark:text-[#ff8b7c]">
                                    {loadError}
                                </div>
                            )}
                            {!isLoading && !loadError && periods.length === 0 && (
                                <div className="rounded-[28px] border border-black/10 bg-white/70 p-5 text-sm text-[#6a5d52] dark:border-white/10 dark:bg-white/10 dark:text-white/70">
                                    Периодов пока нет. Создайте первый диапазон
                                    выше.
                                </div>
                            )}
                            {!isLoading && !loadError && (
                                <PeriodList
                                    items={periods.map((period) => {
                                        const meta = buildPeriodMeta(period);
                                        return {
                                            id: period.id,
                                            title: meta.title,
                                            subtitle: meta.subtitle,
                                            isClosed: Boolean(period.is_closed),
                                            actualRemaining:
                                                period.actual_remaining ?? null,
                                            elementRef:
                                                period.id === lastCreatedPeriodId
                                                    ? createdPeriodRef
                                                    : undefined,
                                        };
                                    })}
                                    itemHref={(period) =>
                                        `/onboarding/periods/${period.id}`
                                    }
                                />
                            )}
                        </div>
                    </section>

                    {overlapPeriod && (
                        <OverlapPeriodModal
                            href={`/onboarding/periods/${overlapPeriod.id}`}
                            title={
                                isValidDate(overlapPeriod.start_date) &&
                                isValidDate(overlapPeriod.end_date)
                                    ? `${formatDateShort(
                                          overlapPeriod.start_date,
                                      )} — ${formatDateShort(
                                          overlapPeriod.end_date,
                                      )}`
                                    : 'Период'
                            }
                            subtitle={
                                isValidDate(overlapPeriod.start_date) &&
                                isValidDate(overlapPeriod.end_date)
                                    ? `${calculateDaysInclusive(
                                          overlapPeriod.start_date,
                                          overlapPeriod.end_date,
                                      )} дней · ${formatMonthRange(
                                          overlapPeriod.start_date,
                                          overlapPeriod.end_date,
                                      )}`
                                    : 'Даты не заданы'
                            }
                            onClose={() => {
                                setOverlapPeriod(null);
                                setPendingForce(false);
                            }}
                            onConfirm={() => {
                                void handleCreatePeriod(true);
                            }}
                            confirmDisabled={!pendingForce || isSaving}
                        />
                    )}
                </div>
            </main>
            {!hasStartedGuide && (
                <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/62 p-6">
                    <div className="w-full max-w-xl rounded-3xl border border-[#b9a6ff]/50 bg-[#1b1227]/95 p-7 text-white shadow-[0_30px_70px_-35px_rgba(0,0,0,0.9)]">
                        <p className="text-xs uppercase tracking-[0.35em] text-[#baa7ff]">
                            Онбординг
                        </p>
                        <h2 className="mt-3 font-display text-3xl">
                            Пошаговая демо-инструкция
                        </h2>
                        <p className="mt-3 text-sm text-white/80">
                            Вы пройдёте создание периода и открытие карточки периода.
                            Подсказки будут вести по шагам, а данные сохраняются
                            в рамках текущей сессии.
                        </p>
                        <div className="mt-6">
                            <button
                                type="button"
                                className="rounded-xl bg-[#7b67c5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8e79d8]"
                                onClick={() => {
                                    markTourStarted();
                                    setHasStartedGuide(true);
                                    setIsGuideActive(true);
                                    setTourInstance((prev) => prev + 1);
                                }}
                            >
                                Начать
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <OnboardingTour
                key={tourInstance}
                open={hasStartedGuide && isGuideActive}
                steps={tourSteps}
                onClose={() => {
                    markTourCompleted();
                    setIsGuideActive(false);
                }}
            />
        </div>
    );
}
