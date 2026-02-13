import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BigDigit } from '@/components/big-digit';
import { BlockTitle } from '@/components/block-title';
import { OffIncomeBlock } from '@/components/period/off-income-block';
import { PillButton } from '@/components/pill-button';
import { ExpenseSuggestionsProvider } from '@/contexts/expense-suggestions-context';
import AppLayout from '@/layouts/app-layout';
import { delay } from '@/lib/animation';
import {
    calculateDaysInclusive,
    formatDateShort,
    formatMonthRange,
} from '@/lib/date';
import { formatCurrency, toNumberOrZero, toIntegerValue } from '@/lib/number';
import { calculateAmountTotal } from '@/lib/period-calculations';
import type { OffIncomeItem, PeriodData } from '@/types/period';

type ViewerPageProps = {
    viewerId?: number;
    viewerName?: string;
    viewerEmail?: string;
    viewerMode?: boolean;
};

type PeriodUnforeseenData = {
    id: number;
    startDate: string;
    endDate: string;
    unforeseenAllocated: number;
    unforeseenExpenses: OffIncomeItem[];
    isClosed: boolean;
};

const emptyPeriod: PeriodUnforeseenData = {
    id: 0,
    startDate: '',
    endDate: '',
    unforeseenAllocated: 0,
    unforeseenExpenses: [],
    isClosed: false,
};

