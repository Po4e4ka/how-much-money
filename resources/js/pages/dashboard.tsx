import { Head, usePage } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem, SharedData } from '@/types';
import { OverlapPeriodModal } from '@/components/overlap-period-modal';
import { PeriodList } from '@/components/period-list';
import { UpdateInfoModal } from '@/components/update-info-modal';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

const delay = (ms: number) => ({ '--delay': `${ms}ms` } as CSSProperties);

type PeriodItem = {
    id: number;
    start_date: string;
    end_date: string;
    is_pinned?: boolean;
    is_closed?: boolean;
    actual_remaining?: number | null;
};

const normalizeDate = (value: string) => {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
        return '';
    }
    return trimmed.includes('T') ? trimmed.slice(0, 10) : trimmed;
};

const parseDate = (value: string) => {
    const trimmed = normalizeDate(value);
    if (!trimmed) {
        return new Date('invalid');
    }
    const [year, month, day] = trimmed.split('-').map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
};

const isValidDate = (value: string) => {
    const date = parseDate(value);
    return Number.isFinite(date.getTime());
};

const dateKey = (value: string) => {
    const trimmed = normalizeDate(value);
    if (!trimmed) {
        return NaN;
    }
    return Number(trimmed.replaceAll('-', ''));
};

const formatDateShort = (value: string) => {
    const date = parseDate(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
};

    const formatMonthYear = (value: string) =>
        new Intl.DateTimeFormat('ru-RU', {
            month: 'long',
            year: 'numeric',
        }).format(parseDate(value));

const formatMonthRange = (start: string, end: string) => {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
        month: 'short',
    });
    const startMonth = formatter.format(parseDate(start));
    const endMonth = formatter.format(parseDate(end));
    const startYear = parseDate(start).getFullYear();
    const endYear = parseDate(end).getFullYear();

    if (startYear === endYear) {
        if (startMonth === endMonth) {
            return formatMonthYear(start);
        }
        return `${startMonth}–${endMonth} ${startYear}`;
    }

    return `${startMonth} ${startYear} – ${endMonth} ${endYear}`;
};

const addMonthsClamp = (value: string, months: number) => {
    if (!value) {
        return '';
    }
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
        return '';
    }
    const targetMonth = month - 1 + months;
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    const nextDay = Math.min(day, lastDay);
    const nextMonth = String(normalizedMonth + 1).padStart(2, '0');
    const nextDate = String(nextDay).padStart(2, '0');
    return `${targetYear}-${nextMonth}-${nextDate}`;
};

const calculateDaysInclusive = (start: string, end: string) => {
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
};

