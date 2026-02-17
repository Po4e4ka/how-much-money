import { ApiError } from '@/lib/api';

export type OnboardingIncome = {
    id: number;
    name: string;
    amount: number;
};

export type OnboardingExpense = {
    id: number;
    name: string;
    planned_amount: number;
    actual_amount: number;
};

export type OnboardingExternal = {
    id: number;
    name: string;
    amount: number;
};

export type OnboardingPeriod = {
    id: number;
    start_date: string;
    end_date: string;
    is_pinned: boolean;
    is_closed: boolean;
    actual_remaining: number | null;
    daily_expenses: Record<string, number>;
    unforeseen_allocated: number;
    incomes: OnboardingIncome[];
    expenses: OnboardingExpense[];
    external_expenses: OnboardingExternal[];
    unforeseen_expenses: OnboardingExpense[];
};

const STORE_KEY = 'onboarding:periods:v1';

const DEFAULT_PERIODS: OnboardingPeriod[] = [
    {
        id: 1,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
        is_pinned: false,
        is_closed: true,
        actual_remaining: 12800,
        daily_expenses: {},
        unforeseen_allocated: 0,
        incomes: [],
        expenses: [],
        external_expenses: [],
        unforeseen_expenses: [],
    },
    {
        id: 2,
        start_date: '2025-11-01',
        end_date: '2025-11-30',
        is_pinned: true,
        is_closed: true,
        actual_remaining: 6400,
        daily_expenses: {},
        unforeseen_allocated: 0,
        incomes: [],
        expenses: [],
        external_expenses: [],
        unforeseen_expenses: [],
    },
    {
        id: 3,
        start_date: '2025-10-01',
        end_date: '2025-10-31',
        is_pinned: false,
        is_closed: true,
        actual_remaining: 9800,
        daily_expenses: {},
        unforeseen_allocated: 0,
        incomes: [],
        expenses: [],
        external_expenses: [],
        unforeseen_expenses: [],
    },
];

const sortPeriods = (items: OnboardingPeriod[]) =>
    [...items].sort((a, b) => {
        const aTs = new Date(a.start_date).getTime();
        const bTs = new Date(b.start_date).getTime();
        return bTs - aTs;
    });

const normalize = (raw: unknown): OnboardingPeriod[] => {
    if (!Array.isArray(raw)) {
        return sortPeriods(DEFAULT_PERIODS);
    }

    const hasFullShape = raw.every(
        (item) =>
            item &&
            typeof item === 'object' &&
            'id' in item &&
            'start_date' in item &&
            'end_date' in item &&
            'daily_expenses' in item,
    );

    if (hasFullShape) {
        return sortPeriods(raw as OnboardingPeriod[]);
    }

    // backward compatibility with old dashboard-only structure
    const mapped = (raw as Array<Record<string, unknown>>).map(
        (period, idx): OnboardingPeriod => ({
            id: Number(period.id ?? idx + 1),
            start_date: String(period.start_date ?? ''),
            end_date: String(period.end_date ?? ''),
            is_pinned: Boolean(period.is_pinned),
            is_closed: Boolean(period.is_closed),
            actual_remaining:
                typeof period.actual_remaining === 'number'
                    ? period.actual_remaining
                    : null,
            daily_expenses: {},
            unforeseen_allocated: 0,
            incomes: [],
            expenses: [],
            external_expenses: [],
            unforeseen_expenses: [],
        }),
    );

    return sortPeriods(mapped);
};

export const loadOnboardingPeriods = (): OnboardingPeriod[] => {
    if (typeof window === 'undefined') {
        return sortPeriods(DEFAULT_PERIODS);
    }

    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) {
        const seeded = sortPeriods(DEFAULT_PERIODS);
        window.localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
        return seeded;
    }

    try {
        const parsed = JSON.parse(raw);
        const normalized = normalize(parsed);
        window.localStorage.setItem(STORE_KEY, JSON.stringify(normalized));
        return normalized;
    } catch {
        const seeded = sortPeriods(DEFAULT_PERIODS);
        window.localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
        return seeded;
    }
};

export const saveOnboardingPeriods = (periods: OnboardingPeriod[]) => {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(STORE_KEY, JSON.stringify(sortPeriods(periods)));
};

export const resetOnboardingPeriods = () => {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.removeItem(STORE_KEY);
};

const nextPeriodId = (periods: OnboardingPeriod[]) =>
    periods.length ? Math.max(...periods.map((period) => period.id)) + 1 : 1;

