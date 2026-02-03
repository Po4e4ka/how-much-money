import { Head, Link, usePage } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const delay = (ms: number) => ({ '--delay': `${ms}ms` } as CSSProperties);

type PeriodData = {
    id: string;
    title: string;
    subtitle: string;
    startDate: string;
    endDate: string;
    dailyExpenses: Record<string, number>;
};

const periodMocks: PeriodData[] = [
    {
        id: 'p3',
        title: '05.02 — 20.02',
        subtitle: '16 дней · Февраль 2026',
        startDate: '2026-02-05',
        endDate: '2026-02-20',
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

const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date) => {
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayIndex = (date.getDay() + 6) % 7;
    return `${dayNames[dayIndex]}, ${day}.${month}`;
};

const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const generateWeeklyBlocks = (start: string, end: string) => {
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

export default function PeriodDaily() {
    const { periodId } = usePage<{ periodId: string }>().props;
    const period = useMemo(
        () => periodMocks.find((item) => item.id === periodId) ?? periodMocks[0],
        [periodId],
    );

    const [dailyExpenses, setDailyExpenses] = useState<Record<string, number>>(
        period.dailyExpenses,
    );

    const days = useMemo(
        () => calculateDaysInclusive(period.startDate, period.endDate),
        [period.startDate, period.endDate],
    );
    const periodTitle = useMemo(
        () =>
            `${formatDateShort(period.startDate)} — ${formatDateShort(period.endDate)}`,
        [period.startDate, period.endDate],
    );
    const periodSubtitle = useMemo(
        () =>
            `${days} дней · ${formatMonthRange(
                period.startDate,
                period.endDate,
            )}`,
        [days, period.startDate, period.endDate],
    );
    const weeklyBlocks = useMemo(
        () => generateWeeklyBlocks(period.startDate, period.endDate),
        [period.startDate, period.endDate],
    );

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: dashboard().url,
        },
        {
            title: periodTitle,
            href: `/periods/${period.id}`,
        },
        {
            title: 'Ежедневные траты',
            href: `/periods/${period.id}/daily`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Ежедневные траты · ${periodTitle}`} />
            <div className="relative flex flex-1 flex-col gap-8 overflow-x-hidden rounded-xl p-6 font-body text-[#1c1a17] dark:text-[#f7f3ee]">
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-aurora opacity-35 dark:hidden" />
                <div className="pointer-events-none absolute inset-0 hidden rounded-3xl bg-aurora-night opacity-45 dark:block" />

                <section className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[#6a5d52] dark:text-white/60">
                            Ежедневные траты
                        </p>
                        <h1 className="mt-3 font-display text-3xl">
                            {periodTitle}
                        </h1>
                        <p className="mt-2 text-sm text-[#6a5d52] dark:text-white/70">
                            {periodSubtitle}
                        </p>
                    </div>
                    <Link
                        href={`/periods/${period.id}`}
                        className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs text-[#1c1a17] shadow-[0_16px_32px_-24px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white"
                    >
                        ← К периоду
                    </Link>
                </section>

                <section
                    className="relative z-10 grid gap-4 animate-reveal"
                    style={delay(120)}
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-sm:snap-y max-sm:snap-mandatory max-sm:overflow-y-auto max-sm:max-h-[calc(100vh-200px)] max-sm:pb-8 max-sm:pr-1">
                        {weeklyBlocks.map((block, index) => {
                            const isLast = index === weeklyBlocks.length - 1;
                            const blockTotal = block.reduce(
                                (sum, date) =>
                                    sum +
                                    (dailyExpenses[formatDateKey(date)] || 0),
                                0,
                            );
                            const filledDays = block.filter(
                                (date) =>
                                    dailyExpenses[formatDateKey(date)] !==
                                    undefined,
                            ).length;
                            const blockAverage =
                                filledDays > 0
                                    ? blockTotal / filledDays
                                    : 0;

                            return (
                                <div
                                    key={`${block[0]?.toISOString() ?? index}`}
                                    className={`rounded-2xl border border-black/10 bg-white/80 p-4 text-sm shadow-[0_18px_36px_-26px_rgba(28,26,23,0.5)] dark:border-white/10 dark:bg-white/10 max-sm:min-h-[calc(100vh-320px)] max-sm:snap-start max-sm:mb-2 ${
                                        isLast ? 'max-sm:mb-24' : ''
                                    }`}
                                >
                                    <div className="grid gap-3">
                                        {block.map((date) => {
                                            const key = formatDateKey(date);
                                            return (
                                                <div
                                                    key={key}
                                                    className="grid gap-2"
                                                >
                                                    <span className="text-xs text-[#6a5d52] dark:text-white/60">
                                                        {formatDateLabel(date)}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={
                                                            dailyExpenses[key] ??
                                                            ''
                                                        }
                                                        onChange={(event) =>
                                                            setDailyExpenses(
                                                                (prev) => {
                                                                    const next =
                                                                        {
                                                                            ...prev,
                                                                        };
                                                                    if (
                                                                        event
                                                                            .target
                                                                            .value ===
                                                                        ''
                                                                    ) {
                                                                        delete next[
                                                                            key
                                                                        ];
                                                                    } else {
                                                                        next[
                                                                            key
                                                                        ] =
                                                                            Number(
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            );
                                                                    }
                                                                    return next;
                                                                },
                                                            )
                                                        }
                                                        className="no-spin rounded-2xl border border-black/10 bg-white/90 px-3 py-2 text-sm text-right tabular-nums dark:border-white/10 dark:bg-white/10"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-black/10 bg-white/70 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/5">
                                        <span>Итого за неделю</span>
                                        <span className="font-display text-sm tabular-nums text-[#b0352b] dark:text-[#ff8b7c]">
                                            {formatCurrency(blockTotal)}
                                        </span>
                                        <span className="text-[#6a5d52] dark:text-white/60">
                                            Среднее в день
                                        </span>
                                        <span className="font-display text-sm tabular-nums">
                                            {formatCurrency(blockAverage)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
