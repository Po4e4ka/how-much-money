import { Head, Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

const delay = (ms: number) => ({ '--delay': `${ms}ms` } as CSSProperties);

const periods = [
    {
        id: 'p3',
        title: '05.02 — 20.02',
        subtitle: '16 дней · Февраль 2026',
    },
    {
        id: 'p2',
        title: '20.01 — 04.02',
        subtitle: '16 дней · Янв–Фев 2026',
    },
    {
        id: 'p1',
        title: '05.01 — 20.01',
        subtitle: '16 дней · Январь 2026',
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="relative flex flex-1 flex-col gap-8 overflow-x-hidden rounded-xl p-6 font-body text-[#1c1a17] dark:text-[#f7f3ee]">
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-aurora opacity-35 dark:hidden" />
                <div className="pointer-events-none absolute inset-0 hidden rounded-3xl bg-aurora-night opacity-45 dark:block" />

                <section className="relative z-10 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[#6a5d52] dark:text-white/60">
                            Финансовый контур
                        </p>
                        <h1 className="mt-3 font-display text-3xl">
                            Периоды учета
                        </h1>
                        <p className="mt-2 max-w-xl text-sm text-[#6a5d52] dark:text-white/70">
                            Добавьте новый период сверху и управляйте историей ниже.
                            При клике откроется отдельная страница периода.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white/80 px-5 py-3 text-xs text-[#6a5d52] shadow-[0_16px_32px_-24px_rgba(28,26,23,0.6)] backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-white/70">
                        Последнее обновление: 02.02.2026
                    </div>
                </section>

                <section
                    className="relative z-10 rounded-[28px] border border-black/10 bg-white/85 p-6 shadow-[0_22px_44px_-28px_rgba(28,26,23,0.6)] backdrop-blur animate-reveal dark:border-white/10 dark:bg-white/10"
                    style={delay(120)}
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.4em] text-[#6a5d52] dark:text-white/60">
                                Новый период
                            </p>
                            <h2 className="mt-2 font-display text-2xl">
                                Добавить диапазон дат
                            </h2>
                        </div>
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <label className="flex flex-col gap-2 text-xs text-[#6a5d52] dark:text-white/70">
                            С
                            <input
                                type="date"
                                className="date-input rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-[#1c1a17] outline-none transition focus:border-black/30 dark:border-white/10 dark:bg-white/10 dark:text-white"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-[#6a5d52] dark:text-white/70">
                            По
                            <input
                                type="date"
                                className="date-input rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-[#1c1a17] outline-none transition focus:border-black/30 dark:border-white/10 dark:bg-white/10 dark:text-white"
                            />
                        </label>
                        <div className="flex flex-col justify-end">
                            <button
                                className="rounded-2xl bg-[#d87a4a] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(216,122,74,0.8)] transition hover:-translate-y-0.5"
                                type="button"
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </section>

                <section
                    className="relative z-10 grid gap-4 animate-reveal"
                    style={delay(240)}
                >
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-2xl">История периодов</h2>
                        <span className="text-xs text-[#6a5d52] dark:text-white/60">
                            Сначала новые
                        </span>
                    </div>
                    <div className="grid gap-4">
                        {periods.map((period) => (
                            <Link
                                key={period.id}
                                href={`/periods/${period.id}`}
                                className="rounded-[28px] border border-black/10 bg-white/70 p-5 text-left shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-display text-xl">
                                            {period.title}
                                        </h3>
                                        <p className="mt-1 text-xs text-[#6a5d52] dark:text-white/70">
                                            {period.subtitle}
                                        </p>
                                    </div>
                                    <span className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs text-[#1c1a17] dark:border-white/10 dark:bg-white/10 dark:text-white">
                                        Открыть период
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
