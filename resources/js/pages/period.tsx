import { Head, Link, usePage } from '@inertiajs/react';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { PillButton } from '@/components/pill-button';
import { ConfirmPinModal } from '@/components/confirm-pin-modal';
import { ConfirmClosePeriodModal } from '@/components/confirm-close-period-modal';
import { OverlapPeriodModal } from '@/components/overlap-period-modal';
import { BlockTitle } from '@/components/block-title';
import { BigDigit } from '@/components/big-digit';

const delay = (ms: number) => ({ '--delay': `${ms}ms` } as CSSProperties);

type ExpenseItem = {
    id: string;
    name: string;
    plannedAmount: number | '';
    actualAmount: number | '';
    actualTouched?: boolean;
};

type OffIncomeItem = {
    id: string;
    name: string;
    amount: number | '';
};

type IncomeItem = {
    id: string;
    name: string;
    amount: number | '';
};

type PeriodData = {
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

const formatCurrency = (value: number) =>
    `${Math.max(0, Math.round(value)).toLocaleString('ru-RU')} ₽`;

const formatSignedCurrency = (value: number) => {
    const rounded = Math.round(value);
    if (rounded === 0) {
        return '0 ₽';
    }
    const sign = rounded > 0 ? '+' : '−';
    return `${sign}${Math.abs(rounded).toLocaleString('ru-RU')} ₽`;
};

const parseDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
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

const calculateDaysInclusive = (start: string, end: string) => {
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
};

const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toIntegerValue = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits === '') {
        return '';
    }
    return Number(digits);
};

const getInvalidIncomeIds = (items: IncomeItem[]) =>
    items
        .filter((item) => item.name.trim() === '')
        .map((item) => item.id);

type ExpensesBlockProps = {
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

type OffIncomeBlockProps = {
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

type IncomeBlockProps = {
    items: IncomeItem[];
    setItems: Dispatch<SetStateAction<IncomeItem[]>>;
    totalAmount: number;
    onAdd: () => void;
    onBlurField: () => void;
    invalidNameIds: string[];
    readOnly?: boolean;
};

type FormulaRowProps = {
    children: React.ReactNode;
    className?: string;
};

type FormulaValueProps = {
    children: React.ReactNode;
    className?: string;
};

type FormulaOpProps = {
    children: React.ReactNode;
    className?: string;
};

const FormulaRow = ({ children, className }: FormulaRowProps) => (
    <div
        className={`flex flex-wrap items-center gap-2 text-xs font-semibold sm:text-sm ${
            className ?? ''
        }`}
    >
        {children}
    </div>
);

const FormulaValue = ({ children, className }: FormulaValueProps) => (
    <span
        className={`inline-flex items-center font-display tabular-nums leading-[0.9] ${
            className ?? ''
        }`}
    >
        {children}
    </span>
);

const FormulaOp = ({ children, className }: FormulaOpProps) => (
    <span
        className={`inline-flex items-center leading-[0.9] relative -top-[1px] text-black/50 dark:text-white/60 ${
            className ?? ''
        }`}
    >
        {children}
    </span>
);

const IncomeBlock = ({
    items,
    setItems,
    totalAmount,
    onAdd,
    onBlurField,
    invalidNameIds,
    readOnly = false,
}: IncomeBlockProps) => (
    <div className="rounded-lg border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center justify-between">
            <BlockTitle>Приход</BlockTitle>
            <PillButton type="button" onClick={onAdd} disabled={readOnly}>
                + Строка
            </PillButton>
        </div>
        <div className="mt-3 hidden grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)] items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60 sm:grid">
            <span>Название</span>
            <span className="text-right">Сумма</span>
        </div>
        <div className="mt-3 grid gap-2">
            {items.map((item, index) => (
                <div
                    key={item.id}
                    className="grid items-center gap-2 grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)]"
                >
                    <input
                        type="text"
                        placeholder={`Приход ${index + 1}`}
                        value={item.name}
                        disabled={readOnly}
                        onChange={(event) =>
                            setItems((prev) =>
                                prev.map((income) =>
                                    income.id === item.id
                                        ? {
                                              ...income,
                                              name: event.target.value,
                                          }
                                        : income,
                                ),
                            )
                        }
                        onBlur={onBlurField}
                        className={`rounded-lg border bg-white/90 px-3 py-2 text-xs dark:bg-white/10 sm:px-4 sm:text-sm ${
                            invalidNameIds.includes(item.id)
                                ? 'border-[#b0352b] dark:border-[#ff8b7c]'
                                : 'border-black/10 dark:border-white/10'
                        }`}
                    />
                    <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={item.amount}
                        disabled={readOnly}
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            setItems((prev) =>
                                prev.map((income) =>
                                    income.id === item.id
                                        ? {
                                              ...income,
                                              amount:
                                                  toIntegerValue(nextValue),
                                          }
                                        : income,
                                ),
                            );
                        }}
                        onFocus={() => {
                            if (item.amount === 0) {
                                setItems((prev) =>
                                    prev.map((income) =>
                                        income.id === item.id
                                            ? { ...income, amount: '' }
                                            : income,
                                    ),
                                );
                            }
                        }}
                        onBlur={() => {
                            if (item.amount === '') {
                                setItems((prev) =>
                                    prev.map((income) =>
                                        income.id === item.id
                                            ? { ...income, amount: 0 }
                                            : income,
                                    ),
                                );
                            }
                            onBlurField();
                        }}
                        className="no-spin rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs text-right tabular-nums dark:border-white/10 dark:bg-white/10 sm:px-4 sm:text-sm"
                    />
                </div>
            ))}
        </div>
        <div className="mt-3 grid items-center gap-2 rounded-lg border border-dashed border-black/10 bg-white/70 px-4 py-2 text-xs dark:border-white/10 dark:bg-white/5 grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)]">
            <span>Итого прихода</span>
            <span className="text-right font-display text-sm tabular-nums">
                {formatCurrency(totalAmount)}
            </span>
        </div>
    </div>
);

