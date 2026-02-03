import { Head, Link, usePage } from '@inertiajs/react';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const delay = (ms: number) => ({ '--delay': `${ms}ms` } as CSSProperties);

type ExpenseItem = {
    id: string;
    name: string;
    plannedAmount: number;
    actualAmount: number;
};

type OffIncomeItem = {
    id: string;
    name: string;
    amount: number;
};

type IncomeItem = {
    id: string;
    name: string;
    amount: number;
};

type PeriodData = {
    id: string;
    title: string;
    subtitle: string;
    startDate: string;
    endDate: string;
    incomes: IncomeItem[];
    expenses: ExpenseItem[];
    offIncomeExpenses: OffIncomeItem[];
    dailyExpenses: Record<string, number>;
};

const periodMocks: PeriodData[] = [
    {
        id: 'p3',
        title: '05.02 — 20.02',
        subtitle: '16 дней · Февраль 2026',
        startDate: '2026-02-05',
        endDate: '2026-02-20',
        incomes: [
            { id: 'i31', name: 'Основной приход', amount: 1200000 },
            { id: 'i32', name: 'Доп. услуги', amount: 220000 },
        ],
        expenses: [
            {
                id: 'e31',
                name: 'Команда',
                plannedAmount: 320000,
                actualAmount: 310000,
            },
            {
                id: 'e32',
                name: 'Сервисы и софт',
                plannedAmount: 60000,
                actualAmount: 65000,
            },
        ],
        offIncomeExpenses: [
            {
                id: 'o31',
                name: 'Разовые покупки',
                amount: 52000,
            },
        ],
        dailyExpenses: {
            '2026-02-05': 12000,
            '2026-02-06': 18000,
            '2026-02-07': 9000,
            '2026-02-08': 15000,
            '2026-02-10': 22000,
        },
    },
    {
        id: 'p2',
        title: '20.01 — 04.02',
        subtitle: '16 дней · Янв–Фев 2026',
        startDate: '2026-01-20',
        endDate: '2026-02-04',
        incomes: [
            { id: 'i21', name: 'Контракт', amount: 900000 },
            { id: 'i22', name: 'Партнёрка', amount: 280000 },
        ],
        expenses: [
            {
                id: 'e21',
                name: 'Аренда',
                plannedAmount: 280000,
                actualAmount: 280000,
            },
            {
                id: 'e22',
                name: 'Маркетинг',
                plannedAmount: 140000,
                actualAmount: 155000,
            },
        ],
        offIncomeExpenses: [
            {
                id: 'o21',
                name: 'Переезд',
                amount: 78000,
            },
        ],
        dailyExpenses: {
            '2026-01-20': 14000,
            '2026-01-21': 16000,
            '2026-01-23': 12000,
            '2026-01-27': 19000,
            '2026-02-01': 13000,
        },
    },
    {
        id: 'p1',
        title: '05.01 — 20.01',
        subtitle: '16 дней · Январь 2026',
        startDate: '2026-01-05',
        endDate: '2026-01-20',
        incomes: [
            { id: 'i11', name: 'Подписки', amount: 640000 },
            { id: 'i12', name: 'Разовые', amount: 340000 },
        ],
        expenses: [
            {
                id: 'e11',
                name: 'Операционные',
                plannedAmount: 220000,
                actualAmount: 215000,
            },
            {
                id: 'e12',
                name: 'Подписки',
                plannedAmount: 40000,
                actualAmount: 38000,
            },
        ],
        offIncomeExpenses: [
            {
                id: 'o11',
                name: 'Форс-мажор',
                amount: 12000,
            },
        ],
        dailyExpenses: {
            '2026-01-05': 9000,
            '2026-01-06': 11000,
            '2026-01-10': 7000,
            '2026-01-15': 8000,
            '2026-01-19': 12000,
        },
    },
];

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
};

type IncomeBlockProps = {
    items: IncomeItem[];
    setItems: Dispatch<SetStateAction<IncomeItem[]>>;
    totalAmount: number;
    idPrefix: string;
};

