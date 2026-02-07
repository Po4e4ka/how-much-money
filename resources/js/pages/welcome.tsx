import { Head, Link, router, usePage } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { dashboard, login, register } from '@/routes';
import type { SharedData } from '@/types';
import { delay } from '@/lib/animation';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    useEffect(() => {
        if (auth.user) {
            router.visit(dashboard(), { replace: true });
        }
    }, [auth.user]);

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

    return (
        <>
            <Head title="how nuch money — сколько денег?">
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
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-white shadow-[0_12px_24px_-14px_rgba(216,122,74,0.8)]">
                                <span className="font-display text-xl">HNM</span>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-soft)] dark:text-white/70">
                                    how nuch money — сколько денег?
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
                                            Войти
                                        </Link>
                                        {canRegister && (
                                            <Link
                                                href={register()}
                                                className="rounded-full border border-black/10 bg-black px-4 py-2 text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.7)] transition hover:-translate-y-0.5 hover:bg-black/90 dark:border-white/10 dark:bg-white dark:text-[#0f0d0b]"
                                            >
                                                Регистрация
                                            </Link>
                                        )}
                                </>
                            )}
                            <Link
                                href="/onboarding"
                                className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-[color:var(--ink)] shadow-[0_12px_24px_-18px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white"
                            >
                                Онбординг
                            </Link>
                        </nav>
                    </header>

                    <main className="mt-16 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                        <section className="space-y-8">
                            <div className="space-y-6">
                                <h1
                                    className="animate-reveal font-display text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl"
                                    style={delay(180)}
                                >
                                    how nuch money — сколько денег?
                                </h1>
                                <p
                                    className="animate-reveal max-w-xl text-base text-[color:var(--ink-soft)] dark:text-white/70 sm:text-lg"
                                    style={delay(260)}
                                >
                                    Приложение помогает структурировать траты в соответствии
                                    с вашими финансами: приход, обязательные расходы и
                                    ежедневные траты — всё по периодам.
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
                                    href="/onboarding"
                                    className="rounded-full border border-black/10 bg-white/70 px-6 py-3 text-sm font-semibold text-[color:var(--ink)] shadow-[0_16px_32px_-18px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white"
                                >
                                    Онбординг
                                </Link>
                            </div>
                        </section>

                        <section className="relative animate-reveal" style={delay(220)}>
                            <div className="absolute -left-4 -top-6 h-24 w-24 rounded-full opacity-80 blur-2xl animate-float-slow" style={{ background: 'radial-gradient(circle, rgba(216,122,74,0.7), rgba(216,122,74,0))' }} />
                            <div className="absolute right-6 top-10 h-28 w-28 rounded-full opacity-70 blur-2xl animate-float" style={{ background: 'radial-gradient(circle, rgba(59,124,116,0.7), rgba(59,124,116,0))' }} />
                            <div className="absolute -bottom-8 right-16 h-32 w-32 rounded-full opacity-70 blur-2xl animate-float-slow" style={{ background: 'radial-gradient(circle, rgba(106,90,181,0.6), rgba(106,90,181,0))' }} />
                        </section>
                    </main>

                    <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 text-xs text-[color:var(--ink-soft)] dark:text-white/60">
                        <p>© 2026 How much money. Сделано на Laravel, с душой.</p>
                        <div className="flex items-center gap-4">
                            <span className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
                                В работе
                            </span>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
