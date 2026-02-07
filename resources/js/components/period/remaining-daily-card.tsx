import { BlockDescriptionText } from '@/components/block-description-text';
import { BlockTitle } from '@/components/block-title';
import { BigDigit } from '@/components/big-digit';
import { formatCurrency } from '@/lib/number';

type RemainingDailyCardProps = {
    actualRemaining: number;
    remainingDays: number;
    remainingDailyAverage: number;
};

export const RemainingDailyCard = ({
    actualRemaining,
    remainingDays,
    remainingDailyAverage,
}: RemainingDailyCardProps) => (
    <div className="rounded-lg border border-black/10 bg-white/85 px-5 py-6 text-[#1c1a17] shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-[#1c1a17] dark:text-white dark:shadow-[0_20px_40px_-26px_rgba(0,0,0,0.7)]">
        <BlockTitle tooltipText="Фактический остаток / количество незаполненных (непрошедших) дней">
            Расчётное в день на оставшиеся дни
        </BlockTitle>
        <BlockDescriptionText>
            ({formatCurrency(actualRemaining)} / {remainingDays || 0} д.)
        </BlockDescriptionText>
        <BigDigit className="mt-3">
            {formatCurrency(remainingDailyAverage)}
        </BigDigit>
    </div>
);