const IncomeBlock = ({
    items,
    setItems,
    totalAmount,
    idPrefix,
}: IncomeBlockProps) => (
    <div className="rounded-2xl border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-[#6a5d52] dark:text-white/60">
                Приход
            </p>
            <button
                type="button"
                onClick={() =>
                    setItems((prev) => [
                        ...prev,
                        {
                            id: `${idPrefix}${Date.now()}`,
                            name: '',
                            amount: 0,
                        },
                    ])
                }
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
                        className="rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/10"
                    />
                    <input
                        type="number"
                        min={0}
                        value={item.amount}
                        onChange={(event) =>
                            setItems((prev) =>
                                prev.map((income) =>
                                    income.id === item.id
                                        ? {
                                              ...income,
                                              amount: Number(
                                                  event.target.value,
                                              ),
                                          }
                                        : income,
                                ),
                            )
                        }
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
                                plannedAmount: 0,
                                actualAmount: 0,
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
                        className="rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/10"
                    />
                    <input
                        type="number"
                        min={0}
                        value={item.plannedAmount}
                        onChange={(event) =>
                            setItems((prev) =>
                                prev.map((expense) =>
                                    expense.id === item.id
                                        ? {
                                              ...expense,
                                              plannedAmount: Number(
                                                  event.target.value,
                                              ),
                                          }
                                        : expense,
                                ),
                            )
                        }
                        className="no-spin rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm text-right tabular-nums dark:border-white/10 dark:bg-white/10"
                    />
                    <input
                        type="number"
                        min={0}
                        value={item.actualAmount}
                        onChange={(event) =>
                            setItems((prev) =>
                                prev.map((expense) =>
                                    expense.id === item.id
                                        ? {
                                              ...expense,
                                              actualAmount: Number(
                                                  event.target.value,
                                              ),
                                          }
                                        : expense,
                                ),
                            )
                        }
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
}: OffIncomeBlockProps) => (
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
                                amount: 0,
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
                        className="rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/10"
                    />
                    <input
                        type="number"
                        min={0}
                        value={item.amount}
                        onChange={(event) =>
                            setItems((prev) =>
                                prev.map((expense) =>
                                    expense.id === item.id
                                        ? {
                                              ...expense,
                                              amount: Number(event.target.value),
                                          }
                                        : expense,
                                ),
                            )
                        }
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
    const period = useMemo(
        () => periodMocks.find((item) => item.id === periodId) ?? periodMocks[0],
        [periodId],
    );

    const [incomes, setIncomes] = useState(period.incomes);
    const [startDate, setStartDate] = useState(period.startDate);
    const [endDate, setEndDate] = useState(period.endDate);
    const [expenses, setExpenses] = useState(period.expenses);
    const [offIncomeExpenses, setOffIncomeExpenses] = useState(
        period.offIncomeExpenses,
    );
    const [showDelete, setShowDelete] = useState(false);
    const [isEditingDates, setIsEditingDates] = useState(false);

    const totalPlannedExpenses = expenses.reduce(
        (sum, item) => sum + (item.plannedAmount || 0),
        0,
    );
    const totalActualExpenses = expenses.reduce(
        (sum, item) => sum + (item.actualAmount || 0),
        0,
    );
    const totalDifference = totalPlannedExpenses - totalActualExpenses;
    const totalOffIncome = offIncomeExpenses.reduce(
        (sum, item) => sum + (item.amount || 0),
        0,
    );
    const totalIncome = incomes.reduce(
        (sum, item) => sum + (item.amount || 0),
        0,
    );
    const days = useMemo(
        () => calculateDaysInclusive(startDate, endDate),
        [startDate, endDate],
    );
    const totalDailyExpenses = useMemo(
        () =>
            Object.values(period.dailyExpenses).reduce(
                (sum, value) => sum + (value || 0),
                0,
            ),
        [period.dailyExpenses],
    );
    const dailyActualAverage = days > 0 ? totalDailyExpenses / days : 0;
    const periodTitle = useMemo(
        () => `${formatDateShort(startDate)} — ${formatDateShort(endDate)}`,
        [startDate, endDate],
    );
    const periodSubtitle = useMemo(
        () => `${days} дней · ${formatMonthRange(startDate, endDate)}`,
        [days, startDate, endDate],
    );
    const dailyAverage =
        days > 0 ? (totalIncome - totalActualExpenses) / days : 0;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: dashboard().url,
        },
        {
            title: period.title,
            href: `/periods/${period.id}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={period.title} />
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
                    <Link
                        href={dashboard()}
                        className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs text-[#1c1a17] shadow-[0_16px_32px_-24px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white"
                    >
                        ← Ко всем периодам
                    </Link>
                </section>

                <section
                    className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] animate-reveal"
                    style={delay(120)}
                >
                    <div className="order-2 grid gap-4 lg:order-none">
                        <IncomeBlock
                            items={incomes}
                            setItems={setIncomes}
                            totalAmount={totalIncome}
                            idPrefix="i"
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
                            <Link
                                href={`/periods/${period.id}/daily`}
                                className="mt-4 block w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-center text-sm font-semibold text-[#1c1a17] shadow-[0_16px_32px_-24px_rgba(28,26,23,0.5)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white"
                            >
                                Ежедневные траты
                            </Link>
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
                                            min={startDate}
                                            className="rounded-2xl border border-black/10 bg-white/90 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                        <div className="rounded-2xl border border-black/10 bg-[#1c1a17] px-5 py-6 text-white shadow-[0_20px_40px_-26px_rgba(0,0,0,0.7)]">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                                Среднее в день
                            </p>
                            <p className="mt-2 text-xs text-white/60">
                                (Приход − обязательные) / дни
                            </p>
                            <p className="mt-3 font-display text-2xl">
                                {formatCurrency(dailyAverage)}
                            </p>
                            <div className="mt-4 grid gap-2 text-xs text-white/70">
                                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                                    <span className="font-display tabular-nums text-[#7ce0b3]">
                                        {formatCurrency(totalIncome)}
                                    </span>
                                    <span className="text-white/60">−</span>
                                    <span className="font-display tabular-nums text-[#ff8b7c]">
                                        {formatCurrency(totalActualExpenses)}
                                    </span>
                                    <span className="text-white/60">=</span>
                                    <span
                                        className={`font-display tabular-nums ${
                                            totalIncome - totalActualExpenses >=
                                            0
                                                ? 'text-[#7ce0b3]'
                                                : 'text-[#ff8b7c]'
                                        }`}
                                    >
                                        {formatSignedCurrency(
                                            totalIncome - totalActualExpenses,
                                        )}
                                    </span>
                                </div>
                                <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                                    Приход − траты = сумма в период
                                </div>
                                <div className="mt-4 text-xs text-white/70">
                                    Факт среднее в день:{' '}
                                    <span className="font-display text-sm tabular-nums text-white">
                                        {formatCurrency(dailyActualAverage)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </AppLayout>
    );
}
