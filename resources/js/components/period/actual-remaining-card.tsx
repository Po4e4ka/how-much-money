import { BlockSepLine } from '@/components/block-sep-line';
import { BlockTitle } from '@/components/block-title';
import { BigDigit } from '@/components/big-digit';
import { FormulaOp, FormulaRow, FormulaValue } from '@/components/formula';
import { formatCurrency, formatSignedCurrency } from '@/lib/number';

type ActualRemainingCardProps = {
    plannedPeriodSum: number;
    totalDifference: number;
    totalDailyExpenses: number;
    unforeseenOverrun: number;
    actualRemaining: number;
    unforeseenRemaining: number;
    dailyActualAverage: number;
};

export const ActualRemainingCard = ({
    plannedPeriodSum,
    totalDifference,
    totalDailyExpenses,
    unforeseenOverrun,
    actualRemaining,
    unforeseenRemaining,
    dailyActualAverage,
}: ActualRemainingCardProps) => (
    <div className="rounded-lg border border-black/10 bg-white/85 px-5 py-6 text-[#1c1a17] shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-[#1c1a17] dark:text-white dark:shadow-[0_20px_40px_-26px_rgba(0,0,0,0.7)]">
        <BlockTitle
            tooltipText="Планируемый остаток +/− фактическая разница − ежедневные траты за период − перерасход непредвиденных (если есть)."
            tooltipAriaLabel="Формула фактического остатка"
        >
            Фактический остаток
        </BlockTitle>
        <FormulaRow className="mt-3">
            <FormulaValue className="text-[#1e7b4f] dark:text-[#7ce0b3]">
                {formatCurrency(plannedPeriodSum)}
            </FormulaValue>
            <FormulaValue
                className={`${
                    totalDifference > 0
                        ? 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                        : totalDifference < 0
                          ? 'text-[#b0352b] dark:text-[#ff8b7c]'
                          : 'text-[#6a5d52] dark:text-white/70'
                }`}
            >
                {formatSignedCurrency(totalDifference).replace(
                    /^([+−-])/, // add space after sign
                    '$1 ',
                )}
            </FormulaValue>
            <FormulaOp>−</FormulaOp>
            <FormulaValue className="text-[#b0352b] dark:text-[#ff8b7c]">
                {formatCurrency(totalDailyExpenses)}
            </FormulaValue>
            {unforeseenOverrun > 0 && (
                <>
                    <FormulaOp>−</FormulaOp>
                    <FormulaValue className="text-[#b0352b] dark:text-[#ff8b7c]">
                        {formatCurrency(unforeseenOverrun)}
                    </FormulaValue>
                </>
            )}
            <FormulaOp>=</FormulaOp>
            <FormulaValue
                className={`text-2xl ${
                    plannedPeriodSum +
                        totalDifference -
                        totalDailyExpenses -
                        unforeseenOverrun >=
                    0
                        ? 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                        : 'text-[#b0352b] dark:text-[#ff8b7c]'
                }`}
            >
                {formatSignedCurrency(
                    actualRemaining,
                )}
            </FormulaValue>
        </FormulaRow>
        <BlockSepLine className="mt-3" />
        <BlockTitle
            className="mt-4"
            tooltipText="Фактический остаток + остаток с непредвиденных."
            tooltipAriaLabel="Сумма остатков"
        >
            Остаток средств
        </BlockTitle>
        <BigDigit className="mt-2 text-base text-[#1e7b4f] dark:text-[#7ce0b3]">
            {formatSignedCurrency(actualRemaining + unforeseenRemaining)}
        </BigDigit>
        <BlockSepLine className="mt-4" />
        <BlockTitle className="mt-4">
            Фактическое среднее в день за период
        </BlockTitle>
        <BigDigit className="mt-2">
            {formatCurrency(dailyActualAverage)}
        </BigDigit>
    </div>
);
