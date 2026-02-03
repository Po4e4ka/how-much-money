import { Head, Link, usePage } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const delay = (ms: number) => ({ '--delay': `${ms}ms` } as CSSProperties);

type PeriodData = {
    id: number;
    startDate: string;
    endDate: string;
    dailyExpenses: Record<string, number>;
};

const emptyPeriod: PeriodData = {
    id: 0,
    startDate: '',
    endDate: '',
    dailyExpenses: {},
};

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

const toIntegerValue = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits === '') {
        return '';
    }
    return Number(digits);
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
    const [period, setPeriod] = useState<PeriodData>(emptyPeriod);
    const [dailyExpenses, setDailyExpenses] = useState<Record<string, number>>(
        {},
    );
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const pendingSaveRef = useRef(false);

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
        win.__periodCache[cacheKey] = {
            ...(win.__periodCache[cacheKey] ?? {}),
            ...data,
        };
    };

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
    const weeklyBlocks = useMemo(() => {
        if (!period.startDate || !period.endDate) {
            return [];
        }
        return generateWeeklyBlocks(period.startDate, period.endDate);
    }, [period.startDate, period.endDate]);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: dashboard().url,
        },
        {
            title: periodTitle,
            href: `/periods/${periodId}`,
        },
        {
            title: 'Ежедневные траты',
            href: `/periods/${periodId}/daily`,
        },
    ];

    const fetchPeriod = async () => {
        if (hasFetchedRef.current) {
            return;
        }

        const cached = readCache();
        if (cached && cached.id) {
            hasFetchedRef.current = true;
            setPeriod(cached);
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
                };
            };
            const data = payload.data;
            setPeriod({
                id: data.id,
                startDate: data.start_date,
                endDate: data.end_date,
                dailyExpenses: data.daily_expenses ?? {},
            });
            setDailyExpenses(data.daily_expenses ?? {});
            writeCache({
                id: data.id,
                startDate: data.start_date,
                endDate: data.end_date,
                dailyExpenses: data.daily_expenses ?? {},
            });
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
                    daily_expenses: dailyExpenses,
                }),
            });

            if (!response.ok) {
                throw new Error('Не удалось сохранить ежедневные траты.');
            }

            setSaveSuccess(true);
            writeCache({
                id: period.id,
                startDate: period.startDate,
                endDate: period.endDate,
                dailyExpenses,
            });
        } catch (err) {
            setSaveError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось сохранить ежедневные траты.',
            );
        } finally {
            setIsSaving(false);
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

    return (
        <AppLayout breadcrumbs={breadcrumbs} hideBreadcrumbsOnMobile>
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
                        href={`/periods/${periodId}`}
                        prefetch
                        className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs text-[#1c1a17] shadow-[0_16px_32px_-24px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white"
                    >
                        ← К периоду
                    </Link>
                </section>

                <section
                    className="relative z-10 grid gap-4 animate-reveal"
                    style={delay(120)}
                >
                    {isLoading && (
                        <div className="rounded-2xl border border-black/10 bg-white/70 px-5 py-4 text-sm text-[#6a5d52] dark:border-white/10 dark:bg-white/10 dark:text-white/70">
                            Загружаем период...
                        </div>
                    )}
                    {loadError && (
                        <div className="rounded-2xl border border-black/10 bg-white/70 px-5 py-4 text-sm text-[#b0352b] dark:border-white/10 dark:bg-white/10 dark:text-[#ff8b7c]">
                            {loadError}
                        </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-sm:snap-y max-sm:snap-mandatory max-sm:overflow-y-auto max-sm:max-h-[calc(100vh-190px)] max-sm:pb-8 max-sm:pr-1">
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
                                    className={`rounded-2xl border border-black/10 bg-white/80 p-4 text-sm shadow-[0_18px_36px_-26px_rgba(28,26,23,0.5)] dark:border-white/10 dark:bg-white/10 max-sm:min-h-[calc(100vh-315px)] max-sm:snap-start max-sm:mb-2 max-sm:p-3 ${
                                        isLast ? 'max-sm:mb-24' : ''
                                    }`}
                                >
                                    <div className="flex h-full flex-col gap-4">
                                        <div className="flex-1">
                                            <div className="grid gap-3 max-sm:gap-2">
                                                {block.map((date) => {
                                                    const key = formatDateKey(date);
                                                    return (
                                                        <div
                                                            key={key}
                                                            className="grid gap-2 max-sm:flex max-sm:items-center max-sm:justify-between"
                                                        >
                                                            <span className="text-xs text-[#6a5d52] dark:text-white/60">
                                                                {formatDateLabel(
                                                                    date,
                                                                )}
                                                            </span>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                step={1}
                                                                inputMode="numeric"
                                                                value={
                                                                    dailyExpenses[
                                                                        key
                                                                    ] ?? ''
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setDailyExpenses(
                                                                        (
                                                                            prev,
                                                                        ) => {
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
                                                                                    toIntegerValue(
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                    ) ||
                                                                                    0;
                                                                            }
                                                                            return next;
                                                                        },
                                                                    )
                                                                }
                                                                onFocus={() => {
                                                                    if (
                                                                        dailyExpenses[
                                                                            key
                                                                        ] === 0
                                                                    ) {
                                                                        setDailyExpenses(
                                                                            (
                                                                                prev,
                                                                            ) => {
                                                                                const next =
                                                                                    {
                                                                                        ...prev,
                                                                                    };
                                                                                delete next[
                                                                                    key
                                                                                ];
                                                                                return next;
                                                                            },
                                                                        );
                                                                    }
                                                                }}
                                                                onBlur={handleSave}
                                                                className="no-spin rounded-2xl border border-black/10 bg-white/90 px-3 py-2 text-sm text-right tabular-nums dark:border-white/10 dark:bg-white/10 max-sm:w-[70%] max-sm:px-2 max-sm:py-2 max-sm:text-xs"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-black/10 bg-white/70 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/5 max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:items-center max-sm:gap-y-1 max-sm:px-2 max-sm:py-2">
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
                                </div>
                            );
                        })}
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
