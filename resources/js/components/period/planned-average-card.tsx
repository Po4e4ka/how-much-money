import { BlockSepLine } from '@/components/block-sep-line';
import { BlockTitle } from '@/components/block-title';
import { BigDigit } from '@/components/big-digit';
import { FormulaOp, FormulaRow, FormulaValue } from '@/components/formula';
import { formatCurrency, formatSignedCurrency } from '@/lib/number';

type PlannedAverageCardProps = {
    dailyAverage: number;
    days: number;
    totalIncome: number;
    totalPlannedExpenses: number;
    plannedPeriodSum: number;
};

export const PlannedAverageCard = ({
    dailyAverage,
    days,
    totalIncome,
    totalPlannedExpenses,
    plannedPeriodSum,
}: PlannedAverageCardProps) => (
    <div className="rounded-lg border border-black/10 bg-white/85 px-5 py-6 text-[#1c1a17] shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-[#1c1a17] dark:text-white dark:shadow-[0_20px_40px_-26px_rgba(0,0,0,0.7)]">
        <div className="grid gap-3 text-xs text-[#6a5d52] dark:text-white/70">
            <BlockTitle tooltipText="Приход − план = сумма в период">
                Планируемая сумма на период
            </BlockTitle>
            <FormulaRow>
                <FormulaValue className="text-[#1e7b4f] dark:text-[#7ce0b3]">
                    {formatCurrency(totalIncome)}
                </FormulaValue>
                <FormulaOp>−</FormulaOp>
                <FormulaValue className="text-[#b0352b] dark:text-[#ff8b7c]">
                    {formatCurrency(totalPlannedExpenses)}
                </FormulaValue>
                <FormulaOp>=</FormulaOp>
                <FormulaValue
                    className={`text-2xl ${
                        plannedPeriodSum >= 0
                            ? 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                            : 'text-[#b0352b] dark:text-[#ff8b7c]'
                    }`}
                >
                    {formatSignedCurrency(plannedPeriodSum)}
                </FormulaValue>
            </FormulaRow>
        </div>
        <BlockSepLine className="mt-4" />
        <BlockTitle className="mt-4">Планируемое среднее в день</BlockTitle>
        <p className="mt-2 text-xs text-[#6a5d52] dark:text-white/60">
            ({formatCurrency(plannedPeriodSum)} / {days || 0} д.)
        </p>
        <BigDigit className="mt-3">{formatCurrency(dailyAverage)}</BigDigit>
    </div>
);
