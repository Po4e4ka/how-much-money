import { Head, Link, usePage } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import { dashboard, login, register } from '@/routes';
import type { SharedData } from '@/types';

const delay = (ms: number) => ({ '--delay': `${ms}ms` } as CSSProperties);

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;

    const primaryHref = auth.user
        ? dashboard()
        : canRegister
          ? register()
          : login();
    const primaryLabel = auth.user
        ? 'Перейти в кабинет'
        : canRegister
          ? 'Создать аккаунт'
          : 'Войти в систему';
    const secondaryHref = auth.user ? dashboard() : login();
    const secondaryLabel = auth.user ? 'Открыть дашборд' : 'Смотреть демо';

    return (
        <>
            <Head title="Aurora Studio">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=space-grotesk:400,500,600,700|fraunces:400,600,700"
                    rel="stylesheet"
                />
            </Head>
            <div
                className="relative min-h-screen overflow-hidden bg-[#f8f4ef] text-[color:var(--ink)] dark:bg-[#0f0d0b] dark:text-[#f7f3ee]"
                style={
                    {
                        '--ink': '#1c1a17',
                        '--ink-soft': '#5b5148',
                        '--accent': '#d87a4a',
                        '--accent-2': '#3b7c74',
                        '--accent-3': '#6a5ab5',
                        '--paper': '#f8f4ef',
                    } as CSSProperties
                }
            >
                <div className="pointer-events-none absolute inset-0 bg-aurora opacity-80 dark:hidden" />
                <div className="pointer-events-none absolute inset-0 hidden bg-aurora-night opacity-90 dark:block" />
                <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 dark:hidden" />
                <div className="pointer-events-none absolute inset-0 hidden bg-grid-night opacity-30 dark:block" />

                <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-10 font-body lg:px-12">
                    <header className="flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-white shadow-[0_12px_24px_-14px_rgba(216,122,74,0.8)]">
                                <span className="font-display text-xl">A</span>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-soft)] dark:text-white/70">
                                    Aurora Studio
                                </p>
                                <p className="font-display text-lg">
                                    Ателье цифровых продуктов
                                </p>
                            </div>
                        </div>
                        <nav className="flex items-center gap-3 text-sm">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-[color:var(--ink)] shadow-[0_12px_24px_-18px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="rounded-full border border-transparent px-4 py-2 text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)] dark:text-white/70 dark:hover:text-white"
                                    >
                                        Log in
                                    </Link>
                                    {canRegister && (
                                        <Link
                                            href={register()}
                                            className="rounded-full border border-black/10 bg-black px-4 py-2 text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.7)] transition hover:-translate-y-0.5 hover:bg-black/90 dark:border-white/10 dark:bg-white dark:text-[#0f0d0b]"
                                        >
                                            Register
                                        </Link>
                                    )}
                                </>
                            )}
                        </nav>
                    </header>

                    <main className="mt-16 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                        <section className="space-y-8">
                            <div
                                className="animate-reveal flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-[color:var(--ink-soft)] dark:text-white/70"
                                style={delay(100)}
                            >
                                <span className="h-px w-10 bg-[color:var(--accent)]" />
                                Современный бренд-движок
                            </div>
                            <div className="space-y-6">
                                <h1
                                    className="animate-reveal font-display text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl"
                                    style={delay(180)}
                                >
                                    Превращаем идеи в эстетику, которую хочется трогать.
                                </h1>
                                <p
                                    className="animate-reveal max-w-xl text-base text-[color:var(--ink-soft)] dark:text-white/70 sm:text-lg"
                                    style={delay(260)}
                                >
                                    Сочетаем стратегию, UX и инженерную точность в один поток.
                                    Запускаем продукт за недели, а не за кварталы, и держим
                                    фокус на эмоциях пользователя.
                                </p>
                            </div>
                            <div
                                className="animate-reveal flex flex-wrap items-center gap-4"
                                style={delay(340)}
                            >
                                <Link
                                    href={primaryHref}
                                    className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_-16px_rgba(216,122,74,0.9)] transition hover:-translate-y-0.5 hover:bg-[color:var(--accent)]/90"
                                >
                                    {primaryLabel}
                                </Link>
                                <Link
                                    href={secondaryHref}
                                    className="rounded-full border border-black/10 bg-white/70 px-6 py-3 text-sm font-semibold text-[color:var(--ink)] shadow-[0_16px_32px_-18px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white"
                                >
                                    {secondaryLabel}
                                </Link>
                                <div className="flex items-center gap-3 text-xs text-[color:var(--ink-soft)] dark:text-white/70">
                                    <span className="flex h-2 w-2 rounded-full bg-[color:var(--accent-2)]" />
                                    12 запусков за 2025
                                </div>
                            </div>
                            <div
                                className="animate-reveal grid gap-4 sm:grid-cols-3"
                                style={delay(420)}
                            >
                                {[
                                    {
                                        title: 'Стратегия',
                                        text: 'Фокус на смыслах, позиционировании и цельном голосе.',
                                    },
                                    {
                                        title: 'Дизайн',
                                        text: 'Системный визуал, который выдерживает масштаб.',
                                    },
                                    {
                                        title: 'Разработка',
                                        text: 'Сборка на Laravel + React, стабильная и быстрая.',
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.title}
                                        className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm shadow-[0_12px_24px_-18px_rgba(28,26,23,0.6)] backdrop-blur dark:border-white/10 dark:bg-white/10"
                                    >
                                        <p className="font-display text-base">
                                            {item.title}
                                        </p>
                                        <p className="mt-2 text-[color:var(--ink-soft)] dark:text-white/70">
                                            {item.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="relative animate-reveal" style={delay(220)}>
                            <div className="absolute -left-4 -top-6 h-24 w-24 rounded-full opacity-80 blur-2xl animate-float-slow" style={{ background: 'radial-gradient(circle, rgba(216,122,74,0.7), rgba(216,122,74,0))' }} />
                            <div className="absolute right-6 top-10 h-28 w-28 rounded-full opacity-70 blur-2xl animate-float" style={{ background: 'radial-gradient(circle, rgba(59,124,116,0.7), rgba(59,124,116,0))' }} />
                            <div className="absolute -bottom-8 right-16 h-32 w-32 rounded-full opacity-70 blur-2xl animate-float-slow" style={{ background: 'radial-gradient(circle, rgba(106,90,181,0.6), rgba(106,90,181,0))' }} />

                            <div className="relative rounded-[32px] border border-white/60 bg-white/75 p-6 shadow-[0_30px_60px_-30px_rgba(28,26,23,0.7)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-soft)] dark:text-white/70">
                                            Наблюдение
                                        </p>
                                        <p className="font-display text-2xl">
                                            Pulse Board
                                        </p>
                                    </div>
                                    <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-[color:var(--ink-soft)] dark:border-white/10 dark:text-white/70">
                                        Live 8:45
                                    </span>
                                </div>

                                <div className="mt-6 grid gap-4">
                                    {[
                                        {
                                            label: 'North Star',
                                            value: '98% clarity',
                                            tone: 'var(--accent)',
                                        },
                                        {
                                            label: 'Craft rhythm',
                                            value: '4 sprints',
                                            tone: 'var(--accent-2)',
                                        },
                                        {
                                            label: 'Delight score',
                                            value: '+36%',
                                            tone: 'var(--accent-3)',
                                        },
                                    ].map((row) => (
                                        <div
                                            key={row.label}
                                            className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm shadow-[0_10px_20px_-18px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/5"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={{ background: `var(${row.tone})` }}
                                                />
                                                <span className="text-[color:var(--ink-soft)] dark:text-white/70">
                                                    {row.label}
                                                </span>
                                            </div>
                                            <span className="font-display text-base">
                                                {row.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 rounded-2xl border border-dashed border-black/15 bg-white/60 p-4 text-xs text-[color:var(--ink-soft)] dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                                    Синхронизация с продактом и маркетингом каждые 48 часов.
                                </div>
                            </div>
                        </section>
                    </main>

                    <section className="mt-20 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] animate-reveal" style={delay(520)}>
                        <div className="rounded-[28px] border border-black/10 bg-white/70 p-8 shadow-[0_20px_40px_-24px_rgba(28,26,23,0.6)] backdrop-blur dark:border-white/10 dark:bg-white/10">
                            <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--ink-soft)] dark:text-white/70">
                                Метод
                            </p>
                            <h2 className="mt-4 font-display text-3xl">
                                От визуала к масштабируемой системе
                            </h2>
                            <p className="mt-4 text-sm text-[color:var(--ink-soft)] dark:text-white/70">
                                Мы строим дизайн-операционку вокруг вашего продукта: от
                                локального прототипа до готовой библиотеки компонентов.
                            </p>
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                {[
                                    'Стратегия и позиционирование',
                                    'Дизайн-система и UX-ритм',
                                    'Инженерная сборка и DevOps',
                                    'Контент и бренд-движок',
                                ].map((step, index) => (
                                    <div
                                        key={step}
                                        className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm shadow-[0_10px_20px_-20px_rgba(28,26,23,0.5)] dark:border-white/10 dark:bg-white/5"
                                    >
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent)] text-xs font-semibold text-white">
                                            0{index + 1}
                                        </span>
                                        <span>{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="grid gap-4">
                            {[
                                { value: '46+', label: 'Запусков за год' },
                                { value: '12 дней', label: 'Средний цикл MVP' },
                                { value: '4.9', label: 'Оценка команды' },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="rounded-[24px] border border-black/10 bg-white/80 p-6 text-sm shadow-[0_16px_32px_-24px_rgba(28,26,23,0.6)] backdrop-blur dark:border-white/10 dark:bg-white/10"
                                >
                                    <p className="font-display text-3xl">
                                        {stat.value}
                                    </p>
                                    <p className="mt-2 text-[color:var(--ink-soft)] dark:text-white/70">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                            <div className="rounded-[24px] border border-black/10 bg-[color:var(--accent-2)]/10 p-6 text-sm shadow-[0_16px_32px_-24px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
                                <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--ink-soft)] dark:text-white/70">
                                    Фокус
                                </p>
                                <p className="mt-3 font-display text-2xl">
                                    Сильная команда важнее громкого релиза.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mt-20 rounded-[32px] border border-black/10 bg-black px-8 py-10 text-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] animate-reveal" style={delay(680)}>
                        <div className="flex flex-wrap items-center justify-between gap-6">
                            <div>
                                <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                                    Готовы начать
                                </p>
                                <h3 className="mt-3 font-display text-3xl">
                                    Сделаем ваш продукт предметом желания.
                                </h3>
                            </div>
                            <Link
                                href={primaryHref}
                                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-white/90"
                            >
                                {primaryLabel}
                            </Link>
                        </div>
                    </section>

                    <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 text-xs text-[color:var(--ink-soft)] dark:text-white/60">
                        <p>© 2026 Aurora Studio. Crafted with Laravel.</p>
                        <div className="flex items-center gap-4">
                            <span className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
                                Moscow + Remote
                            </span>
                            <span className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
                                hello@aurora.studio
                            </span>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
