import { Form, Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { dashboard, logout } from '@/routes';
import { store as loginStore } from '@/routes/login';
import { email as passwordEmail } from '@/routes/password';
import { store as registerStore } from '@/routes/register';
import type { SharedData } from '@/types';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>(
        'login',
    );
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [forgotEmail, setForgotEmail] = useState('');

    return (
        <>
            <Head title="how much money">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=space-grotesk:400,500,600,700|fraunces:400,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="relative min-h-screen overflow-hidden bg-[#0b0f14] font-body text-[#e9eef3]">
                <div className="pointer-events-none absolute inset-0 bg-aurora-night opacity-90" />
                <div className="pointer-events-none absolute inset-0 bg-grid-night opacity-35" />

                <div className="relative grid min-h-screen w-full lg:grid-cols-[minmax(0,1fr)_700px]">
                    <section className="flex min-h-[50svh] items-center px-6 py-10 sm:px-10 lg:min-h-screen lg:px-16 xl:px-24">
                        <div className="max-w-2xl space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0b0f14]">
                                    <span className="font-display text-lg">HMM</span>
                                </div>
                                <p className="text-xs uppercase tracking-[0.3em] text-white/65">
                                    How much money
                                </p>
                            </div>

                            <h1 className="font-display text-4xl leading-tight sm:text-5xl">
                                Планируй деньги
                                <br />
                                без перегруза
                            </h1>

                            <p className="text-base text-white/70 sm:text-lg">
                                Система стратегического планирования личных финансов. Приложение распределяет бюджет по периодам и формирует ежедневный ориентир расходов, сохраняя баланс между комфортом и дисциплиной.
                            </p>

                            <Link
                                href="/onboarding"
                                className="inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                            >
                                Как это работает
                            </Link>
                        </div>
                    </section>

                    <section className="flex min-h-[50svh] items-center border-t border-white/15 bg-[#101722]/85 px-6 py-10 backdrop-blur sm:px-10 lg:min-h-screen lg:border-t-0 lg:border-l lg:px-12">
                        <div className="mx-auto w-full max-w-md">
                            {auth.user ? (
                                <div className="space-y-4">
                                    <div className="mb-7 text-center">
                                        <h2 className="font-display text-3xl">
                                            Привет, {auth.user.name}!
                                        </h2>
                                    </div>

                                    <Link
                                        href={dashboard()}
                                        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#4e3f7f] text-sm font-medium text-[#f1edff] transition hover:bg-[#66529f]"
                                    >
                                        Перейти в дашборд
                                    </Link>

                                    <Form {...logout.form()} className="w-full">
                                        <Button
                                            type="submit"
                                            className="h-11 w-full rounded-xl border border-white/25 bg-transparent text-white/90 transition hover:border-[#b8a2ff]/45 hover:bg-[#b8a2ff]/12 hover:text-white"
                                        >
                                            Войти в другой аккаунт
                                        </Button>
                                    </Form>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-7 text-center">
                                        <h2 className="font-display text-3xl">
                                            {authMode === 'login'
                                                ? 'Вход'
                                                : authMode === 'register'
                                                  ? 'Регистрация'
                                                  : 'Восстановление доступа'}
                                        </h2>
                                    </div>

                                    {authMode === 'forgot' ? (
                                        <Form
                                            {...passwordEmail.form()}
                                            className="space-y-4"
                                        >
                                            {({ processing, errors }) => (
                                                <>
                                                    <div className="space-y-2">
                                                        <FloatingInput
                                                            id="forgot_email"
                                                            type="email"
                                                            name="email"
                                                            required
                                                            autoFocus
                                                            autoComplete="email"
                                                            placeholder="Email"
                                                            value={forgotEmail}
                                                            onChange={(event) =>
                                                                setForgotEmail(
                                                                    event.target.value,
                                                                )
                                                            }
                                                        />
                                                        <InputError
                                                            message={errors.email}
                                                        />
                                                    </div>

                                                    <Button
                                                        type="submit"
                                                        className="h-11 w-full rounded-xl bg-[#4e3f7f] text-[#f1edff] hover:bg-[#66529f] disabled:bg-[#4e3f7f]/45 disabled:text-[#f1edff]/45"
                                                        disabled={
                                                            processing ||
                                                            forgotEmail.trim() ===
                                                                ''
                                                        }
                                                        data-test="welcome-forgot-button"
                                                    >
                                                        {processing && <Spinner />}
                                                        Отправить ссылку
                                                    </Button>

                                                    <div className="pt-2 text-center lg:text-left">
                                                        <button
                                                            type="button"
                                                            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/25 bg-transparent text-sm font-medium text-white/90 transition hover:border-[#b8a2ff]/45 hover:bg-[#b8a2ff]/12 hover:text-white"
                                                            onClick={() =>
                                                                setAuthMode(
                                                                    'login',
                                                                )
                                                            }
                                                        >
                                                            Вернуться ко входу
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </Form>
                                    ) : (
                                        <div className="overflow-hidden">
                                            <div
                                                className={cn(
                                                    'flex w-[200%] transition-transform duration-500 ease-out',
                                                    authMode === 'register'
                                                        ? '-translate-x-1/2'
                                                        : 'translate-x-0',
                                                )}
                                            >
                                                <div className="w-1/2 pr-1">
                                                    <Form
                                                        {...loginStore.form()}
                                                        resetOnSuccess={[
                                                            'password',
                                                        ]}
                                                        className="space-y-4"
                                                    >
                                                        {({
                                                            processing,
                                                            errors,
                                                        }) => (
                                                            <>
                                                                <input
                                                                    type="hidden"
                                                                    name="remember"
                                                                    value="on"
                                                                />

                                                                <div className="space-y-2">
                                                                    <FloatingInput
                                                                        id="email"
                                                                        type="email"
                                                                        name="email"
                                                                        required
                                                                        autoFocus
                                                                        autoComplete="email"
                                                                        placeholder="Email"
                                                                        value={
                                                                            loginEmail
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            setLoginEmail(
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                    />
                                                                    <InputError
                                                                        message={
                                                                            errors.email
                                                                        }
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <FloatingInput
                                                                        id="password"
                                                                        type="password"
                                                                        name="password"
                                                                        required
                                                                        autoComplete="current-password"
                                                                        placeholder="Пароль"
                                                                        value={
                                                                            loginPassword
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            setLoginPassword(
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                    />
                                                                    <InputError
                                                                        message={
                                                                            errors.password
                                                                        }
                                                                    />
                                                                </div>

                                                                <div className="flex items-center gap-3 text-sm">
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-transparent bg-transparent px-3 text-white/75 transition hover:border-[#b8a2ff]/40 hover:bg-[#b8a2ff]/12 hover:text-white"
                                                                        onClick={() =>
                                                                            setAuthMode(
                                                                                'forgot',
                                                                            )
                                                                        }
                                                                    >
                                                                        Забыл
                                                                        пароль?
                                                                    </button>
                                                                </div>

                                                                <Button
                                                                    type="submit"
                                                                    className="h-11 w-full rounded-xl bg-[#4e3f7f] text-[#f1edff] hover:bg-[#66529f] disabled:bg-[#4e3f7f]/45 disabled:text-[#f1edff]/45"
                                                                    disabled={
                                                                        processing ||
                                                                        loginEmail.trim() ===
                                                                            '' ||
                                                                        loginPassword ===
                                                                            ''
                                                                    }
                                                                    data-test="welcome-login-button"
                                                                >
                                                                    {processing && (
                                                                        <Spinner />
                                                                    )}
                                                                    Войти
                                                                </Button>

                                                                {canRegister && (
                                                                    <div className="pt-2 text-center lg:text-left">
                                                                        <button
                                                                            type="button"
                                                                            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/25 bg-transparent text-sm font-medium text-white/90 transition hover:border-[#b8a2ff]/45 hover:bg-[#b8a2ff]/12 hover:text-white"
                                                                            onClick={() =>
                                                                                setAuthMode(
                                                                                    'register',
                                                                                )
                                                                            }
                                                                        >
                                                                            Создать
                                                                            новый
                                                                            аккаунт
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </Form>
                                                </div>

                                                <div className="w-1/2 pl-1">
                                                    <Form
                                                        {...registerStore.form()}
                                                        resetOnSuccess={[
                                                            'password',
                                                            'password_confirmation',
                                                        ]}
                                                        disableWhileProcessing
                                                        className="space-y-4"
                                                    >
                                                        {({
                                                            processing,
                                                            errors,
                                                        }) => (
                                                            <>
                                                                <div className="space-y-2">
                                                                    <FloatingInput
                                                                        id="name"
                                                                        type="text"
                                                                        required
                                                                        name="name"
                                                                        autoComplete="name"
                                                                        placeholder="Имя"
                                                                    />
                                                                    <InputError
                                                                        message={
                                                                            errors.name
                                                                        }
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <FloatingInput
                                                                        id="register_email"
                                                                        type="email"
                                                                        required
                                                                        name="email"
                                                                        autoComplete="email"
                                                                        placeholder="Email"
                                                                    />
                                                                    <InputError
                                                                        message={
                                                                            errors.email
                                                                        }
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <FloatingInput
                                                                        id="register_password"
                                                                        type="password"
                                                                        required
                                                                        name="password"
                                                                        autoComplete="new-password"
                                                                        placeholder="Пароль"
                                                                    />
                                                                    <InputError
                                                                        message={
                                                                            errors.password
                                                                        }
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <FloatingInput
                                                                        id="password_confirmation"
                                                                        type="password"
                                                                        required
                                                                        name="password_confirmation"
                                                                        autoComplete="new-password"
                                                                        placeholder="Подтвердите пароль"
                                                                    />
                                                                    <InputError
                                                                        message={
                                                                            errors.password_confirmation
                                                                        }
                                                                    />
                                                                </div>

                                                                <Button
                                                                    type="submit"
                                                                    className="h-11 w-full rounded-xl bg-white text-[#0b0f14] hover:bg-white/90"
                                                                    disabled={
                                                                        processing
                                                                    }
                                                                    data-test="welcome-register-button"
                                                                >
                                                                    {processing && (
                                                                        <Spinner />
                                                                    )}
                                                                    Создать
                                                                    аккаунт
                                                                </Button>

                                                                <div className="pt-2 text-center lg:text-left">
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/25 bg-transparent text-sm font-medium text-white/90 transition hover:border-[#b8a2ff]/45 hover:bg-[#b8a2ff]/12 hover:text-white"
                                                                        onClick={() =>
                                                                            setAuthMode(
                                                                                'login',
                                                                            )
                                                                        }
                                                                    >
                                                                        У меня
                                                                        уже есть
                                                                        аккаунт
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </Form>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