const nextItemId = (periods: OnboardingPeriod[]) => {
    let maxId = 0;
    for (const period of periods) {
        for (const row of period.incomes) maxId = Math.max(maxId, row.id);
        for (const row of period.expenses) maxId = Math.max(maxId, row.id);
        for (const row of period.external_expenses) maxId = Math.max(maxId, row.id);
        for (const row of period.unforeseen_expenses) maxId = Math.max(maxId, row.id);
    }
    return maxId + 1;
};

const parseDate = (value: string) => new Date(`${value}T00:00:00`).getTime();

const findOverlap = (
    periods: OnboardingPeriod[],
    startDate: string,
    endDate: string,
    exceptId?: number,
) => {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    return periods.find((period) => {
        if (exceptId && period.id === exceptId) {
            return false;
        }
        const periodStart = parseDate(period.start_date);
        const periodEnd = parseDate(period.end_date);
        return start < periodEnd && end > periodStart;
    });
};

const daysRange = (startDate: string, endDate: string) => {
    const result: string[] = [];
    const current = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    while (current <= end) {
        result.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 1);
    }
    return result;
};

const hasAllDailyExpenses = (period: OnboardingPeriod) =>
    daysRange(period.start_date, period.end_date).every((key) =>
        Object.prototype.hasOwnProperty.call(period.daily_expenses ?? {}, key),
    );

const calculateActualRemaining = (period: OnboardingPeriod): number => {
    const dailyTotal = Object.values(period.daily_expenses ?? {}).reduce(
        (sum, value) => sum + Number(value || 0),
        0,
    );
    const incomeTotal = period.incomes.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
    );
    const mandatoryActual = period.expenses.reduce(
        (sum, item) => sum + Number(item.actual_amount || 0),
        0,
    );
    const unforeseenActual = period.unforeseen_expenses.reduce(
        (sum, item) => sum + Number(item.actual_amount || 0),
        0,
    );
    const unforeseenAllocated = Number(period.unforeseen_allocated || 0);
    const unforeseenOverrun = Math.max(0, unforeseenActual - unforeseenAllocated);

    return (
        incomeTotal -
        mandatoryActual -
        unforeseenAllocated -
        unforeseenOverrun -
        dailyTotal
    );
};

export const createOnboardingPeriod = (startDate: string, endDate: string) => {
    const periods = loadOnboardingPeriods();
    const overlap = findOverlap(periods, startDate, endDate);
    if (overlap) {
        throw new ApiError('Период пересекается с существующим.', 409, {
            overlap: {
                id: overlap.id,
                start_date: overlap.start_date,
                end_date: overlap.end_date,
            },
        });
    }

    const period: OnboardingPeriod = {
        id: nextPeriodId(periods),
        start_date: startDate,
        end_date: endDate,
        is_pinned: false,
        is_closed: false,
        actual_remaining: null,
        daily_expenses: {},
        unforeseen_allocated: 0,
        incomes: [],
        expenses: [],
        external_expenses: [],
        unforeseen_expenses: [],
    };

    const next = sortPeriods([...periods, period]);
    saveOnboardingPeriods(next);
    return period;
};

