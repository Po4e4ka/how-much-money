import { Link } from '@inertiajs/react';
import { BlockTitle } from '@/components/block-title';
import { PillButton } from '@/components/pill-button';
import { formatCurrency } from '@/lib/number';

type UnforeseenExpensesCardProps = {
    href: string;
    allocated: number;
    spent: number;
};

export const UnforeseenExpensesCard = ({
    href,
    allocated,
    spent,
}: UnforeseenExpensesCardProps) => {
    const difference = allocated - spent;
    const formatDifference = (value: number) => {
        const rounded = Math.round(value);
        const abs = Math.abs(rounded).toLocaleString('ru-RU');
        return rounded < 0 ? `−${abs} ₽` : `+${abs} ₽`;
    };

    return (
    <Link
        href={href}
        prefetch
        className="group rounded-lg border border-[#b0352b]/30 bg-white/90 px-5 py-4 text-sm text-[#1c1a17] shadow-[0_24px_48px_-28px_rgba(176,53,43,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-30px_rgba(176,53,43,0.6)] dark:border-[#ff8b7c]/30 dark:bg-white/10 dark:text-white"
    >
        <div className="flex items-start justify-between gap-4">
            <BlockTitle>Непредвиденные расходы</BlockTitle>
            <PillButton as="span">Открыть</PillButton>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div>
                <div className="uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60">
                    Выделено
                </div>
                <div className="mt-1 font-display text-sm tabular-nums text-[#1c1a17] dark:text-[#ffffff]">
                    {formatCurrency(allocated)}
                </div>
            </div>
            <div>
                <div className="uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60">
                    Потрачено
                </div>
                <div className="mt-1 font-display text-sm tabular-nums text-[#b0352b] dark:text-[#ff8b7c]">
                    {formatCurrency(spent)}
                </div>
            </div>
            <div>
                <div className="uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60">
                    Разница
                </div>
                <div
                    className={`mt-1 font-display text-sm tabular-nums ${
                        difference < 0
                            ? 'text-[#b0352b] dark:text-[#ff8b7c]'
                            : 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                    }`}
                >
                    {formatDifference(difference)}
                </div>
            </div>
        </div>
    </Link>
    );
};
