import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmClosePeriodModal } from '@/components/confirm-close-period-modal';
import { ConfirmPinModal } from '@/components/confirm-pin-modal';
import { DailyExpensesCard } from '@/components/daily-expenses-card';
import { OnboardingDemoBanner } from '@/components/onboarding-demo-banner';
import { OnboardingTour, type TourStep } from '@/components/onboarding-tour';
import { OverlapPeriodModal } from '@/components/overlap-period-modal';
import { ActualRemainingCard } from '@/components/period/actual-remaining-card';
import { ExpensesBlock } from '@/components/period/expenses-block';
import { IncomeBlock } from '@/components/period/income-block';
import { OffIncomeBlock } from '@/components/period/off-income-block';
import { PlannedAverageCard } from '@/components/period/planned-average-card';
import { RemainingDailyCard } from '@/components/period/remaining-daily-card';
import { PeriodDaysCard } from '@/components/period-days-card';
import { PillButton } from '@/components/pill-button';
import { SessionExpiredModal } from '@/components/session-expired-modal';
import { UnforeseenExpensesCard } from '@/components/unforeseen-expenses-card';
import { ExpenseSuggestionsProvider } from '@/contexts/expense-suggestions-context';
import AppLayout from '@/layouts/app-layout';
import { delay } from '@/lib/animation';
import { apiFetch, isApiError } from '@/lib/api';
import {
    addMonthsClamp,
    calculateDaysInclusive,
    formatDateShort,
    formatMonthRange,
} from '@/lib/date';
import { toNumberOrZero } from '@/lib/number';
import { onboardingApiFetch } from '@/lib/onboarding-api';
import {
    isPeriodGuideCompleted,
    markPeriodGuideCompleted,
} from '@/lib/onboarding-session';
import {
    calculateAmountTotal,
    calculateDailyExpensesTotal,
    calculateExpenseTotals,
    calculateFilledDays,
    calculatePeriodMetrics,
    getInvalidIncomeIds,
} from '@/lib/period-calculations';
import { dashboard } from '@/routes';
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
    unforeseenExpenses: [],
    unforeseenAllocated: 0,
    offIncomeExpenses: [],
    dailyExpenses: {},
    isPinned: false,
    isClosed: false,
};

type ViewerPageProps = {
    viewerId?: number;
    viewerName?: string;
    viewerEmail?: string;
    viewerMode?: boolean;
    onboardingMode?: boolean;
};