const ExpensesBlock = ({
    title,
    items,
    setItems,
    showDelete,
    onToggleDelete,
    totalLabel,
    totalPlanned,
    totalActual,
    totalDifference,
    idPrefix,
    onBlurField,
    onAfterDelete,
    readOnly = false,
}: ExpensesBlockProps) => (
    <div className="rounded-lg border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center justify-between">
            <BlockTitle>{title}</BlockTitle>
            <div className="flex items-center gap-2">
                <PillButton
                    type="button"
                    onClick={() =>
                        setItems((prev) => [
                            ...prev,
                            {
                                id: `${idPrefix}${Date.now()}`,
                                name: '',
                                plannedAmount: '',
                                actualAmount: '',
                                actualTouched: false,
                            },
                        ])
                    }
                    disabled={readOnly}
                >
                    + Строка
                </PillButton>
                <PillButton
                    type="button"
                    onClick={onToggleDelete}
                    active={showDelete}
                    activeTone="danger"
                    disabled={readOnly}
                >
                    − Удаление
                </PillButton>
            </div>
        </div>
        <div
            className={`mt-3 grid items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60 ${
                showDelete
                    ? 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]'
                    : 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]'
            }`}
        >
            <span>
                <span className="sm:hidden">Название</span>
                <span className="hidden sm:inline">Название</span>
            </span>
            <span className="text-right">План</span>
            <span className="text-right">Факт</span>
            <span className="text-right">
                <span className="sm:hidden">Разн</span>
                <span className="hidden sm:inline">Разница</span>
            </span>
            {showDelete && <span className="text-center">—</span>}
        </div>
        <div className="mt-3 grid gap-2">
            {items.map((item, index) => (
                <div
                    key={item.id}
                    className={`grid items-center gap-2 ${
                        showDelete
                            ? 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]'
                            : 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]'
                    }`}
                >
                    <input
                        type="text"
                        placeholder={`Трата ${index + 1}`}
                        value={item.name}
                        disabled={readOnly}
                        onChange={(event) =>
                            setItems((prev) =>
                                prev.map((expense) =>
                                    expense.id === item.id
                                        ? {
                                              ...expense,
                                              name: event.target.value,
                                          }
                                        : expense,
                                ),
                            )
                        }
                        onBlur={onBlurField}
                        className="rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/10 sm:px-4 sm:text-sm"
                    />
                    <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={item.plannedAmount}
                        disabled={readOnly}
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            setItems((prev) =>
                                prev.map((expense) =>
                                    expense.id === item.id
                                        ? {
                                              ...expense,
                                              plannedAmount:
                                                  toIntegerValue(nextValue),
                                              actualAmount: expense.actualTouched
                                                  ? expense.actualAmount
                                                  : toIntegerValue(nextValue),
                                          }
                                        : expense,
                                ),
                            );
                        }}
                        onFocus={() => {
                            if (item.plannedAmount === 0) {
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? { ...expense, plannedAmount: '' }
                                            : expense,
                                    ),
                                );
                            }
                        }}
                        onBlur={() => {
                            if (item.plannedAmount === '') {
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? { ...expense, plannedAmount: 0 }
                                            : expense,
                                    ),
                                );
                            }
                            onBlurField();
                        }}
                        className="no-spin rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs text-right tabular-nums dark:border-white/10 dark:bg-white/10 sm:px-4 sm:text-sm"
                    />
                    <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={item.actualAmount}
                        disabled={readOnly}
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            setItems((prev) =>
                                prev.map((expense) =>
                                    expense.id === item.id
                                        ? {
                                              ...expense,
                                              actualAmount:
                                                  toIntegerValue(nextValue),
                                              actualTouched: true,
                                          }
                                        : expense,
                                ),
                            );
                        }}
                        onFocus={() => {
                            if (item.actualAmount === 0) {
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? { ...expense, actualAmount: '' }
                                            : expense,
                                    ),
                                );
                            }
                        }}
                        onBlur={() => {
                            if (item.actualAmount === '') {
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? { ...expense, actualAmount: 0 }
                                            : expense,
                                    ),
                                );
                            }
                            onBlurField();
                        }}
                        className="no-spin rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs text-right tabular-nums dark:border-white/10 dark:bg-white/10 sm:px-4 sm:text-sm"
                    />
                    <div
                        className={`flex min-h-[36px] items-center justify-end px-0 py-2 text-xs tabular-nums sm:min-h-[40px] sm:px-4 sm:text-sm ${
                            item.plannedAmount - item.actualAmount > 0
                                ? 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                                : item.plannedAmount - item.actualAmount < 0
                                  ? 'text-[#b0352b] dark:text-[#ff8b7c]'
                                  : 'text-[#6a5d52] dark:text-white/70'
                        }`}
                    >
                        {formatSignedCurrency(
                            item.plannedAmount - item.actualAmount,
                        )}
                    </div>
                    {showDelete && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm('Удалить строку?')) {
                                    setItems((prev) =>
                                        prev.filter(
                                            (expense) => expense.id !== item.id,
                                        ),
                                    );
                                    onAfterDelete();
                                }
                            }}
                            aria-label={`Удалить трату ${index + 1}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-[#b0352b] transition hover:bg-[#b0352b]/10 dark:text-[#ff8b7c] dark:hover:bg-[#ff8b7c]/15"
                            disabled={readOnly}
                        >
                            —
                        </button>
                    )}
                </div>
            ))}
        </div>
        <div
            className={`mt-3 grid items-center gap-2 rounded-lg border border-dashed border-black/10 bg-white/70 px-4 py-2 text-xs dark:border-white/10 dark:bg-white/5 ${
                showDelete
                    ? 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]'
                    : 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]'
            }`}
        >
            <span>{totalLabel}</span>
            <span className="text-right font-display text-sm tabular-nums">
                {formatCurrency(totalPlanned)}
            </span>
            <span className="text-right font-display text-sm tabular-nums">
                {formatCurrency(totalActual)}
            </span>
            <span
                className={`text-right font-display text-sm tabular-nums ${
                    totalDifference > 0
                        ? 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                        : totalDifference < 0
                          ? 'text-[#b0352b] dark:text-[#ff8b7c]'
                          : 'text-[#6a5d52] dark:text-white/70'
                }`}
            >
                {formatSignedCurrency(totalDifference)}
            </span>
            {showDelete && <span />}
        </div>
    </div>
);

const OffIncomeBlock = ({
    title,
    items,
    setItems,
    showDelete,
    onToggleDelete,
    totalLabel,
    totalAmount,
    idPrefix,
    onBlurField,
    onAfterDelete,
    readOnly = false,
}: OffIncomeBlockProps) => (
    <div className="rounded-lg border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center justify-between">
            <BlockTitle
                tooltipText="Эти траты не учитываются в расчётах."
                tooltipAriaLabel="Сторонние траты"
            >
                {title}
            </BlockTitle>
            <div className="flex items-center gap-2">
                <PillButton
                    type="button"
                    onClick={() =>
                        setItems((prev) => [
                            ...prev,
                            {
                                id: `${idPrefix}${Date.now()}`,
                                name: '',
                                amount: '',
                            },
                        ])
                    }
                    disabled={readOnly}
                >
                    + Строка
                </PillButton>
                <PillButton
                    type="button"
                    onClick={onToggleDelete}
                    active={showDelete}
                    activeTone="danger"
                    disabled={readOnly}
                >
                    − Удаление
                </PillButton>
            </div>
        </div>
        <div
            className={`mt-3 hidden items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60 sm:grid ${
                showDelete
                    ? 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_auto]'
                    : 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)]'
            }`}
        >
            <span>Название</span>
            <span className="text-right">Сумма</span>
            {showDelete && <span className="text-center">—</span>}
        </div>
        <div className="mt-3 grid gap-2">
            {items.map((item, index) => (
                <div
                    key={item.id}
                    className={`grid items-center gap-2 ${
                        showDelete
                            ? 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_auto]'
                            : 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)]'
                    }`}
                >
                    <input
                        type="text"
                        placeholder={`Трата ${index + 1}`}
                        value={item.name}
                        disabled={readOnly}
                        onChange={(event) =>
                            setItems((prev) =>
                                prev.map((expense) =>
                                    expense.id === item.id
                                        ? {
                                              ...expense,
                                              name: event.target.value,
                                          }
                                        : expense,
                                ),
                            )
                        }
                        onBlur={onBlurField}
                        className="rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/10 sm:px-4 sm:text-sm"
                    />
                    <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={item.amount}
                        disabled={readOnly}
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            setItems((prev) =>
                                prev.map((expense) =>
                                    expense.id === item.id
                                        ? {
                                              ...expense,
                                              amount: toIntegerValue(nextValue),
                                          }
                                        : expense,
                                ),
                            );
                        }}
                        onFocus={() => {
                            if (item.amount === 0) {
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? { ...expense, amount: '' }
                                            : expense,
                                    ),
                                );
                            }
                        }}
                        onBlur={() => {
                            if (item.amount === '') {
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? { ...expense, amount: 0 }
                                            : expense,
                                    ),
                                );
                            }
                            onBlurField();
                        }}
                        className="no-spin rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs text-right tabular-nums text-[#b0352b] dark:border-white/10 dark:bg-white/10 dark:text-[#ff8b7c] sm:px-4 sm:text-sm"
                    />
                    {showDelete && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm('Удалить строку?')) {
                                    setItems((prev) =>
                                        prev.filter(
                                            (expense) => expense.id !== item.id,
                                        ),
                                    );
                                    onAfterDelete();
                                }
                            }}
                            aria-label={`Удалить трату ${index + 1}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-[#b0352b] transition hover:bg-[#b0352b]/10 dark:text-[#ff8b7c] dark:hover:bg-[#ff8b7c]/15"
                            disabled={readOnly}
                        >
                            —
                        </button>
                    )}
                </div>
            ))}
        </div>
        <div
            className={`mt-3 grid items-center gap-2 rounded-lg border border-dashed border-black/10 bg-white/70 px-4 py-2 text-xs dark:border-white/10 dark:bg-white/5 ${
                showDelete
                    ? 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_auto]'
                    : 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)]'
            }`}
        >
            <span>{totalLabel}</span>
            <span className="text-right font-display text-sm tabular-nums text-[#b0352b] dark:text-[#ff8b7c]">
                {formatCurrency(totalAmount)}
            </span>
            {showDelete && <span />}
        </div>
    </div>
);

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

    const totalPlannedExpenses = (expenses ?? []).reduce(
        (sum, item) => sum + (Number(item.plannedAmount) || 0),
        0,
    );
    const totalActualExpenses = (expenses ?? []).reduce(
        (sum, item) => sum + (Number(item.actualAmount) || 0),
        0,
    );
    const totalDifference = totalPlannedExpenses - totalActualExpenses;
    const totalOffIncome = (offIncomeExpenses ?? []).reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0,
    );
    const totalIncome = (incomes ?? []).reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0,
    );
    const days = useMemo(() => {
        if (!startDate || !endDate) {
            return 0;
        }
        return calculateDaysInclusive(startDate, endDate);
    }, [startDate, endDate]);
    const totalDailyExpenses = useMemo(
        () =>
            Object.values(dailyExpenses).reduce(
                (sum, value) => sum + (value || 0),
                0,
            ),
        [dailyExpenses],
    );
    const filledDays = useMemo(() => {
        if (!startDate || !endDate) {
            return 0;
        }
        const start = parseDate(startDate);
        const end = parseDate(endDate);
        if (
            !Number.isFinite(start.getTime()) ||
            !Number.isFinite(end.getTime())
        ) {
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
    }, [dailyExpenses, startDate, endDate]);
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
    const plannedPeriodSum = totalIncome - totalPlannedExpenses;
    const dailyAverage = days > 0 ? plannedPeriodSum / days : 0;
    const actualRemaining =
        plannedPeriodSum + totalDifference - totalDailyExpenses;
    const remainingDays = Math.max(0, days - filledDays);
    const remainingDailyAverage =
        remainingDays > 0 ? actualRemaining / remainingDays : 0;
    const isDailyComplete = days > 0 && filledDays >= days;
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
                    incomes: incomes.map((item) => ({
                        id: Number.isFinite(Number(item.id))
                            ? Number(item.id)
                            : undefined,
                        name: item.name,
                        amount: Number(item.amount) || 0,
                    })),
                    expenses: expenses.map((item) => ({
                        id: Number.isFinite(Number(item.id))
                            ? Number(item.id)
                            : undefined,
                        name: item.name,
                        planned_amount: Number(item.plannedAmount) || 0,
                        actual_amount: Number(item.actualAmount) || 0,
                    })),
                    external_expenses: offIncomeExpenses.map((item) => ({
                        id: Number.isFinite(Number(item.id))
                            ? Number(item.id)
                            : undefined,
                        name: item.name,
                        amount: Number(item.amount) || 0,
                    })),
                }),
            });

            if (response.status === 409) {
                const payload = (await response.json()) as {
                    overlap?: { id: number; start_date: string; end_date: string };
                };
                if (payload.overlap) {
                    setOverlapPeriod(payload.overlap);
                    setPendingForce(true);
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

            setSaveSuccess(true);
            setOverlapPeriod(null);
            setPendingForce(false);
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={periodTitle} />
            <div className="relative flex flex-1 flex-col gap-8 overflow-x-hidden rounded-xl p-3 font-body text-[#1c1a17] dark:text-[#f7f3ee]">
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
                    <div className="flex flex-wrap items-center gap-2">
                        <PillButton
                            type="button"
                            onClick={() => handleTogglePin(false)}
                            tone={period.isPinned ? 'danger' : 'success'}
                            disabled={isPinning}
                            className="px-4 py-2"
                        >
                            {period.isPinned ? 'Открепить' : 'Закрепить'}
                        </PillButton>
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
                    className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] animate-reveal"
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
                    <div className="order-2 grid gap-4 lg:order-none">
                        <IncomeBlock
                            items={incomes}
                            setItems={setIncomes}
                            totalAmount={totalIncome}
                            onAdd={handleAddIncome}
                            onBlurField={handleSave}
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

                    <div className="order-1 grid gap-4 lg:order-none">
                        <div className="rounded-lg border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
                            <div className="flex items-center justify-between">
                                <BlockTitle>Дни периода</BlockTitle>
                                <PillButton
                                    type="button"
                                    onClick={() =>
                                        setIsEditingDates((prev) => !prev)
                                    }
                                    active={isEditingDates}
                                    activeTone="success"
                                    disabled={isReadOnly}
                                >
                                    {isEditingDates ? 'Готово' : 'Редактировать'}
                                </PillButton>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                                <div className="px-1 text-base font-semibold tabular-nums">
                                    {days}
                                </div>
                                <span className="text-xs text-[#6a5d52] dark:text-white/60">
                                    дней
                                </span>
                            </div>
                            {isEditingDates && (
                                <div className="mt-3 grid gap-2 grid-cols-2">
                                    <label className="grid gap-1 text-xs text-[#6a5d52] dark:text-white/60">
                                        Начало
                                        <input
                                            type="date"
                                            value={startDate}
                                            disabled={isReadOnly}
                                            onChange={(event) => {
                                                const nextValue =
                                                    event.target.value;
                                                setStartDate(nextValue);
                                                void handleSave(false, {
                                                    startDate: nextValue,
                                                });
                                            }}
                                            min={
                                                endDate
                                                    ? addMonthsClamp(endDate, -3)
                                                    : undefined
                                            }
                                            max={endDate}
                                            className="rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/10 sm:text-sm"
                                        />
                                    </label>
                                    <label className="grid gap-1 text-xs text-[#6a5d52] dark:text-white/60">
                                        Конец
                                        <input
                                            type="date"
                                            value={endDate}
                                            disabled={isReadOnly}
                                            onChange={(event) => {
                                                const nextValue =
                                                    event.target.value;
                                                setEndDate(nextValue);
                                                void handleSave(false, {
                                                    endDate: nextValue,
                                                });
                                            }}
                                            min={startDate}
                                            max={
                                                startDate
                                                    ? addMonthsClamp(startDate, 3)
                                                    : undefined
                                            }
                                            className="rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/10 sm:text-sm"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                        <Link
                            href={`/periods/${periodId}/daily`}
                            prefetch
                            className="group rounded-lg border border-[#1e7b4f]/30 bg-white/90 px-5 py-4 text-sm text-[#1c1a17] shadow-[0_24px_48px_-28px_rgba(30,123,79,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-30px_rgba(30,123,79,0.65)] dark:border-[#7ce0b3]/30 dark:bg-white/10 dark:text-white"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <BlockTitle>Ежедневные траты</BlockTitle>
                                <PillButton as="span">
                                    Перейти к дневным значениям
                                </PillButton>
                            </div>
                        </Link>
                        <div className="rounded-lg border border-black/10 bg-white/85 px-5 py-6 text-[#1c1a17] shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-[#1c1a17] dark:text-white dark:shadow-[0_20px_40px_-26px_rgba(0,0,0,0.7)]">
                            <BlockTitle>Планируемое среднее в день</BlockTitle>
                            <p className="mt-2 text-xs text-[#6a5d52] dark:text-white/60">
                                (Приход − обязательные) / дни
                            </p>
                            <BigDigit className="mt-3">
                                {formatCurrency(dailyAverage)}
                            </BigDigit>

                            <div className="mt-4 grid gap-3 text-xs text-[#6a5d52] dark:text-white/70">
                                <div className="h-px w-full bg-black/10 dark:bg-white/10" />
                                <BlockTitle>Планируемая сумма на период</BlockTitle>
                                <FormulaRow>
                                    <FormulaValue className="text-[#1e7b4f] dark:text-[#7ce0b3]">
                                        {formatCurrency(totalIncome)}
                                    </FormulaValue>
                                    <FormulaOp>−</FormulaOp>
                                    <FormulaValue className="text-[#b0352b] dark:text-[#ff8b7c]">
                                        {formatCurrency(totalPlannedExpenses)}
                                    </FormulaValue>
                                    <FormulaOp>=</FormulaOp>
                                    <FormulaValue
                                        className={`${
                                            plannedPeriodSum >= 0
                                                ? 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                                                : 'text-[#b0352b] dark:text-[#ff8b7c]'
                                        }`}
                                    >
                                        {formatSignedCurrency(plannedPeriodSum)}
                                    </FormulaValue>
                                </FormulaRow>

                                <div className="text-[11px] uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60">
                                    Приход − план = сумма в период
                                </div>
                            </div>
                        </div>
                        <div className="rounded-lg border border-black/10 bg-white/85 px-5 py-6 text-[#1c1a17] shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-[#1c1a17] dark:text-white dark:shadow-[0_20px_40px_-26px_rgba(0,0,0,0.7)]">
                            <BlockTitle tooltipText="Фактический остаток / количество незаполненных (непрошедших) дней">
                                Расчётное в день на оставшиеся дни
                            </BlockTitle>
                            <p className="mt-2 text-xs text-[#6a5d52] dark:text-white/60">
                                ({formatCurrency(actualRemaining)} / {remainingDays || 0} д.)
                            </p>
                            <BigDigit className="mt-3">
                                {formatCurrency(remainingDailyAverage)}
                            </BigDigit>
                        </div>
                        <div className="rounded-lg border border-black/10 bg-white/85 px-5 py-6 text-[#1c1a17] shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-[#1c1a17] dark:text-white dark:shadow-[0_20px_40px_-26px_rgba(0,0,0,0.7)]">
                            <BlockTitle
                                tooltipText="Планируемый остаток +/− фактическая разница − ежедневные траты за период."
                                tooltipAriaLabel="Формула фактического остатка"
                            >
                                Фактический остаток
                            </BlockTitle>
                            <FormulaRow className="mt-3">
                                <FormulaValue className="text-[#1e7b4f] dark:text-[#7ce0b3]">
                                    {formatCurrency(plannedPeriodSum)}
                                </FormulaValue>
                                <FormulaValue
                                    className={`${
                                        totalDifference > 0
                                            ? 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                                            : totalDifference < 0
                                              ? 'text-[#b0352b] dark:text-[#ff8b7c]'
                                              : 'text-[#6a5d52] dark:text-white/70'
                                    }`}
                                >
                                    {formatSignedCurrency(totalDifference).replace(
                                        /^([+−-])/, // add space after sign
                                        '$1 ',
                                    )}
                                </FormulaValue>
                                <FormulaOp>−</FormulaOp>
                                <FormulaValue className="text-[#b0352b] dark:text-[#ff8b7c]">
                                    {formatCurrency(totalDailyExpenses)}
                                </FormulaValue>
                                <FormulaOp>=</FormulaOp>
                                <FormulaValue
                                    className={`${
                                        plannedPeriodSum +
                                            totalDifference -
                                            totalDailyExpenses >=
                                        0
                                            ? 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                                            : 'text-[#b0352b] dark:text-[#ff8b7c]'
                                    }`}
                                >
                                    {formatSignedCurrency(
                                        plannedPeriodSum +
                                            totalDifference -
                                            totalDailyExpenses,
                                    )}
                                </FormulaValue>
                            </FormulaRow>
                            <div className="mt-4 h-px w-full bg-black/10 dark:bg-white/10" />
                            <BlockTitle className="mt-4">
                                Фактическое среднее в день за период
                            </BlockTitle>
                            <BigDigit className="mt-2">
                                {formatCurrency(dailyActualAverage)}
                            </BigDigit>
                        </div>
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
                        }}
                        onConfirm={() => handleSave(true)}
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
