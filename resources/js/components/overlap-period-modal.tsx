import { Link } from '@inertiajs/react';
import { PillButton } from '@/components/pill-button';

type OverlapPeriodModalProps = {
    href: string;
    title: string;
    subtitle: string;
    onClose: () => void;
    onConfirm: () => void;
    confirmDisabled?: boolean;
};

export const OverlapPeriodModal = ({
    href,
    title,
    subtitle,
    onClose,
    onConfirm,
    confirmDisabled = false,
}: OverlapPeriodModalProps) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
        <div className="w-full max-w-xl rounded-3xl border border-black/10 bg-white/95 p-6 text-[#1c1a17] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)] dark:border-white/10 dark:bg-[#1c1a17] dark:text-white">
            <h3 className="font-display text-2xl">
                Эти даты присутствуют в периоде
            </h3>
            <div className="mt-4">
                <Link
                    href={href}
                    className="block w-full rounded-[28px] border border-black/10 bg-white/70 p-5 text-left shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10"
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="font-display text-xl">{title}</h3>
                            <p className="mt-1 text-xs text-[#6a5d52] dark:text-white/70">
                                {subtitle}
                            </p>
                        </div>
                        <PillButton
                            as="span"
                            className="bg-white/80 text-[#1c1a17] dark:bg-white/10 dark:text-white"
                        >
                            Открыть период
                        </PillButton>
                    </div>
                </Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
                <PillButton
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2"
                >
                    Отменить
                </PillButton>
                <PillButton
                    type="button"
                    onClick={onConfirm}
                    className="border-transparent bg-[#4e3f7f] px-4 py-2 text-xs font-semibold text-white shadow-[0_14px_28px_-18px_rgba(78,63,127,0.85)] transition hover:bg-[#66529f] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={confirmDisabled}
                >
                    Подтвердить
                </PillButton>
            </div>
        </div>
    </div>
);
