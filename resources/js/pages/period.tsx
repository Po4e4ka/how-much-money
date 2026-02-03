import { Head, Link, usePage } from '@inertiajs/react';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { TooltipInfo } from '@/components/tooltip-info';

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
};

const emptyPeriod: PeriodData = {
    id: 0,
    startDate: '',
    endDate: '',
    incomes: [],
    expenses: [],
    offIncomeExpenses: [],
    dailyExpenses: {},
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
};

type IncomeBlockProps = {
    items: IncomeItem[];
    setItems: Dispatch<SetStateAction<IncomeItem[]>>;
    totalAmount: number;
    onAdd: () => void;
    onBlurField: () => void;
    invalidNameIds: string[];
};

const IncomeBlock = ({
    items,
    setItems,
    totalAmount,
    onAdd,
    onBlurField,
    invalidNameIds,
}: IncomeBlockProps) => (
    <div className="rounded-2xl border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-[#6a5d52] dark:text-white/60">
                Приход
            </p>
            <button
                type="button"
                onClick={onAdd}
                className="rounded-full border border-black/10 px-3 py-1 text-xs text-[#6a5d52] dark:border-white/10 dark:text-white/70"
            >
                + Строка
            </button>
        </div>
        <div className="mt-3 hidden grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)] items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60 sm:grid">
            <span>Название</span>
            <span className="text-right">Сумма</span>
        </div>
        <div className="mt-3 grid gap-2">
            {items.map((item, index) => (
                <div
                    key={item.id}
                    className="grid items-center gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)]"
                >
                    <input
                        type="text"
                        placeholder={`Приход ${index + 1}`}
                        value={item.name}
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
                        className={`rounded-2xl border bg-white/90 px-4 py-2 text-sm dark:bg-white/10 ${
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
                        className="no-spin rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm text-right tabular-nums dark:border-white/10 dark:bg-white/10"
                    />
                </div>
            ))}
        </div>
        <div className="mt-3 grid items-center gap-3 rounded-2xl border border-dashed border-black/10 bg-white/70 px-4 py-2 text-xs dark:border-white/10 dark:bg-white/5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)]">
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
}: ExpensesBlockProps) => (
    <div className="rounded-2xl border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-[#6a5d52] dark:text-white/60">
                {title}
            </p>
            <div className="flex items-center gap-2">
                <button
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
                    className="rounded-full border border-black/10 px-3 py-1 text-xs text-[#6a5d52] dark:border-white/10 dark:text-white/70"
                >
                    + Строка
                </button>
                <button
                    type="button"
                    onClick={onToggleDelete}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                        showDelete
                            ? 'border-[#b0352b]/40 text-[#b0352b] dark:border-[#ff8b7c]/40 dark:text-[#ff8b7c]'
                            : 'border-black/10 text-[#6a5d52] dark:border-white/10 dark:text-white/70'
                    }`}
                >
                    − Удаление
                </button>
            </div>
        </div>
        <div
            className={`mt-3 hidden items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60 sm:grid ${
                showDelete
                    ? 'grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]'
                    : 'grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]'
            }`}
        >
            <span>Название</span>
            <span className="text-right">План</span>
            <span className="text-right">Факт</span>
            <span className="text-right">Разница</span>
            {showDelete && <span className="text-center">—</span>}
        </div>
        <div className="mt-3 grid gap-2">
            {items.map((item, index) => (
                <div
                    key={item.id}
                    className={`grid items-center gap-3 ${
                        showDelete
                            ? 'sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]'
                            : 'sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]'
                    }`}
                >
                    <input
                        type="text"
                        placeholder={`Трата ${index + 1}`}
                        value={item.name}
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
                        className="rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/10"
                    />
                    <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={item.plannedAmount}
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
                        className="no-spin rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm text-right tabular-nums dark:border-white/10 dark:bg-white/10"
                    />
                    <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={item.actualAmount}
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
                        className="no-spin rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm text-right tabular-nums dark:border-white/10 dark:bg-white/10"
                    />
                    <div
                        className={`flex min-h-[40px] items-center justify-end px-4 py-2 text-sm tabular-nums ${
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
                        >
                            —
                        </button>
                    )}
                </div>
            ))}
        </div>
        <div
            className={`mt-3 grid items-center gap-3 rounded-2xl border border-dashed border-black/10 bg-white/70 px-4 py-2 text-xs dark:border-white/10 dark:bg-white/5 ${
                showDelete
                    ? 'sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]'
                    : 'sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]'
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
}: OffIncomeBlockProps) => (
    <div className="rounded-2xl border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#6a5d52] dark:text-white/60">
                <span>{title}</span>
                <TooltipInfo
                    text="Эти траты не учитываются в расчётах."
                    ariaLabel="Сторонние траты"
                />
            </div>
            <div className="flex items-center gap-2">
                <button
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
                    className="rounded-full border border-black/10 px-3 py-1 text-xs text-[#6a5d52] dark:border-white/10 dark:text-white/70"
                >
                    + Строка
                </button>
                <button
                    type="button"
                    onClick={onToggleDelete}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                        showDelete
                            ? 'border-[#b0352b]/40 text-[#b0352b] dark:border-[#ff8b7c]/40 dark:text-[#ff8b7c]'
                            : 'border-black/10 text-[#6a5d52] dark:border-white/10 dark:text-white/70'
                    }`}
                >
                    − Удаление
                </button>
            </div>
        </div>
        <div
            className={`mt-3 hidden items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60 sm:grid ${
                showDelete
                    ? 'grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_auto]'
                    : 'grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)]'
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
                    className={`grid items-center gap-3 ${
                        showDelete
                            ? 'sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_auto]'
                            : 'sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)]'
                    }`}
                >
                    <input
                        type="text"
                        placeholder={`Трата ${index + 1}`}
                        value={item.name}
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
                        className="rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/10"
                    />
                    <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={item.amount}
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
                        className="no-spin rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm text-right tabular-nums text-[#b0352b] dark:border-white/10 dark:bg-white/10 dark:text-[#ff8b7c]"
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
                        >
                            —
                        </button>
                    )}
                </div>
            ))}
        </div>
        <div
            className={`mt-3 grid items-center gap-3 rounded-2xl border border-dashed border-black/10 bg-white/70 px-4 py-2 text-xs dark:border-white/10 dark:bg-white/5 ${
                showDelete
                    ? 'sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_auto]'
                    : 'sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)]'
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
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [invalidIncomeIds, setInvalidIncomeIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const pendingSaveRef = useRef(false);
    const [saveTick, setSaveTick] = useState(0);
    const incomeNameError = 'Заполните названия прихода.';

    const cacheKey = useMemo(() => `period:${periodId}`, [periodId]);
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
    const dailyActualAverage = days > 0 ? totalDailyExpenses / days : 0;
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
        if (hasFetchedRef.current) {
            return;
        }

        const cached = readCache();
        if (hasFullCache(cached)) {
            hasFetchedRef.current = true;
            setPeriod(cached);
            setIncomes(cached.incomes ?? []);
            setStartDate(cached.startDate ?? '');
            setEndDate(cached.endDate ?? '');
            setExpenses(cached.expenses ?? []);
            setOffIncomeExpenses(cached.offIncomeExpenses ?? []);
            setDailyExpenses(cached.dailyExpenses ?? {});
            setIsLoading(false);
            return;
        }

        hasFetchedRef.current = true;
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
            writeCache(normalized);
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
                    start_date: startDate,
                    end_date: endDate,
                    daily_expenses: dailyExpenses,
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
                throw new Error('Период пересекается с существующим.');
            }

            if (!response.ok) {
                throw new Error('Не удалось сохранить период.');
            }

            setSaveSuccess(true);
            writeCache({
                id: Number(periodId),
                startDate,
                endDate,
                incomes,
                expenses,
                offIncomeExpenses,
                dailyExpenses,
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

    useEffect(() => {
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
            <div className="relative flex flex-1 flex-col gap-8 overflow-x-hidden rounded-xl p-6 font-body text-[#1c1a17] dark:text-[#f7f3ee]">
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
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="rounded-full border border-[#b0352b]/40 bg-white/80 px-4 py-2 text-xs text-[#b0352b] shadow-[0_16px_32px_-24px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#ff8b7c]/40 dark:bg-white/10 dark:text-[#ff8b7c]"
                        >
                            Удалить
                        </button>
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
                        <div className="col-span-full rounded-2xl border border-black/10 bg-white/70 px-5 py-4 text-sm text-[#6a5d52] dark:border-white/10 dark:bg-white/10 dark:text-white/70">
                            Загружаем период...
                        </div>
                    )}
                    {loadError && (
                        <div className="col-span-full rounded-2xl border border-black/10 bg-white/70 px-5 py-4 text-sm text-[#b0352b] dark:border-white/10 dark:bg-white/10 dark:text-[#ff8b7c]">
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
                        />
                    </div>

                    <div className="order-1 grid gap-4 lg:order-none">
                        <div className="rounded-2xl border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
                            <div className="flex items-center justify-between">
                                <p className="text-xs uppercase tracking-[0.3em] text-[#6a5d52] dark:text-white/60">
                                    Дни периода
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsEditingDates((prev) => !prev)
                                    }
                                    className={`rounded-full border px-3 py-1 text-xs transition ${
                                        isEditingDates
                                            ? 'border-[#1e7b4f]/40 text-[#1e7b4f] dark:border-[#7ce0b3]/40 dark:text-[#7ce0b3]'
                                            : 'border-black/10 text-[#6a5d52] dark:border-white/10 dark:text-white/70'
                                    }`}
                                >
                                    {isEditingDates ? 'Готово' : 'Редактировать'}
                                </button>
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
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    <label className="grid gap-1 text-xs text-[#6a5d52] dark:text-white/60">
                                        Начало
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(event) =>
                                                setStartDate(event.target.value)
                                            }
                                            onBlur={handleSave}
                                            max={endDate}
                                            className="rounded-2xl border border-black/10 bg-white/90 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10"
                                        />
                                    </label>
                                    <label className="grid gap-1 text-xs text-[#6a5d52] dark:text-white/60">
                                        Конец
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(event) =>
                                                setEndDate(event.target.value)
                                            }
                                            onBlur={handleSave}
                                            min={startDate}
                                            className="rounded-2xl border border-black/10 bg-white/90 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                        <Link
                            href={`/periods/${periodId}/daily`}
                            prefetch
                            className="rounded-2xl border border-black/10 bg-white/80 px-5 py-4 text-sm text-[#1c1a17] shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white"
                        >
                            <p className="text-xs uppercase tracking-[0.3em] text-[#6a5d52] dark:text-white/60">
                                Ежедневные траты
                            </p>
                            <p className="mt-2 text-sm text-[#6a5d52] dark:text-white/70">
                                Перейти к дневным значениям
                            </p>
                        </Link>
                        <div className="rounded-2xl border border-black/10 bg-white/85 px-5 py-6 text-[#1c1a17] shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-[#1c1a17] dark:text-white dark:shadow-[0_20px_40px_-26px_rgba(0,0,0,0.7)]">
                            <p className="text-xs uppercase tracking-[0.3em] text-[#6a5d52] dark:text-white/60">
                                Планируемое среднее в день
                            </p>
                            <p className="mt-2 text-xs text-[#6a5d52] dark:text-white/60">
                                (Приход − обязательные) / дни
                            </p>
                            <p className="mt-3 font-display text-2xl">
                                {formatCurrency(dailyAverage)}
                            </p>

                            <div className="mt-4 grid gap-3 text-xs text-[#6a5d52] dark:text-white/70">
                                <div className="h-px w-full bg-black/10 dark:bg-white/10" />
                                <p className="text-xs uppercase tracking-[0.3em] text-[#6a5d52] dark:text-white/60">
                                    Планируемая сумма на период
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                                    <span className="font-display tabular-nums text-[#1e7b4f] dark:text-[#7ce0b3]">
                                        {formatCurrency(totalIncome)}
                                    </span>
                                    <span className="text-black/50 dark:text-white/60">−</span>
                                    <span className="font-display tabular-nums text-[#b0352b] dark:text-[#ff8b7c]">
                                        {formatCurrency(totalPlannedExpenses)}
                                    </span>
                                    <span className="text-black/50 dark:text-white/60">=</span>
                                    <span
                                        className={`font-display tabular-nums ${
                                            plannedPeriodSum >= 0
                                                ? 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                                                : 'text-[#b0352b] dark:text-[#ff8b7c]'
                                        }`}
                                    >
                                        {formatSignedCurrency(plannedPeriodSum)}
                                    </span>
                                </div>

                                <div className="text-[11px] uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60">
                                    Приход − план = сумма в период
                                </div>
                                <div className="h-px w-full bg-black/10 dark:bg-white/10" />
                                <p className="text-xs uppercase tracking-[0.3em] text-[#6a5d52] dark:text-white/60">
                                    <span>Фактический остаток</span>
                                    <span className="ml-2 inline-flex align-middle">
                                        <TooltipInfo
                                            text="Планируемый остаток +/− фактическая разница − ежедневные траты за период."
                                            ariaLabel="Формула фактического остатка"
                                        />
                                    </span>
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
                                    <span className="font-display tabular-nums text-[#1e7b4f] dark:text-[#7ce0b3]">
                                        {formatCurrency(plannedPeriodSum)}
                                    </span>
                                    <span
                                        className={`font-display tabular-nums ${
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
                                    </span>
                                    <span className="text-black/50 dark:text-white/60">−</span>
                                    <span className="font-display tabular-nums text-[#b0352b] dark:text-[#ff8b7c]">
                                        {formatCurrency(totalDailyExpenses)}
                                    </span>
                                    <span className="text-black/50 dark:text-white/60">=</span>
                                    <span
                                        className={`font-display tabular-nums ${
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
                                    </span>
                                </div>
                                <div clasтулsName="h-px w-full bg-black/10 dark:bg-white/10" />
                                <p className="text-xs uppercase tracking-[0.3em] text-[#6a5d52] dark:text-white/60">
                                    Фактическое среднее в день за период
                                </p>
                                <div className="mt-2 font-display text-2xl">
                                    {formatCurrency(dailyActualAverage)}
                                </div>

                            </div>
                        </div>
                    </div>
                </section>

                {saveError && (
                    <div className="relative z-10 rounded-2xl border border-black/10 bg-white/70 px-5 py-3 text-xs text-[#b0352b] dark:border-white/10 dark:bg-white/10 dark:text-[#ff8b7c]">
                        {saveError}
                    </div>
                )}

            </div>
        </AppLayout>
    );
}