const buildPeriodMeta = (period: PeriodItem) => {
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

export default function Dashboard() {
    const { auth } = usePage<SharedData>().props;
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [overlapPeriod, setOverlapPeriod] = useState<PeriodItem | null>(
        null,
    );
    const [pendingForce, setPendingForce] = useState(false);
    const [periods, setPeriods] = useState<PeriodItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showUpdateInfo, setShowUpdateInfo] = useState(
        auth.user?.is_info_shown === false,
    );

    useEffect(() => {
        setShowUpdateInfo(auth.user?.is_info_shown === false);
    }, [auth.user]);

    const handleInfoShown = () => {
        setShowUpdateInfo(false);
        const token =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') ?? '';

        void fetch('/api/user/info-shown', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token,
            },
        }).catch((err) => {
            console.error(err);
        });
    };

    const fetchPeriods = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const response = await fetch('/api/periods');
            if (!response.ok) {
                throw new Error('Не удалось загрузить периоды.');
            }
            const payload = (await response.json()) as { data: PeriodItem[] };
            setPeriods(payload.data ?? []);
        } catch (err) {
            setLoadError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось загрузить периоды.',
            );
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchPeriods();
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
            const token =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute('content') ?? '';

            const response = await fetch('/api/periods', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
                body: JSON.stringify({
                    start_date: startDate,
                    end_date: endDate,
                    force: Boolean(force),
                }),
            });

            if (response.status === 409) {
                const payload = (await response.json()) as {
                    overlap?: PeriodItem;
                };
                if (payload.overlap) {
                    setOverlapPeriod(payload.overlap);
                    setPendingForce(true);
                    return;
                }
                throw new Error('Период пересекается с существующим.');
            }

            if (!response.ok) {
                throw new Error('Не удалось сохранить период.');
            }

            setStartDate('');
            setEndDate('');
            setOverlapPeriod(null);
            setPendingForce(false);
            await fetchPeriods();
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="relative flex flex-1 flex-col gap-8 overflow-x-hidden rounded-xl p-6 font-body text-[#1c1a17] dark:text-[#f7f3ee]">
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-aurora opacity-35 dark:hidden" />
                <div className="pointer-events-none absolute inset-0 hidden rounded-3xl bg-aurora-night opacity-45 dark:block" />

                <section className="relative z-10 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[#6a5d52] dark:text-white/60">
                            Финансовый контур
                        </p>
                        <h1 className="mt-3 font-display text-3xl">
                            Периоды учета
                        </h1>
                        <p className="mt-2 max-w-xl text-sm text-[#6a5d52] dark:text-white/70">
                            Добавьте новый период сверху и управляйте историей ниже.
                            При клике откроется отдельная страница периода.
                        </p>
                    </div>
                </section>

                <section
                    className="relative z-10 rounded-[28px] border border-black/10 bg-white/85 p-6 shadow-[0_22px_44px_-28px_rgba(28,26,23,0.6)] backdrop-blur animate-reveal dark:border-white/10 dark:bg-white/10"
                    style={delay(120)}
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
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
                        <label className="grid cursor-pointer grid-cols-[32px_minmax(0,1fr)] items-center gap-3 text-xs text-[#6a5d52] dark:text-white/70">
                            <span>С</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(event) =>
                                    setStartDate(event.target.value)
                                }
                                min={endDate ? addMonthsClamp(endDate, -3) : undefined}
                                max={endDate || undefined}
                                className="date-input ml-auto w-[80%] rounded-lg border border-black/10 bg-white/90 px-4 py-3 text-sm text-[#1c1a17] outline-none transition focus:border-black/30 dark:border-white/10 dark:bg-white/10 dark:text-white sm:ml-0 sm:w-full"
                            />
                        </label>
                        <label className="grid cursor-pointer grid-cols-[32px_minmax(0,1fr)] items-center gap-3 text-xs text-[#6a5d52] dark:text-white/70">
                            <span>По</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(event) =>
                                    setEndDate(event.target.value)
                                }
                                min={startDate || undefined}
                                max={startDate ? addMonthsClamp(startDate, 3) : undefined}
                                className="date-input ml-auto w-[80%] rounded-lg border border-black/10 bg-white/90 px-4 py-3 text-sm text-[#1c1a17] outline-none transition focus:border-black/30 dark:border-white/10 dark:bg-white/10 dark:text-white sm:ml-0 sm:w-full"
                            />
                        </label>
                        <div className="flex flex-col justify-end">
                            <button
                                className="rounded-2xl bg-[#d87a4a] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(216,122,74,0.8)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                                type="button"
                                onClick={() => handleCreatePeriod(false)}
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

                <section
                    className="relative z-10 grid gap-4 animate-reveal"
                    style={delay(240)}
                >
                    {periods.some((period) => period.is_pinned) && (
                        <div className="rounded-[28px] border border-black/10 bg-white/70 p-5 shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
                            <p className="text-xs uppercase tracking-[0.4em] text-[#6a5d52] dark:text-white/60">
                                Закреплённый период
                            </p>
                            <div className="mt-4">
                                {(() => {
                                    const pinned = periods.find(
                                        (period) => period.is_pinned,
                                    );
                                    if (!pinned) {
                                        return null;
                                    }
                                    const meta = buildPeriodMeta(pinned);
                                    return (
                                        <PeriodList
                                            items={[
                                                {
                                                    id: pinned.id,
                                                    title: meta.title,
                                                    subtitle: meta.subtitle,
                                                    isClosed: Boolean(
                                                        pinned.is_closed,
                                                    ),
                                                    actualRemaining:
                                                        pinned.actual_remaining ??
                                                        null,
                                                },
                                            ]}
                                        />
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-2xl">История периодов</h2>
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
                                Периодов пока нет. Создайте первый диапазон выше.
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
                                    };
                                })}
                            />
                        )}
                    </div>
                </section>

                {overlapPeriod && (
                    <OverlapPeriodModal
                        href={`/periods/${overlapPeriod.id}`}
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
                        onConfirm={() => handleCreatePeriod(true)}
                        confirmDisabled={!pendingForce || isSaving}
                    />
                )}
                {showUpdateInfo && (
                    <UpdateInfoModal onConfirm={handleInfoShown} />
                )}
            </div>
        </AppLayout>
    );
}