export default function Period() {
    const {
        periodId,
        viewerId,
        viewerName,
        viewerEmail,
        viewerMode,
        onboardingMode,
    } = usePage<{ periodId: string } & ViewerPageProps>().props;
    const isViewerMode = Boolean(viewerId ?? viewerMode);
    const isOnboardingMode = Boolean(onboardingMode);
    const requestFetch = isOnboardingMode ? onboardingApiFetch : apiFetch;
    const [period, setPeriod] = useState<PeriodData>(emptyPeriod);
    const [incomes, setIncomes] = useState<IncomeItem[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
    const [unforeseenExpenses, setUnforeseenExpenses] = useState<ExpenseItem[]>(
        [],
    );
    const [unforeseenAllocated, setUnforeseenAllocated] = useState(0);
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
    const [invalidIncomeIds, setInvalidIncomeIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPinning, setIsPinning] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showSessionExpired, setShowSessionExpired] = useState(false);
    const [pinnedTitle, setPinnedTitle] = useState<string | undefined>();
    const [isPeriodGuideOpen, setIsPeriodGuideOpen] = useState(
        () => isOnboardingMode && !isPeriodGuideCompleted(),
    );
    const [guidedIncomeId, setGuidedIncomeId] = useState<string | null>(null);
    const pendingSaveRef = useRef(false);
    const [saveTick, setSaveTick] = useState(0);
    const incomeNameError = 'Заполните названия прихода.';
    const lastSavedDatesRef = useRef<{ startDate: string; endDate: string } | null>(
        null,
    );
    const overlapDatesRef = useRef<{ startDate: string; endDate: string } | null>(
        null,
    );
    const periodHeaderRef = useRef<HTMLElement>(null);
    const incomeBlockRef = useRef<HTMLDivElement>(null);
    const incomeAddRowRef = useRef<HTMLDivElement>(null);
    const guidedIncomeRowRef = useRef<HTMLDivElement>(null);
    const mandatoryBlockRef = useRef<HTMLDivElement>(null);
    const externalBlockRef = useRef<HTMLDivElement>(null);

    const cacheKey = useMemo(
        () => `period:${viewerId ?? 'self'}:${periodId}`,
        [periodId, viewerId],
    );
    const viewerQuery = useMemo(
        () => (viewerId ? `viewer_id=${viewerId}` : ''),
        [viewerId],
    );
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
    const { totalActual: totalUnforeseenSpent } = calculateExpenseTotals(
        unforeseenExpenses ?? [],
    );
    const unforeseenRemaining = Math.max(
        0,
        unforeseenAllocated - totalUnforeseenSpent,
    );
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
        unforeseenOverrun,
        remainingDays,
        remainingDailyAverage,
        isDailyComplete,
    } = calculatePeriodMetrics({
        days,
        totalIncome,
        totalPlannedExpenses,
        totalDifference,
        totalUnforeseenAllocated: unforeseenAllocated,
        totalUnforeseenSpent,
        totalDailyExpenses,
        filledDays,
    });
    const isReadOnly = period.isClosed || isViewerMode;
    const periodGuideSteps = useMemo<TourStep[]>(
        () => [
            {
                stepId: 'period-intro',
                title: 'Страница периода',
                text: 'На данной странице нужно указать информацию о доходах и планах трат. Пройдёмся по блокам.',
                targetRef: periodHeaderRef,
                placement: 'bottom',
            },
            {
                stepId: 'income-block',
                title: 'Приход',
                text: 'Здесь указываются все приходящие суммы, из которых будут вычитаться затраты.',
                targetRef: incomeBlockRef,
                placement: 'right',
            },
            {
                stepId: 'income-add',
                title: 'Добавьте новый приход',
                text: 'Нажмите «+ Строка», чтобы добавить строку прихода.',
                targetRef: incomeAddRowRef,
                placement: 'bottom',
                captureClick: true,
                advanceDelayMs: 220,
                hideNext: true,
            },
            {
                stepId: 'income-fill',
                title: 'Заполните строку прихода',
                text: 'Заполните строку и нажмите «Далее».',
                targetRef: guidedIncomeRowRef,
                placement: 'right',
            },
            {
                stepId: 'income-sum',
                title: 'Сумма прихода',
                text: 'Добавьте ещё строки с приходом, если хотите. Они будут суммироваться автоматически.',
                targetRef: incomeBlockRef,
                placement: 'right',
            },
            {
                stepId: 'mandatory-block',
                title: 'Обязательные траты',
                text: 'Здесь указываются траты, которые планируются на месяц. Фактическая сумма по умолчанию равна планируемой, но её можно изменить. Добавьте: маникюр, спорт зал, комуналка, бензин.',
                targetRef: mandatoryBlockRef,
                placement: 'right',
            },
            {
                stepId: 'external-block',
                title: 'Сторонние траты',
                text: 'Здесь указываются траты, которые не включены в расчёт, но важно учитывать, что они были. Они не вычитаются из прихода.',
                targetRef: externalBlockRef,
                placement: 'right',
            },
        ],
        [],
    );

    const hasFullCache = (cached: PeriodData | null): cached is PeriodData =>
        Boolean(
            cached &&
                cached.id &&
                Array.isArray(cached.incomes) &&
                Array.isArray(cached.expenses) &&
                Array.isArray(cached.unforeseenExpenses) &&
                typeof cached.unforeseenAllocated === 'number' &&
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
            setUnforeseenExpenses(cached.unforeseenExpenses ?? []);
            setUnforeseenAllocated(cached.unforeseenAllocated ?? 0);
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
            const payload = await requestFetch<{
                data: {
                    id: number;
                    start_date: string;
                    end_date: string;
                    daily_expenses: Record<string, number>;
                    unforeseen_allocated: number;
                    is_pinned?: boolean;
                    is_closed?: boolean;
                    incomes: { id: number; name: string; amount: number }[];
                    expenses: {
                        id: number;
                        name: string;
                        planned_amount: number;
                        actual_amount: number;
                    }[];
                    unforeseen_expenses: {
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
            }>(
                `/api/periods/${periodId}${viewerQuery ? `?${viewerQuery}` : ''}`,
            );
            const data = payload.data;
            const normalized: PeriodData = {
                id: data.id,
                startDate: data.start_date,
                endDate: data.end_date,
                dailyExpenses: data.daily_expenses ?? {},
                unforeseenAllocated: Number(data.unforeseen_allocated ?? 0),
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
                unforeseenExpenses: data.unforeseen_expenses.map((item) => ({
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
            setUnforeseenExpenses(normalized.unforeseenExpenses);
            setUnforeseenAllocated(normalized.unforeseenAllocated);
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
        if (isReadOnly) {
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
        try {
            await requestFetch(
                `/api/periods/${periodId}${viewerQuery ? `?${viewerQuery}` : ''}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                    start_date: nextStartDate,
                    end_date: nextEndDate,
                    daily_expenses: dailyExpenses,
                    unforeseen_allocated: unforeseenAllocated,
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
                    unforeseen_expenses: unforeseenExpenses
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
                },
            );

            setStartDate(nextStartDate);
            setEndDate(nextEndDate);
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
                unforeseenExpenses,
                unforeseenAllocated,
                offIncomeExpenses,
                dailyExpenses,
                isPinned: period.isPinned,
                isClosed: period.isClosed,
            });
        } catch (err) {
            if (isApiError(err) && err.status === 419) {
                setShowSessionExpired(true);
                return;
            }
            if (isApiError(err) && err.status === 409 && err.data && typeof err.data === 'object') {
                const overlap = (err.data as { overlap?: { id: number; start_date: string; end_date: string } }).overlap;
                if (overlap) {
                    overlapDatesRef.current = {
                        startDate: nextStartDate,
                        endDate: nextEndDate,
                    };
                    setOverlapPeriod(overlap);
                    setPendingForce(true);
                    if (lastSavedDatesRef.current) {
                        setStartDate(lastSavedDatesRef.current.startDate);
                        setEndDate(lastSavedDatesRef.current.endDate);
                    }
                    return;
                }
            }
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
        if (isReadOnly) {
            return;
        }
        const nextId = `i${Date.now()}`;
        setIncomes((prev) => [
            ...prev,
            {
                id: nextId,
                name: '',
                amount: '',
            },
        ]);
        setGuidedIncomeId(nextId);
        void handleSave();
    };

    const requestSaveAfterChange = () => {
        setSaveTick((prev) => prev + 1);
    };

    const handleDelete = async () => {
        if (isViewerMode) {
            return;
        }
        if (isDeleting) {
            return;
        }
        if (!window.confirm('Удалить период?')) {
            return;
        }
        setIsDeleting(true);
        setSaveError(null);
        try {
            await requestFetch(
                `/api/periods/${periodId}${viewerQuery ? `?${viewerQuery}` : ''}`,
                {
                    method: 'DELETE',
                },
            );
            window.location.href = viewerId
                ? `/shared/${viewerId}`
                : dashboard().url;
        } catch (err) {
            if (isApiError(err) && err.status === 419) {
                setShowSessionExpired(true);
                return;
            }
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
        if (isViewerMode || isClosing || period.isClosed) {
            return;
        }
        setIsClosing(true);
        setSaveError(null);
        try {
            const payload = await requestFetch<{
                data?: { is_closed?: boolean };
            }>(
                `/api/periods/${periodId}/close${viewerQuery ? `?${viewerQuery}` : ''}`,
                {
                    method: 'POST',
                },
            );
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
                unforeseenExpenses,
                unforeseenAllocated,
                offIncomeExpenses,
                dailyExpenses,
                isPinned: period.isPinned,
                isClosed: updated.isClosed,
            });
        } catch (err) {
            if (isApiError(err) && err.status === 419) {
                setShowSessionExpired(true);
                return;
            }
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
        if (isViewerMode || isPinning) {
            return;
        }
        setIsPinning(true);
        try {
            const payload = await requestFetch<{
                data?: { is_pinned: boolean };
            }>(
                `/api/periods/${periodId}/pin${viewerQuery ? `?${viewerQuery}` : ''}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        pinned: !period.isPinned,
                        force,
                    }),
                },
            );
            const isPinned = payload.data?.is_pinned ?? !period.isPinned;
            const updated = { ...period, isPinned };
            setPeriod(updated);
            writeCache(updated);
            setShowPinModal(false);
        } catch (err) {
            if (isApiError(err)) {
                if (err.status === 419) {
                    setShowSessionExpired(true);
                    return;
                }
                if (err.status === 409 && err.data && typeof err.data === 'object') {
                    const pinned = (err.data as { pinned?: { start_date: string; end_date: string } }).pinned;
                    if (pinned) {
                        setPinnedTitle(
                            `${formatDateShort(pinned.start_date)} — ${formatDateShort(
                                pinned.end_date,
                            )}`,
                        );
                    } else {
                        setPinnedTitle(undefined);
                    }
                    setShowPinModal(true);
                    return;
                }
            }
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

    useEffect(() => {
        const nextInvalidIncomeIds = getInvalidIncomeIds(incomes);
        setInvalidIncomeIds(nextInvalidIncomeIds);
        if (nextInvalidIncomeIds.length === 0 && saveError === incomeNameError) {
            setSaveError(null);
        }
    }, [incomes, saveError]);

    useEffect(() => {
        if (!guidedIncomeId || !isPeriodGuideOpen) {
            return;
        }

        const timer = window.setTimeout(() => {
            const input = guidedIncomeRowRef.current?.querySelector('input');
            if (input instanceof HTMLInputElement) {
                input.focus();
                return;
            }
        }, 140);

        return () => window.clearTimeout(timer);
    }, [guidedIncomeId, isPeriodGuideOpen]);

    return (
        <AppLayout hideHeader={isOnboardingMode}>
            <Head title={periodTitle} />
            {isOnboardingMode && <OnboardingDemoBanner />}
            <div
                className={`relative flex flex-1 flex-col gap-8 overflow-x-hidden rounded-xl p-3 font-body text-[#1c1a17] dark:text-[#f7f3ee]${
                    period.isClosed
                        ? ' bg-emerald-50/70 dark:bg-emerald-950/20'
                        : ''
                }${isOnboardingMode ? ' pt-16' : ''}`}
            >
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-aurora opacity-35 dark:hidden" />
                <div className="pointer-events-none absolute inset-0 hidden rounded-3xl bg-aurora-night opacity-45 dark:block" />

                <section
                    ref={periodHeaderRef}
                    className="relative z-10 flex flex-wrap items-center justify-between gap-6"
                >
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
                        {!isViewerMode && !period.isClosed && (
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
                        {!isViewerMode && isDailyComplete && !period.isClosed && (
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
                        {!isViewerMode && (
                            <PillButton
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                tone="danger"
                                className="px-4 py-2"
                            >
                                Удалить
                            </PillButton>
                        )}
                        <Link
                            href={
                                viewerId
                                    ? `/shared/${viewerId}`
                                    : isOnboardingMode
                                      ? '/onboarding'
                                      : dashboard()
                            }
                            prefetch
                            className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs text-[#1c1a17] shadow-[0_16px_32px_-24px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white"
                        >
                            ← Ко всем периодам
                        </Link>
                    </div>
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
                        <ExpenseSuggestionsProvider
                            periodId={periodId}
                            type="income"
                            viewerId={viewerId}
                            disabled={isOnboardingMode}
                        >
                            <IncomeBlock
                                items={incomes}
                                setItems={setIncomes}
                                totalAmount={totalIncome}
                                onAdd={handleAddIncome}
                                showDelete={showDelete}
                                onToggleDelete={() =>
                                    setShowDelete((prev) => !prev)
                                }
                                onBlurField={handleSave}
                                onAfterDelete={requestSaveAfterChange}
                                invalidNameIds={invalidIncomeIds}
                                readOnly={isReadOnly}
                                containerRef={incomeBlockRef}
                                addRowTargetRef={incomeAddRowRef}
                                guidedIncomeId={guidedIncomeId}
                                guidedRowTargetRef={guidedIncomeRowRef}
                            />
                        </ExpenseSuggestionsProvider>

                        <ExpenseSuggestionsProvider
                            periodId={periodId}
                            type="mandatory"
                            viewerId={viewerId}
                            disabled={isOnboardingMode}
                        >
                            <ExpensesBlock
                                title="Обязательные траты"
                                items={expenses}
                                setItems={setExpenses}
                                showDelete={showDelete}
                                onToggleDelete={() =>
                                    setShowDelete((prev) => !prev)
                                }
                                totalLabel="Итого обязательных"
                                totalPlanned={totalPlannedExpenses}
                                totalActual={totalActualExpenses}
                                totalDifference={totalDifference}
                                idPrefix="e"
                                onBlurField={handleSave}
                                onAfterDelete={requestSaveAfterChange}
                                readOnly={isReadOnly}
                                containerRef={mandatoryBlockRef}
                            />
                        </ExpenseSuggestionsProvider>
                        <UnforeseenExpensesCard
                            href={
                                viewerId
                                    ? `/shared/${viewerId}/periods/${periodId}/unforeseen`
                                    : isOnboardingMode
                                      ? `/onboarding/periods/${periodId}/unforeseen`
                                      : `/periods/${periodId}/unforeseen`
                            }
                            allocated={unforeseenAllocated}
                            spent={totalUnforeseenSpent}
                        />

                        <ExpenseSuggestionsProvider
                            periodId={periodId}
                            type="external"
                            viewerId={viewerId}
                            disabled={isOnboardingMode}
                        >
                            <OffIncomeBlock
                                title="Сторонние траты"
                                items={offIncomeExpenses}
                                setItems={setOffIncomeExpenses}
                                showDelete={showDelete}
                                onToggleDelete={() =>
                                    setShowDelete((prev) => !prev)
                                }
                                totalLabel="Итого сторонних"
                                totalAmount={totalOffIncome}
                                idPrefix="o"
                                onBlurField={handleSave}
                                onAfterDelete={requestSaveAfterChange}
                                readOnly={isReadOnly}
                                containerRef={externalBlockRef}
                            />
                        </ExpenseSuggestionsProvider>
                    </div>

                    <div className="order-1 grid gap-4 lg:order-none lg:self-start">
                        <PeriodDaysCard
                            days={days}
                            startDate={startDate}
                            endDate={endDate}
                            isEditing={isEditingDates}
                            readOnly={isReadOnly}
                            onToggleEditing={() =>
                                setIsEditingDates((prev) =>
                                    isReadOnly ? prev : !prev,
                                )
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
                        <DailyExpensesCard
                            href={
                                viewerId
                                    ? `/shared/${viewerId}/periods/${periodId}/daily`
                                    : isOnboardingMode
                                      ? `/onboarding/periods/${periodId}/daily`
                                      : `/periods/${periodId}/daily`
                            }
                        />
                        <PlannedAverageCard
                            dailyAverage={dailyAverage}
                            days={days}
                            totalIncome={totalIncome}
                            totalPlannedExpenses={totalPlannedExpenses}
                            totalUnforeseenAllocated={unforeseenAllocated}
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
                            unforeseenOverrun={unforeseenOverrun}
                            actualRemaining={actualRemaining}
                            unforeseenRemaining={unforeseenRemaining}
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

                {showSessionExpired && (
                    <SessionExpiredModal
                        onClose={() => setShowSessionExpired(false)}
                        onReload={() => window.location.reload()}
                    />
                )}

                {!isViewerMode && overlapPeriod && (
                    <OverlapPeriodModal
                        href={
                            isOnboardingMode
                                ? `/onboarding/periods/${overlapPeriod.id}`
                                : `/periods/${overlapPeriod.id}`
                        }
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
            {isOnboardingMode && !isViewerMode && (
                <OnboardingTour
                    open={isPeriodGuideOpen}
                    steps={periodGuideSteps}
                    refreshKey={`${incomes.length}:${expenses.length}`}
                    onClose={() => {
                        markPeriodGuideCompleted();
                        setIsPeriodGuideOpen(false);
                    }}
                />
            )}
        </AppLayout>
    );
}
