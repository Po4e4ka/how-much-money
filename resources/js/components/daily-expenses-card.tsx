import { Link } from '@inertiajs/react';
import { PillButton } from '@/components/pill-button';
import { BlockTitle } from '@/components/block-title';

type DailyExpensesCardProps = {
    href: string;
};

export const DailyExpensesCard = ({ href }: DailyExpensesCardProps) => (
    <Link
        href={href}
        prefetch
        className="group rounded-lg border border-[#1e7b4f]/30 bg-white/90 px-5 py-4 text-sm text-[#1c1a17] shadow-[0_24px_48px_-28px_rgba(30,123,79,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-30px_rgba(30,123,79,0.65)] dark:border-[#7ce0b3]/30 dark:bg-white/10 dark:text-white"
    >
        <div className="flex items-start justify-between gap-4">
            <BlockTitle>Ежедневные траты</BlockTitle>
            <PillButton as="span">Перейти к дневным значениям</PillButton>
        </div>
    </Link>
);
