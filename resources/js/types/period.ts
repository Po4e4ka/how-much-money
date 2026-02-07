import type { Dispatch, SetStateAction } from 'react';

export type AmountItem = {
    amount: number | '';
};

export type NamedAmountItem = AmountItem & {
    id: string;
    name: string;
};

export type ExpenseItem = {
    id: string;
    name: string;
    plannedAmount: number | '';
    actualAmount: number | '';
    actualTouched?: boolean;
};

export type OffIncomeItem = NamedAmountItem;

export type IncomeItem = NamedAmountItem;

export type PeriodData = {
    id: number;
    startDate: string;
    endDate: string;
    incomes: IncomeItem[];
    expenses: ExpenseItem[];
    offIncomeExpenses: OffIncomeItem[];
    dailyExpenses: Record<string, number>;
    isPinned: boolean;
    isClosed: boolean;
};

export type PeriodDailyData = {
    id: number;
    startDate: string;
    endDate: string;
    dailyExpenses: Record<string, number>;
    isClosed: boolean;
};

export type DashboardPeriodItem = {
    id: number;
    start_date: string;
    end_date: string;
    is_pinned?: boolean;
    is_closed?: boolean;
    actual_remaining?: number | null;
};

export type ExpensesBlockProps = {
    title: string;
    items: ExpenseItem[];
    setItems: Dispatch<SetStateAction<ExpenseItem[]>>;
    showDelete: boolean;
    onToggleDelete: () => void;
    totalLabel: string;
    totalPlanned: number;
    totalActual: number;
    totalDifference: number;
    idPrefix: string;
    onBlurField: () => void;
    onAfterDelete: () => void;
    readOnly?: boolean;
};

export type OffIncomeBlockProps = {
    title: string;
    items: OffIncomeItem[];
    setItems: Dispatch<SetStateAction<OffIncomeItem[]>>;
    showDelete: boolean;
    onToggleDelete: () => void;
    totalLabel: string;
    totalAmount: number;
    idPrefix: string;
    onBlurField: () => void;
    onAfterDelete: () => void;
    readOnly?: boolean;
};

export type IncomeBlockProps = {
    items: IncomeItem[];
    setItems: Dispatch<SetStateAction<IncomeItem[]>>;
    totalAmount: number;
    onAdd: () => void;
    showDelete: boolean;
    onToggleDelete: () => void;
    onBlurField: () => void;
    onAfterDelete: () => void;
    invalidNameIds: string[];
    readOnly?: boolean;
};
