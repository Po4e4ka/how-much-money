import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { PillButton } from '@/components/pill-button';
import { ConfirmPinModal } from '@/components/confirm-pin-modal';
import { ConfirmClosePeriodModal } from '@/components/confirm-close-period-modal';
import { OverlapPeriodModal } from '@/components/overlap-period-modal';
import { DailyExpensesCard } from '@/components/daily-expenses-card';
import { PeriodDaysCard } from '@/components/period-days-card';
import { ActualRemainingCard } from '@/components/period/actual-remaining-card';
import { ExpensesBlock } from '@/components/period/expenses-block';
import { IncomeBlock } from '@/components/period/income-block';
import { OffIncomeBlock } from '@/components/period/off-income-block';
import { PlannedAverageCard } from '@/components/period/planned-average-card';
import { RemainingDailyCard } from '@/components/period/remaining-daily-card';
import { delay } from '@/lib/animation';
import {
    addMonthsClamp,
    calculateDaysInclusive,
    formatDateShort,
    formatMonthRange,
} from '@/lib/date';
import { formatCurrency, toNumberOrZero } from '@/lib/number';
import {
    calculateAmountTotal,
    calculateDailyExpensesTotal,
    calculateExpenseTotals,
    calculateFilledDays,
    calculatePeriodMetrics,
    getInvalidIncomeIds,
} from '@/lib/period-calculations';
import type {
    ExpenseItem,
    IncomeItem,
    OffIncomeItem,
    PeriodData,
} from '@/types/period';

const emptyPeriod: PeriodData = {
    id: 0,
    startDate: '',
    endDate: '',
    incomes: [],
    expenses: [],
    offIncomeExpenses: [],
    dailyExpenses: {},
    isPinned: false,
    isClosed: false,
};