export default function PeriodUnforeseen() {
    const { periodId, viewerId, viewerName, viewerEmail, viewerMode } = usePage<
        { periodId: string } & ViewerPageProps
    >().props;
    const isViewerMode = Boolean(viewerId ?? viewerMode);
    const [period, setPeriod] = useState<PeriodUnforeseenData>(emptyPeriod);
    const [unforeseenAllocated, setUnforeseenAllocated] = useState(0);
    const [unforeseenExpenses, setUnforeseenExpenses] = useState<OffIncomeItem[]>(
        [],
    );
    const [showDelete, setShowDelete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveTick, setSaveTick] = useState(0);
    const [showConfirmAllocate, setShowConfirmAllocate] = useState(false);
    const pendingSaveRef = useRef(false);

    const cacheKey = useMemo(
        () => `period:${viewerId ?? 'self'}:${periodId}`,
        [periodId, viewerId],
    );
    const viewerQuery = useMemo(
        () => (viewerId ? `viewer_id=${viewerId}` : ''),
        [viewerId],
    );
    const hasFetchedRef = useRef(false);

    const readCache = () => {
        if (typeof window === 'undefined') {
            return null;
        }
        const store = (window as typeof window & {
            __periodCache?: Record<string, PeriodData>;
        }).__periodCache;
        return store?.[cacheKey] ?? null;
    };

    const writeCache = (data: {
        id: number;
        startDate: string;
        endDate: string;
        unforeseenAllocated: number;
        unforeseenExpenses: OffIncomeItem[];
        isClosed: boolean;
    }) => {
        if (typeof window === 'undefined') {
            return;
        }
        const win = window as typeof window & {
            __periodCache?: Record<string, PeriodData>;
        };
        if (!win.__periodCache) {
            win.__periodCache = {};
        }

        const mappedUnforeseen = data.unforeseenExpenses.map((item) => ({
            id: item.id,
            name: item.name,
            plannedAmount: 0,
            actualAmount: item.amount,
            actualTouched: true,
        }));

        win.__periodCache[cacheKey] = {
            ...(win.__periodCache[cacheKey] ?? {}),
            id: data.id,
            startDate: data.startDate,
            endDate: data.endDate,
            unforeseenAllocated: data.unforeseenAllocated,
            unforeseenExpenses: mappedUnforeseen,
            isClosed: data.isClosed,
        } as PeriodData;
    };

    const totalSpent = calculateAmountTotal(unforeseenExpenses ?? []);
    const days = useMemo(
        () => calculateDaysInclusive(period.startDate, period.endDate),
        [period.startDate, period.endDate],
    );
    const periodTitle = useMemo(() => {
        if (!period.startDate || !period.endDate) {
            return 'Период';
        }
        return `${formatDateShort(period.startDate)} — ${formatDateShort(period.endDate)}`;
    }, [period.startDate, period.endDate]);
    const periodSubtitle = useMemo(() => {
        if (!period.startDate || !period.endDate) {
            return '';
        }
        return `${days} дней · ${formatMonthRange(
            period.startDate,
            period.endDate,
        )}`;
    }, [days, period.startDate, period.endDate]);
    const isReadOnly = period.isClosed || isViewerMode;

    const persist = async (
        nextAllocated = unforeseenAllocated,
        nextExpenses = unforeseenExpenses,
    ) => {
        const token =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') ?? '';
        const response = await fetch(
            `/api/periods/${periodId}${viewerQuery ? `?${viewerQuery}` : ''}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
                body: JSON.stringify({
                    unforeseen_allocated: nextAllocated,
                    unforeseen_expenses: nextExpenses
                        .filter((item) => item.name.trim() !== '')
                        .map((item) => ({
                            id: Number.isFinite(Number(item.id))
                                ? Number(item.id)
                                : undefined,
                            name: item.name,
                            planned_amount: 0,
                            actual_amount: toNumberOrZero(item.amount),
                        })),
                }),
            },
        );

        if (!response.ok) {
            if (response.status === 423) {
                const payload = (await response.json()) as {
                    message?: string;
                };
                throw new Error(
                    payload.message ?? 'Период закрыт и не редактируется.',
                );
            }
            throw new Error('Не удалось сохранить непредвиденные траты.');
        }

        writeCache({
            id: period.id,
            startDate: period.startDate,
            endDate: period.endDate,
            unforeseenAllocated: nextAllocated,
            unforeseenExpenses: nextExpenses,
            isClosed: period.isClosed,
        });
    };

    const fetchPeriod = async () => {
        if (hasFetchedRef.current) {
            return;
        }

        const cached = readCache();
        if (
            cached &&
            cached.id &&
            Array.isArray(cached.unforeseenExpenses) &&
            typeof cached.unforeseenAllocated === 'number'
        ) {
            hasFetchedRef.current = true;
            const mappedCached = cached.unforeseenExpenses.map((item) => ({
                id: item.id,
                name: item.name,
                amount: toNumberOrZero(item.actualAmount),
            }));
            setPeriod({
                id: cached.id,
                startDate: cached.startDate ?? '',
                endDate: cached.endDate ?? '',
                unforeseenAllocated: cached.unforeseenAllocated ?? 0,
                unforeseenExpenses: mappedCached,
                isClosed: Boolean(cached.isClosed),
            });
            setUnforeseenAllocated(cached.unforeseenAllocated ?? 0);
            setUnforeseenExpenses(mappedCached);
            setIsLoading(false);
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                return;
            }
        }

        hasFetchedRef.current = true;
        setIsLoading(true);
        setLoadError(null);
        try {
            const response = await fetch(
                `/api/periods/${periodId}${viewerQuery ? `?${viewerQuery}` : ''}`,
            );
            if (!response.ok) {
                throw new Error('Не удалось загрузить период.');
            }
            const payload = (await response.json()) as {
                data: {
                    id: number;
                    start_date: string;
                    end_date: string;
                    unforeseen_allocated: number;
                    is_closed?: boolean;
                    unforeseen_expenses: {
                        id: number;
                        name: string;
                        actual_amount: number;
                    }[];
                };
            };
            const data = payload.data;
            const nextExpenses = data.unforeseen_expenses.map((item) => ({
                id: String(item.id),
                name: item.name,
                amount: item.actual_amount,
            }));
            const nextPeriod: PeriodUnforeseenData = {
                id: data.id,
                startDate: data.start_date,
                endDate: data.end_date,
                unforeseenAllocated: Number(data.unforeseen_allocated ?? 0),
                unforeseenExpenses: nextExpenses,
                isClosed: Boolean(data.is_closed),
            };
            setPeriod(nextPeriod);
            setUnforeseenAllocated(nextPeriod.unforeseenAllocated);
            setUnforeseenExpenses(nextPeriod.unforeseenExpenses);
            writeCache(nextPeriod);
        } catch (err) {
            setLoadError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось загрузить период.',
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (isReadOnly) {
            return;
        }
        if (isSaving) {
            pendingSaveRef.current = true;
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        try {
            await persist();
        } catch (err) {
            setSaveError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось сохранить непредвиденные траты.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    const runAllocatePrompt = async () => {
        if (isReadOnly) {
            return;
        }

        const raw = window.prompt(
            'Введите сумму, которую хотите выделить на непредвиденные расходы:',
            String(unforeseenAllocated),
        );

        if (raw === null) {
            return;
        }

        const parsed = toIntegerValue(raw);
        const nextAllocated = parsed === '' ? 0 : parsed;

        setUnforeseenAllocated(nextAllocated);

        if (isSaving) {
            pendingSaveRef.current = true;
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        try {
            await persist(nextAllocated, unforeseenExpenses);
        } catch (err) {
            setSaveError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось сохранить выделенную сумму.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleAllocateClick = () => {
        if (isReadOnly) {
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const periodStart = period.startDate
            ? new Date(`${period.startDate}T00:00:00`)
            : null;
        const shouldConfirmChange =
            unforeseenAllocated > 0 &&
            periodStart instanceof Date &&
            Number.isFinite(periodStart.getTime()) &&
            today > periodStart;

        if (shouldConfirmChange) {
            setShowConfirmAllocate(true);
            return;
        }

        void runAllocatePrompt();
    };

    const handleConfirmAllocate = async () => {
        setShowConfirmAllocate(false);
        await runAllocatePrompt();
    };

    const requestSaveAfterChange = () => {
        setSaveTick((prev) => prev + 1);
    };

    useEffect(() => {
        hasFetchedRef.current = false;
        void fetchPeriod();
    }, [periodId, viewerId]);

    useEffect(() => {
        if (!isSaving && pendingSaveRef.current) {
            pendingSaveRef.current = false;
            void handleSave();
        }
    }, [isSaving]);

    useEffect(() => {
        if (saveTick > 0) {
            void handleSave();
        }
    }, [saveTick]);

    return (
        <AppLayout>
            <Head title={`Непредвиденные расходы · ${periodTitle}`} />
            <div className="relative flex flex-1 flex-col gap-6 overflow-x-hidden rounded-xl p-3 font-body text-[#1c1a17] dark:text-[#f7f3ee] sm:gap-8 sm:p-6">
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-aurora opacity-35 dark:hidden" />
                <div className="pointer-events-none absolute inset-0 hidden rounded-3xl bg-aurora-night opacity-45 dark:block" />

                <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 sm:gap-6">
                    <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.4em] text-[#6a5d52] dark:text-white/60">
                            Непредвиденные расходы
                        </p>
                        <h1 className="mt-3 font-display text-2xl sm:text-3xl">
                            {periodTitle}
                        </h1>
                        <p className="mt-2 text-sm text-[#6a5d52] dark:text-white/70">
                            {periodSubtitle}
                        </p>
                    </div>
                    <Link
                        href={
                            viewerId
                                ? `/shared/${viewerId}/periods/${periodId}`
                                : `/periods/${periodId}`
                        }
                        prefetch
                        className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs text-[#1c1a17] shadow-[0_16px_32px_-24px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white"
                    >
                        ← К периоду
                    </Link>
                </section>

                {isViewerMode && (
                    <div className="relative z-10 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-[#1c1a17] shadow-[0_18px_36px_-26px_rgba(28,26,23,0.5)] dark:border-white/10 dark:bg-white/10 dark:text-white/80">
                        Просмотр периодов пользователя{' '}
                        <span className="font-semibold">
                            {viewerName || viewerEmail || `#${viewerId}`}
                        </span>
                        . Режим только чтение.
                    </div>
                )}

                <section
                    className="relative z-10 grid gap-4 animate-reveal"
                    style={delay(120)}
                >
                    {isLoading && (
                        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-black/10 bg-white/70 px-5 py-4 text-sm text-[#6a5d52] dark:border-white/10 dark:bg-white/10 dark:text-white/70">
                            Загружаем период...
                        </div>
                    )}
                    {loadError && (
                        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-black/10 bg-white/70 px-5 py-4 text-sm text-[#b0352b] dark:border-white/10 dark:bg-white/10 dark:text-[#ff8b7c]">
                            {loadError}
                        </div>
                    )}
                    {!isLoading && !loadError && (
                        <div className="mx-auto grid w-full max-w-3xl min-w-0 gap-4">
                            <div className="rounded-lg border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <BlockTitle>План на непредвиденные</BlockTitle>
                                    <PillButton
                                        type="button"
                                        onClick={handleAllocateClick}
                                        disabled={isReadOnly}
                                    >
                                        Изменить
                                    </PillButton>
                                </div>
                                <BigDigit
                                    className={`mt-3 ${
                                        unforeseenAllocated > 0
                                            ? 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                                            : 'text-[#6a5d52] dark:text-white/60'
                                    }`}
                                >
                                    {unforeseenAllocated > 0
                                        ? formatCurrency(unforeseenAllocated)
                                        : '0'}
                                </BigDigit>
                            </div>

                            <ExpenseSuggestionsProvider
                                periodId={periodId}
                                type="unforeseen"
                                viewerId={viewerId}
                            >
                                <OffIncomeBlock
                                    title="Непредвиденные расходы"
                                    items={unforeseenExpenses}
                                    setItems={setUnforeseenExpenses}
                                    showDelete={showDelete}
                                    onToggleDelete={() =>
                                        setShowDelete((prev) => !prev)
                                    }
                                    totalLabel="Итого потрачено"
                                    totalAmount={totalSpent}
                                    idPrefix="u"
                                    onBlurField={handleSave}
                                    onAfterDelete={requestSaveAfterChange}
                                    readOnly={isReadOnly}
                                />
                            </ExpenseSuggestionsProvider>
                        </div>
                    )}
                </section>

                {saveError && (
                    <div className="relative z-10 mx-auto w-full max-w-3xl rounded-2xl border border-black/10 bg-white/70 px-5 py-3 text-xs text-[#b0352b] dark:border-white/10 dark:bg-white/10 dark:text-[#ff8b7c]">
                        {saveError}
                    </div>
                )}

                {showConfirmAllocate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
                        <div className="w-full max-w-xl rounded-lg border border-black/10 bg-white/95 p-6 text-[#1c1a17] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)] dark:border-white/10 dark:bg-[#1c1a17] dark:text-white">
                            <h3 className="font-display text-2xl">
                                Подтвердить изменение?
                            </h3>
                            <p className="mt-3 text-sm text-[#6a5d52] dark:text-white/70">
                                Эта цифра уже запланирована на текущий период.
                                Вы уверены, что хотите поменять? Данное действие
                                повлияет на все цифры.
                            </p>
                            <div className="mt-6 flex flex-wrap justify-end gap-3">
                                <PillButton
                                    type="button"
                                    onClick={() => {
                                        setShowConfirmAllocate(false);
                                    }}
                                    className="px-4 py-2"
                                >
                                    Отмена
                                </PillButton>
                                <PillButton
                                    type="button"
                                    onClick={handleConfirmAllocate}
                                    tone="success"
                                    className="px-4 py-2"
                                    disabled={isSaving}
                                >
                                    Подтвердить
                                </PillButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