export const updateOnboardingPeriod = (
    periodId: number,
    payload: Record<string, unknown>,
) => {
    const periods = loadOnboardingPeriods();
    const index = periods.findIndex((period) => period.id === periodId);
    if (index < 0) {
        throw new ApiError('Период не найден.', 404, null);
    }

    const current = periods[index];
    const next = { ...current };

    const hasStart = Object.prototype.hasOwnProperty.call(payload, 'start_date');
    const hasEnd = Object.prototype.hasOwnProperty.call(payload, 'end_date');
    if (hasStart || hasEnd) {
        const startDate = String(payload.start_date ?? next.start_date);
        const endDate = String(payload.end_date ?? next.end_date);
        const force = Boolean(payload.force);
        const overlap = findOverlap(periods, startDate, endDate, next.id);
        if (overlap && !force) {
            throw new ApiError('Период пересекается с существующим.', 409, {
                overlap: {
                    id: overlap.id,
                    start_date: overlap.start_date,
                    end_date: overlap.end_date,
                },
            });
        }
        next.start_date = startDate;
        next.end_date = endDate;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'daily_expenses')) {
        next.daily_expenses = (payload.daily_expenses ??
            {}) as Record<string, number>;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'unforeseen_allocated')) {
        next.unforeseen_allocated = Number(payload.unforeseen_allocated ?? 0);
    }

    let seq = nextItemId(periods);
    const ensureId = (value: unknown): number => {
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric > 0) {
            return numeric;
        }
        const id = seq;
        seq += 1;
        return id;
    };

    if (Object.prototype.hasOwnProperty.call(payload, 'incomes')) {
        const rows = (payload.incomes ?? []) as Array<Record<string, unknown>>;
        next.incomes = rows.map((item) => ({
            id: ensureId(item.id),
            name: String(item.name ?? ''),
            amount: Number(item.amount ?? 0),
        }));
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'expenses')) {
        const rows = (payload.expenses ?? []) as Array<Record<string, unknown>>;
        next.expenses = rows.map((item) => ({
            id: ensureId(item.id),
            name: String(item.name ?? ''),
            planned_amount: Number(item.planned_amount ?? 0),
            actual_amount: Number(item.actual_amount ?? 0),
        }));
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'external_expenses')) {
        const rows = (payload.external_expenses ?? []) as Array<
            Record<string, unknown>
        >;
        next.external_expenses = rows.map((item) => ({
            id: ensureId(item.id),
            name: String(item.name ?? ''),
            amount: Number(item.amount ?? 0),
        }));
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'unforeseen_expenses')) {
        const rows = (payload.unforeseen_expenses ?? []) as Array<
            Record<string, unknown>
        >;
        next.unforeseen_expenses = rows.map((item) => ({
            id: ensureId(item.id),
            name: String(item.name ?? ''),
            planned_amount: Number(item.planned_amount ?? 0),
            actual_amount: Number(item.actual_amount ?? 0),
        }));
    }

    next.actual_remaining = next.is_closed ? calculateActualRemaining(next) : null;
    periods[index] = next;
    saveOnboardingPeriods(periods);
    return next;
};

export const getOnboardingPeriod = (periodId: number) => {
    const period = loadOnboardingPeriods().find((item) => item.id === periodId);
    if (!period) {
        throw new ApiError('Период не найден.', 404, null);
    }
    return period;
};

export const deleteOnboardingPeriod = (periodId: number) => {
    const periods = loadOnboardingPeriods();
    const next = periods.filter((item) => item.id !== periodId);
    saveOnboardingPeriods(next);
};

export const closeOnboardingPeriod = (periodId: number) => {
    const period = getOnboardingPeriod(periodId);
    if (!hasAllDailyExpenses(period)) {
        throw new ApiError(
            'Заполните ежедневные траты за все дни периода.',
            422,
            null,
        );
    }
    const next = updateOnboardingPeriod(periodId, {});
    next.is_closed = true;
    next.actual_remaining = calculateActualRemaining(next);
    const periods = loadOnboardingPeriods();
    const idx = periods.findIndex((item) => item.id === periodId);
    periods[idx] = next;
    saveOnboardingPeriods(periods);
    return {
        is_closed: true,
        actual_remaining: next.actual_remaining,
    };
};

export const pinOnboardingPeriod = (
    periodId: number,
    pinned: boolean,
    force: boolean,
) => {
    const periods = loadOnboardingPeriods();
    const current = periods.find((item) => item.id === periodId);
    if (!current) {
        throw new ApiError('Период не найден.', 404, null);
    }

    if (!pinned) {
        current.is_pinned = false;
        saveOnboardingPeriods(periods);
        return { is_pinned: false };
    }

    const existing = periods.find((item) => item.is_pinned && item.id !== periodId);
    if (existing && !force) {
        throw new ApiError('Уже есть закрепленный период.', 409, {
            pinned: {
                id: existing.id,
                start_date: existing.start_date,
                end_date: existing.end_date,
            },
        });
    }

    for (const item of periods) {
        item.is_pinned = item.id === periodId;
    }
    saveOnboardingPeriods(periods);
    return { is_pinned: true };
};

export const onboardingExpenseSuggestions = (
    periodId: number,
    type: 'income' | 'mandatory' | 'external' | 'unforeseen',
) => {
    const periods = loadOnboardingPeriods();
    const current = periods.find((item) => item.id === periodId);
    if (!current) {
        return { previous: [], all: [] };
    }

    const select = (period: OnboardingPeriod) => {
        if (type === 'income') return period.incomes.map((item) => item.name);
        if (type === 'mandatory') return period.expenses.map((item) => item.name);
        if (type === 'external') {
            return period.external_expenses.map((item) => item.name);
        }
        return period.unforeseen_expenses.map((item) => item.name);
    };

    const sortedById = [...periods].sort((a, b) => a.id - b.id);
    const previous = sortedById
        .filter((period) => period.id < periodId)
        .at(-1);

    return {
        previous: previous ? [...new Set(select(previous))].sort() : [],
        all: [...new Set(sortedById.flatMap((period) => select(period)))].sort(),
    };
};

