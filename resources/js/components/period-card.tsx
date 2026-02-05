import { Link } from '@inertiajs/react';
import { PillButton } from '@/components/pill-button';

type PeriodCardProps = {
    href: string;
    title: string;
    subtitle: string;
    isClosed?: boolean;
    actualRemaining?: number | null;
};

const formatSignedCurrency = (value: number) => {
    const rounded = Math.round(value);
    if (rounded === 0) {
        return '0 ₽';
    }
    const sign = rounded > 0 ? '+' : '−';
    return `${sign}${Math.abs(rounded).toLocaleString('ru-RU')} ₽`;
};

export const PeriodCard = ({
    href,
    title,
    subtitle,
    isClosed = false,
    actualRemaining,
}: PeriodCardProps) => (
    <Link
        href={href}
        prefetch
        className={`rounded-[28px] border bg-white/70 p-5 text-left shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 dark:bg-white/10 ${
            isClosed
                ? 'border-[#1e7b4f]/40 dark:border-[#7ce0b3]/40'
                : 'border-black/10 dark:border-white/10'
        }`}
    >
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-[180px]">
                <h3 className="font-display text-xl">{title}</h3>
                <p className="mt-1 text-xs text-[#6a5d52] dark:text-white/70">
                    {subtitle}
                </p>
                {isClosed && typeof actualRemaining === 'number' && (
                    <p className="mt-2 text-xs text-[#1e7b4f] dark:text-[#7ce0b3]">
                        Факт. остаток: {formatSignedCurrency(actualRemaining)}
                    </p>
                )}
            </div>
            {isClosed && (
                <div className="flex-1 text-center text-xs uppercase tracking-[0.2em] text-[#1e7b4f] dark:text-[#7ce0b3]">
                    Период закрыт
                </div>
            )}
            <PillButton
                as="span"
                className="bg-white/80 text-[#1c1a17] dark:bg-white/10 dark:text-white"
            >
                Открыть период
            </PillButton>
        </div>
    </Link>
);
