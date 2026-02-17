import { useState } from 'react';
import { resetOnboardingPeriods } from '@/lib/onboarding-periods';
import { resetTourSession } from '@/lib/onboarding-session';
import { dashboard } from '@/routes';

type OnboardingDemoBannerProps = {
    restartHref?: string;
};

export function OnboardingDemoBanner({
    restartHref = '/onboarding',
}: OnboardingDemoBannerProps) {
    const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false);

    const handleRestart = () => {
        resetOnboardingPeriods();
        resetTourSession();

        if (typeof window !== 'undefined') {
            const win = window as typeof window & {
                __periodCache?: Record<string, unknown>;
            };
            if (win.__periodCache) {
                delete win.__periodCache;
            }
            window.location.href = restartHref;
        }
    };

    return (
        <>
            <section className="fixed inset-x-0 top-0 z-[120] border-b border-[#b9a6ff]/35 bg-[#1b1227]/92 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.7)] backdrop-blur">
                <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 text-sm text-white">
                    <p className="line-clamp-2">
                        Демо-инструкция: в этом режиме вы проходите онбординг без API и
                        работаете только с локальными данными браузера.
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="rounded-lg border border-[#b9a6ff]/55 bg-[#2b1c3f]/75 px-3 py-1.5 text-xs font-semibold text-[#e4dcff] transition hover:bg-[#3a2856]"
                            onClick={() => setIsRestartConfirmOpen(true)}
                        >
                            Начать заново
                        </button>
                        <button
                            type="button"
                            className="rounded-lg border border-[#b9a6ff]/45 bg-[#2b1c3f]/55 px-3 py-1.5 text-xs font-semibold text-[#e4dcff] transition hover:bg-[#3a2856]"
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.location.href = dashboard().url;
                                }
                            }}
                        >
                            Завершить
                        </button>
                    </div>
                </div>
            </section>

            {isRestartConfirmOpen && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/58 p-6">
                    <div className="w-full max-w-lg rounded-2xl border border-[#b9a6ff]/45 bg-[#1b1227]/96 p-6 text-white shadow-[0_30px_70px_-35px_rgba(0,0,0,0.9)]">
                        <h3 className="font-display text-2xl">Начать онбординг заново?</h3>
                        <p className="mt-3 text-sm text-white/80">
                            Все данные текущего демо будут удалены: созданные периоды,
                            прогресс шагов и локальные изменения.
                        </p>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                className="rounded-lg border border-white/25 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
                                onClick={() => setIsRestartConfirmOpen(false)}
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-[#7b67c5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8e79d8]"
                                onClick={handleRestart}
                            >
                                Да, начать заново
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
