import { formatDateKey, parseDate } from '@/lib/date';
import type {
    AmountItem,
    ExpenseItem,
    NamedAmountItem,
} from '@/types/period';

export const calculateAmountTotal = (items: AmountItem[]) =>
    (items ?? []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

export const calculateExpenseTotals = (items: ExpenseItem[]) => {
    const totalPlanned = (items ?? []).reduce(
        (sum, item) => sum + (Number(item.plannedAmount) || 0),
        0,
    );
    const totalActual = (items ?? []).reduce(
        (sum, item) => sum + (Number(item.actualAmount) || 0),
        0,
    );
    return {
        totalPlanned,
        totalActual,
        totalDifference: totalPlanned - totalActual,
    };
};

export const calculateDailyExpensesTotal = (
    dailyExpenses: Record<string, number>,
) =>
    Object.values(dailyExpenses).reduce((sum, value) => sum + (value || 0), 0);

export const calculateFilledDays = (
    startDate: string,
    endDate: string,
    dailyExpenses: Record<string, number>,
) => {
    if (!startDate || !endDate) {
        return 0;
    }
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
        return 0;
    }
    let count = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
        const key = formatDateKey(cursor);
        if (dailyExpenses[key] !== undefined) {
            count += 1;
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return count;
};

export const calculatePeriodMetrics = (params: {
    days: number;
    totalIncome: number;
    totalPlannedExpenses: number;
    totalDifference: number;
    totalDailyExpenses: number;
    filledDays: number;
}) => {
    const {
        days,
        totalIncome,
        totalPlannedExpenses,
        totalDifference,
        totalDailyExpenses,
        filledDays,
    } = params;
    const plannedPeriodSum = totalIncome - totalPlannedExpenses;
    const dailyAverage = days > 0 ? plannedPeriodSum / days : 0;
    const actualRemaining =
        plannedPeriodSum + totalDifference - totalDailyExpenses;
    const remainingDays = Math.max(0, days - filledDays);
    const remainingDailyAverage =
        remainingDays > 0 ? actualRemaining / remainingDays : 0;
    const isDailyComplete = days > 0 && filledDays >= days;

    return {
        plannedPeriodSum,
        dailyAverage,
        actualRemaining,
        remainingDays,
        remainingDailyAverage,
        isDailyComplete,
    };
};

export const getInvalidIncomeIds = (items: NamedAmountItem[]) =>
    items
        .filter((item) => item.name.trim() === '' && item.amount !== '')
        .map((item) => item.id);

export const formatDateLabel = (date: Date) => {
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayIndex = (date.getDay() + 6) % 7;
    return `${dayNames[dayIndex]}, ${day}.${month}`;
};

export const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

export const generateWeeklyBlocks = (start: string, end: string) => {
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    const blocks: Date[][] = [];
    let cursor = new Date(startDate);

    while (cursor <= endDate) {
        const block: Date[] = [];
        const dayOfWeek = cursor.getDay();
        const daysToSunday = (7 - dayOfWeek) % 7;
        const remainingDays = Math.floor(
            (endDate.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24),
        );
        const blockEnd = addDays(cursor, Math.min(daysToSunday, remainingDays));

        let current = new Date(cursor);
        while (current <= blockEnd) {
            block.push(new Date(current));
            current = addDays(current, 1);
        }

        blocks.push(block);
        cursor = addDays(blockEnd, 1);
    }

    return blocks;
};

export const calculateBlockStats = (
    block: Date[],
    dailyExpenses: Record<string, number>,
) => {
    const total = block.reduce(
        (sum, date) => sum + (dailyExpenses[formatDateKey(date)] || 0),
        0,
    );
    const filledDays = block.filter(
        (date) => dailyExpenses[formatDateKey(date)] !== undefined,
    ).length;
    const average = filledDays > 0 ? total / filledDays : 0;

    return {
        total,
        filledDays,
        average,
    };
};