export default function Period() {
    const { periodId } = usePage<{ periodId: string }>().props;
    const [period, setPeriod] = useState<PeriodData>(emptyPeriod);
    const [incomes, setIncomes] = useState<IncomeItem[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
    const [offIncomeExpenses, setOffIncomeExpenses] = useState<
        OffIncomeItem[]
    >([]);
    const [dailyExpenses, setDailyExpenses] = useState<
        Record<string, number>
    >({});
    const [showDelete, setShowDelete] = useState(false);
    const [isEditingDates, setIsEditingDates] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [overlapPeriod, setOverlapPeriod] = useState<{
        id: number;
        start_date: string;
        end_date: string;
    } | null>(null);
    const [pendingForce, setPendingForce] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [invalidIncomeIds, setInvalidIncomeIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPinning, setIsPinning] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [pinnedTitle, setPinnedTitle] = useState<string | undefined>();
    const pendingSaveRef = useRef(false);
    const [saveTick, setSaveTick] = useState(0);
    const incomeNameError = 'Заполните названия прихода.';
    const lastSavedDatesRef = useRef<{ startDate: string; endDate: string } | null>(
        null,
    );
    const overlapDatesRef = useRef<{ startDate: string; endDate: string } | null>(
        null,
    );

    const cacheKey = useMemo(() => `period:${periodId}`, [periodId]);
    const hasFetchedRef = useRef(false);
    const fetchInFlightRef = useRef(false);

    const readCache = () => {
        if (typeof window === 'undefined') {
            return null;
        }
        const store = (window as typeof window & {
            __periodCache?: Record<string, PeriodData>;
        }).__periodCache;
        return store?.[cacheKey] ?? null;
    };

    const writeCache = (data: PeriodData) => {
        if (typeof window === 'undefined') {
            return;
        }
        const win = window as typeof window & {
            __periodCache?: Record<string, PeriodData>;
        };
        if (!win.__periodCache) {
            win.__periodCache = {};
        }
        win.__periodCache[cacheKey] = data;
    };

    const { totalPlanned: totalPlannedExpenses, totalActual: totalActualExpenses, totalDifference } =
        calculateExpenseTotals(expenses ?? []);
    const totalOffIncome = calculateAmountTotal(offIncomeExpenses ?? []);
    const totalIncome = calculateAmountTotal(incomes ?? []);
    const days = useMemo(() => {
        if (!startDate || !endDate) {
            return 0;
        }
        return calculateDaysInclusive(startDate, endDate);
    }, [startDate, endDate]);
    const totalDailyExpenses = useMemo(
        () => calculateDailyExpensesTotal(dailyExpenses),
        [dailyExpenses],
    );
    const filledDays = useMemo(
        () => calculateFilledDays(startDate, endDate, dailyExpenses),
        [dailyExpenses, startDate, endDate],
    );
    const dailyActualAverage =
        filledDays > 0 ? totalDailyExpenses / filledDays : 0;
    const periodTitle = useMemo(() => {
        if (!startDate || !endDate) {
            return 'Период';
        }
        return `${formatDateShort(startDate)} — ${formatDateShort(endDate)}`;
    }, [startDate, endDate]);
    const periodSubtitle = useMemo(() => {
        if (!startDate || !endDate) {
            return '';
        }
        return `${days} дней · ${formatMonthRange(startDate, endDate)}`;
    }, [days, startDate, endDate]);
    const {
        plannedPeriodSum,
        dailyAverage,
        actualRemaining,
        remainingDays,
        remainingDailyAverage,
        isDailyComplete,
    } = calculatePeriodMetrics({
        days,
        totalIncome,
        totalPlannedExpenses,
        totalDifference,
        totalDailyExpenses,
        filledDays,
    });
    const isReadOnly = period.isClosed;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: dashboard().url,
        },
        {
            title: periodTitle,
            href: `/periods/${periodId}`,
        },
    ];

    const hasFullCache = (cached: PeriodData | null) =>
        Boolean(
            cached &&
                cached.id &&
                Array.isArray(cached.incomes) &&
                Array.isArray(cached.expenses) &&
                Array.isArray(cached.offIncomeExpenses),
        );

    const fetchPeriod = async () => {
        if (fetchInFlightRef.current) {
            return;
        }

        const cached = readCache();
        if (hasFullCache(cached)) {
            setPeriod({
                ...cached,
                isClosed: Boolean(cached.isClosed),
            });
            setIncomes(cached.incomes ?? []);
            setStartDate(cached.startDate ?? '');
            setEndDate(cached.endDate ?? '');
            setExpenses(cached.expenses ?? []);
            setOffIncomeExpenses(cached.offIncomeExpenses ?? []);
            setDailyExpenses(cached.dailyExpenses ?? {});
            lastSavedDatesRef.current = {
                startDate: cached.startDate ?? '',
                endDate: cached.endDate ?? '',
            };
            setIsLoading(false);
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                return;
            }
        }

        if (hasFetchedRef.current && (!navigator.onLine || !cached)) {
            return;
        }

        fetchInFlightRef.current = true;
        setIsLoading(true);
        setLoadError(null);
        try {
            const response = await fetch(`/api/periods/${periodId}`);
            if (!response.ok) {
                throw new Error('Не удалось загрузить период.');
            }
            const payload = (await response.json()) as {
                data: {
                    id: number;
                    start_date: string;
                    end_date: string;
                    daily_expenses: Record<string, number>;
                    is_pinned?: boolean;
                    is_closed?: boolean;
                    incomes: { id: number; name: string; amount: number }[];
                    expenses: {
                        id: number;
                        name: string;
                        planned_amount: number;
                        actual_amount: number;
                    }[];
                    external_expenses: {
                        id: number;
                        name: string;
                        amount: number;
                    }[];
                };
            };
            const data = payload.data;
            const normalized: PeriodData = {
                id: data.id,
                startDate: data.start_date,
                endDate: data.end_date,
                dailyExpenses: data.daily_expenses ?? {},
                isPinned: Boolean(data.is_pinned),
                isClosed: Boolean(data.is_closed),
                incomes: data.incomes.map((item) => ({
                    id: String(item.id),
                    name: item.name,
                    amount: item.amount,
                })),
                expenses: data.expenses.map((item) => ({
                    id: String(item.id),
                    name: item.name,
                    plannedAmount: item.planned_amount,
                    actualAmount: item.actual_amount,
                    actualTouched: false,
                })),
                offIncomeExpenses: data.external_expenses.map((item) => ({
                    id: String(item.id),
                    name: item.name,
                    amount: item.amount,
                })),
            };

            setPeriod(normalized);
            setIncomes(normalized.incomes);
            setStartDate(normalized.startDate);
            setEndDate(normalized.endDate);
            setExpenses(normalized.expenses);
            setOffIncomeExpenses(normalized.offIncomeExpenses);
            setDailyExpenses(normalized.dailyExpenses);
            setShowPinModal(false);
            setPinnedTitle(undefined);
            lastSavedDatesRef.current = {
                startDate: normalized.startDate,
                endDate: normalized.endDate,
            };
            writeCache(normalized);
            hasFetchedRef.current = true;
        } catch (err) {
            setLoadError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось загрузить период.',
            );
        } finally {
            setIsLoading(false);
            fetchInFlightRef.current = false;
        }
    };

    const handleSave = async (
        force = false,
        overrides?: { startDate?: string; endDate?: string },
    ) => {
        if (period.isClosed) {
            return;
        }
        const nextStartDate = overrides?.startDate ?? startDate;
        const nextEndDate = overrides?.endDate ?? endDate;
        const nextInvalidIncomeIds = getInvalidIncomeIds(incomes);
        if (nextInvalidIncomeIds.length > 0) {
            setInvalidIncomeIds(nextInvalidIncomeIds);
            setSaveError(incomeNameError);
            return;
        }

        if (isSaving) {
            pendingSaveRef.current = true;
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        setSaveSuccess(false);
        try {
            const token =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute('content') ?? '';
            const response = await fetch(`/api/periods/${periodId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
                body: JSON.stringify({
                    start_date: nextStartDate,
                    end_date: nextEndDate,
                    daily_expenses: dailyExpenses,
                    force,
                    incomes: incomes
                        .filter((item) => item.name.trim() !== '')
                        .map((item) => ({
                            id: Number.isFinite(Number(item.id))
                                ? Number(item.id)
                                : undefined,
                            name: item.name,
                            amount: toNumberOrZero(item.amount),
                        })),
                    expenses: expenses
                        .filter((item) => item.name.trim() !== '')
                        .map((item) => ({
                            id: Number.isFinite(Number(item.id))
                                ? Number(item.id)
                                : undefined,
                            name: item.name,
                            planned_amount: toNumberOrZero(item.plannedAmount),
                            actual_amount: toNumberOrZero(item.actualAmount),
                        })),
                    external_expenses: offIncomeExpenses
                        .filter((item) => item.name.trim() !== '')
                        .map((item) => ({
                            id: Number.isFinite(Number(item.id))
                                ? Number(item.id)
                                : undefined,
                            name: item.name,
                            amount: toNumberOrZero(item.amount),
                        })),
                }),
            });

            if (response.status === 409) {
                const payload = (await response.json()) as {
                    overlap?: { id: number; start_date: string; end_date: string };
                };
                if (payload.overlap) {
                    overlapDatesRef.current = {
                        startDate: nextStartDate,
                        endDate: nextEndDate,
                    };
                    setOverlapPeriod(payload.overlap);
                    setPendingForce(true);
                    if (lastSavedDatesRef.current) {
                        setStartDate(lastSavedDatesRef.current.startDate);
                        setEndDate(lastSavedDatesRef.current.endDate);
                    }
                    return;
                }
                throw new Error('Период пересекается с существующим.');
            }

            if (!response.ok) {
                if (response.status === 423) {
                    const payload = (await response.json()) as {
                        message?: string;
                    };
                    throw new Error(
                        payload.message ?? 'Период закрыт и не редактируется.',
                    );
                }
                throw new Error('Не удалось сохранить период.');
            }

            setStartDate(nextStartDate);
            setEndDate(nextEndDate);
            setSaveSuccess(true);
            setOverlapPeriod(null);
            setPendingForce(false);
            overlapDatesRef.current = null;
            lastSavedDatesRef.current = {
                startDate: nextStartDate,
                endDate: nextEndDate,
            };
            writeCache({
                id: Number(periodId),
                startDate: nextStartDate,
                endDate: nextEndDate,
                incomes,
                expenses,
                offIncomeExpenses,
                dailyExpenses,
                isPinned: period.isPinned,
                isClosed: period.isClosed,
            });
        } catch (err) {
            setSaveError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось сохранить период.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddIncome = () => {
        if (period.isClosed) {
            return;
        }
        setIncomes((prev) => [
            ...prev,
            {
                id: `i${Date.now()}`,
                name: '',
                amount: '',
            },
        ]);
        void handleSave();
    };

    const requestSaveAfterChange = () => {
        setSaveTick((prev) => prev + 1);
    };

    const handleDelete = async () => {
        if (isDeleting) {
            return;
        }
        if (!window.confirm('Удалить период?')) {
            return;
        }
        setIsDeleting(true);
        setSaveError(null);
        try {
            const token =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute('content') ?? '';
            const response = await fetch(`/api/periods/${periodId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': token,
                },
            });
            if (!response.ok) {
                throw new Error('Не удалось удалить период.');
            }
            window.location.href = dashboard().url;
        } catch (err) {
            setSaveError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось удалить период.',
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = async () => {
        if (isClosing || period.isClosed) {
            return;
        }
        setIsClosing(true);
        setSaveError(null);
        try {
            const token =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute('content') ?? '';
            const response = await fetch(`/api/periods/${periodId}/close`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': token,
                },
            });

            if (!response.ok) {
                const payload = (await response.json()) as {
                    message?: string;
                };
                throw new Error(
                    payload.message ?? 'Не удалось закрыть период.',
                );
            }

            const payload = (await response.json()) as {
                data?: { is_closed?: boolean };
            };
            const updated = {
                ...period,
                isClosed: payload.data?.is_closed ?? true,
            };
            setPeriod(updated);
            setShowCloseModal(false);
            writeCache({
                id: Number(periodId),
                startDate,
                endDate,
                incomes,
                expenses,
                offIncomeExpenses,
                dailyExpenses,
                isPinned: period.isPinned,
                isClosed: updated.isClosed,
            });
        } catch (err) {
            setSaveError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось закрыть период.',
            );
        } finally {
            setIsClosing(false);
        }
    };

    const handleTogglePin = async (force = false) => {
        if (isPinning) {
            return;
        }
        setIsPinning(true);
        try {
            const token =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute('content') ?? '';
            const response = await fetch(`/api/periods/${periodId}/pin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
                body: JSON.stringify({
                    pinned: !period.isPinned,
                    force,
                }),
            });

            if (response.status === 409) {
                const payload = (await response.json()) as {
                    pinned?: { start_date: string; end_date: string };
                };
                if (payload.pinned) {
                    setPinnedTitle(
                        `${formatDateShort(payload.pinned.start_date)} — ${formatDateShort(
                            payload.pinned.end_date,
                        )}`,
                    );
                } else {
                    setPinnedTitle(undefined);
                }
                setShowPinModal(true);
                return;
            }

            if (!response.ok) {
                throw new Error('Не удалось изменить закрепление периода.');
            }

            const payload = (await response.json()) as {
                data?: { is_pinned: boolean };
            };
            const isPinned = payload.data?.is_pinned ?? !period.isPinned;
            const updated = { ...period, isPinned };
            setPeriod(updated);
            writeCache(updated);
            setShowPinModal(false);
        } catch (err) {
            setSaveError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось изменить закрепление периода.',
            );
        } finally {
            setIsPinning(false);
        }
    };

    useEffect(() => {
        hasFetchedRef.current = false;
        void fetchPeriod();
    }, [periodId]);

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

    useEffect(() => {
        const nextInvalidIncomeIds = getInvalidIncomeIds(incomes);
        setInvalidIncomeIds(nextInvalidIncomeIds);
        if (nextInvalidIncomeIds.length === 0 && saveError === incomeNameError) {
            setSaveError(null);
        }
    }, [incomes, saveError]);

    return (
        <AppLayout>
            <Head title={periodTitle} />
            <div
                className={`relative flex flex-1 flex-col gap-8 overflow-x-hidden rounded-xl p-3 font-body text-[#1c1a17] dark:text-[#f7f3ee]${
                    period.isClosed
                        ? ' bg-emerald-50/70 dark:bg-emerald-950/20'
                        : ''
                }`}
            >
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-aurora opacity-35 dark:hidden" />
                <div className="pointer-events-none absolute inset-0 hidden rounded-3xl bg-aurora-night opacity-45 dark:block" />

                <section className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[#6a5d52] dark:text-white/60">
                            Период
                        </p>
                        <h1 className="mt-3 font-display text-3xl">
                            {periodTitle}
                        </h1>
                        <p className="mt-2 text-sm text-[#6a5d52] dark:text-white/70">
                            {periodSubtitle}
                        </p>
                    </div>
                    {period.isClosed && (
                        <div className="flex-1 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                            Период закрыт
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        {!period.isClosed && (
                            <PillButton
                                type="button"
                                onClick={() => handleTogglePin(false)}
                                tone={period.isPinned ? 'danger' : 'success'}
                                disabled={isPinning}
                                className="px-4 py-2"
                            >
                                {period.isPinned ? 'Открепить' : 'Закрепить'}
                            </PillButton>
                        )}
                        {isDailyComplete && !period.isClosed && (
                            <PillButton
                                type="button"
                                onClick={() => setShowCloseModal(true)}
                                disabled={isClosing}
                                tone="success"
                                className="px-4 py-2"
                            >
                                Закрыть период
                            </PillButton>
                        )}
                        <PillButton
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            tone="danger"
                            className="px-4 py-2"
                        >
                            Удалить
                        </PillButton>
                        <Link
                            href={dashboard()}
                            prefetch
                            className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs text-[#1c1a17] shadow-[0_16px_32px_-24px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white"
                        >
                            ← Ко всем периодам
                        </Link>
                    </div>
                </section>

                <section
                    className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start animate-reveal"
                    style={delay(120)}
                >
                    {isLoading && (
                        <div className="col-span-full rounded-lg border border-black/10 bg-white/70 px-5 py-4 text-sm text-[#6a5d52] dark:border-white/10 dark:bg-white/10 dark:text-white/70">
                            Загружаем период...
                        </div>
                    )}
                    {loadError && (
                        <div className="col-span-full rounded-lg border border-black/10 bg-white/70 px-5 py-4 text-sm text-[#b0352b] dark:border-white/10 dark:bg-white/10 dark:text-[#ff8b7c]">
                            {loadError}
                        </div>
                    )}
                    <div className="order-2 grid gap-4 lg:order-none lg:self-start">
                        <IncomeBlock
                            items={incomes}
                            setItems={setIncomes}
                            totalAmount={totalIncome}
                            onAdd={handleAddIncome}
                            showDelete={showDelete}
                            onToggleDelete={() => setShowDelete((prev) => !prev)}
                            onBlurField={handleSave}
                            onAfterDelete={requestSaveAfterChange}
                            invalidNameIds={invalidIncomeIds}
                            readOnly={isReadOnly}
                        />

                        <ExpensesBlock
                            title="Обязательные траты"
                            items={expenses}
                            setItems={setExpenses}
                            showDelete={showDelete}
                            onToggleDelete={() => setShowDelete((prev) => !prev)}
                            totalLabel="Итого обязательных"
                            totalPlanned={totalPlannedExpenses}
                            totalActual={totalActualExpenses}
                            totalDifference={totalDifference}
                            idPrefix="e"
                            onBlurField={handleSave}
                            onAfterDelete={requestSaveAfterChange}
                            readOnly={isReadOnly}
                        />

                        <OffIncomeBlock
                            title="Сторонние траты"
                            items={offIncomeExpenses}
                            setItems={setOffIncomeExpenses}
                            showDelete={showDelete}
                            onToggleDelete={() => setShowDelete((prev) => !prev)}
                            totalLabel="Итого сторонних"
                            totalAmount={totalOffIncome}
                            idPrefix="o"
                            onBlurField={handleSave}
                            onAfterDelete={requestSaveAfterChange}
                            readOnly={isReadOnly}
                        />
                    </div>

                    <div className="order-1 grid gap-4 lg:order-none lg:self-start">
                        <PeriodDaysCard
                            days={days}
                            startDate={startDate}
                            endDate={endDate}
                            isEditing={isEditingDates}
                            readOnly={isReadOnly}
                            onToggleEditing={() =>
                                setIsEditingDates((prev) => !prev)
                            }
                            onStartDateChange={(nextValue) => {
                                setStartDate(nextValue);
                                void handleSave(false, {
                                    startDate: nextValue,
                                });
                            }}
                            onEndDateChange={(nextValue) => {
                                setEndDate(nextValue);
                                void handleSave(false, {
                                    endDate: nextValue,
                                });
                            }}
                            minStartDate={
                                endDate
                                    ? addMonthsClamp(endDate, -3)
                                    : undefined
                            }
                            maxStartDate={endDate}
                            minEndDate={startDate}
                            maxEndDate={
                                startDate ? addMonthsClamp(startDate, 3) : undefined
                            }
                        />
                        <DailyExpensesCard href={`/periods/${periodId}/daily`} />
                        <PlannedAverageCard
                            dailyAverage={dailyAverage}
                            days={days}
                            totalIncome={totalIncome}
                            totalPlannedExpenses={totalPlannedExpenses}
                            plannedPeriodSum={plannedPeriodSum}
                        />
                        <RemainingDailyCard
                            actualRemaining={actualRemaining}
                            remainingDays={remainingDays}
                            remainingDailyAverage={remainingDailyAverage}
                        />
                        <ActualRemainingCard
                            plannedPeriodSum={plannedPeriodSum}
                            totalDifference={totalDifference}
                            totalDailyExpenses={totalDailyExpenses}
                            dailyActualAverage={dailyActualAverage}
                        />
                    </div>
                </section>

                {showPinModal && (
                    <ConfirmPinModal
                        currentTitle={pinnedTitle}
                        onCancel={() => setShowPinModal(false)}
                        onConfirm={() => handleTogglePin(true)}
                        confirmDisabled={isPinning}
                    />
                )}

                {showCloseModal && (
                    <ConfirmClosePeriodModal
                        onCancel={() => setShowCloseModal(false)}
                        onConfirm={handleClose}
                        confirmDisabled={isClosing}
                    />
                )}

                {overlapPeriod && (
                    <OverlapPeriodModal
                        href={`/periods/${overlapPeriod.id}`}
                        title={`${formatDateShort(
                            overlapPeriod.start_date,
                        )} — ${formatDateShort(overlapPeriod.end_date)}`}
                        subtitle={`${calculateDaysInclusive(
                            overlapPeriod.start_date,
                            overlapPeriod.end_date,
                        )} дней · ${formatMonthRange(
                            overlapPeriod.start_date,
                            overlapPeriod.end_date,
                        )}`}
                        onClose={() => {
                            setOverlapPeriod(null);
                            setPendingForce(false);
                            overlapDatesRef.current = null;
                        }}
                        onConfirm={() =>
                            handleSave(true, overlapDatesRef.current ?? undefined)
                        }
                        confirmDisabled={!pendingForce || isSaving}
                    />
                )}

                {saveError && (
                    <div className="relative z-10 rounded-lg border border-black/10 bg-white/70 px-5 py-3 text-xs text-[#b0352b] dark:border-white/10 dark:bg-white/10 dark:text-[#ff8b7c]">
                        {saveError}
                    </div>
                )}

            </div>
        </AppLayout>
    );
}
