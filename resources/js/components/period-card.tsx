import { Link } from '@inertiajs/react';
import { PillButton } from '@/components/pill-button';

type PeriodCardProps = {
    href: string;
    title: string;
    subtitle: string;
};

export const PeriodCard = ({ href, title, subtitle }: PeriodCardProps) => (
    <Link
        href={href}
        prefetch
        className="rounded-[28px] border border-black/10 bg-white/70 p-5 text-left shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10"
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
);
