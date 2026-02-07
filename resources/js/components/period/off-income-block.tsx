import { BlockTitle } from '@/components/block-title';
import { PillButton } from '@/components/pill-button';
import { formatCurrency, toIntegerValue } from '@/lib/number';
import { ExpenseNameInput } from '@/components/period/expense-name-input';
import type { OffIncomeBlockProps } from '@/types/period';

export const OffIncomeBlock = ({
    title,
    items,
    setItems,
    showDelete,
    onToggleDelete,
    totalLabel,
    totalAmount,
    idPrefix,
    onBlurField,
    onAfterDelete,
    readOnly = false,
}: OffIncomeBlockProps) => (
        <div className="rounded-lg border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
            <div className="flex items-center justify-between">
                <BlockTitle
                    tooltipText="Эти траты не учитываются в расчётах."
                    tooltipAriaLabel="Сторонние траты"
                >
                    {title}
                </BlockTitle>
                <div className="flex items-center gap-2">
                    <PillButton
                        type="button"
                        onClick={() =>
                            setItems((prev) => [
                                ...prev,
                                {
                                    id: `${idPrefix}${Date.now()}`,
                                    name: '',
                                    amount: '',
                                },
                            ])
                        }
                        disabled={readOnly}
                    >
                        + Строка
                    </PillButton>
                    <PillButton
                        type="button"
                        onClick={onToggleDelete}
                        active={showDelete}
                        activeTone="danger"
                        disabled={readOnly}
                    >
                        − Удаление
                    </PillButton>
                </div>
            </div>
            <div
                className={`mt-3 hidden items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60 sm:grid ${
                    showDelete
                        ? 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_auto]'
                        : 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)]'
                }`}
            >
                <span>Название</span>
                <span className="text-right">Сумма</span>
                {showDelete && <span className="text-center">—</span>}
            </div>
            <div className="mt-3 grid gap-2">
                {items.map((item, index) => {
                    const usedNames = items
                        .filter((entry) => entry.id !== item.id)
                        .map((entry) => entry.name);
                    return (
                    <div
                        key={item.id}
                        className={`grid items-center gap-2 ${
                            showDelete
                                ? 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_auto]'
                                : 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)]'
                        }`}
                    >
                        <ExpenseNameInput
                            value={item.name}
                            placeholder={`Трата ${index + 1}`}
                            disabled={readOnly}
                            usedNames={usedNames}
                            onChange={(nextValue) =>
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? {
                                                  ...expense,
                                                  name: nextValue,
                                              }
                                            : expense,
                                    ),
                                )
                            }
                            onBlur={onBlurField}
                        />
                            <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={item.amount}
                        disabled={readOnly}
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            setItems((prev) =>
                                prev.map((expense) =>
                                    expense.id === item.id
                                        ? {
                                              ...expense,
                                              amount: toIntegerValue(nextValue),
                                          }
                                        : expense,
                                ),
                            );
                        }}
                        onFocus={() => {
                            if (item.amount === 0) {
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? { ...expense, amount: '' }
                                            : expense,
                                    ),
                                );
                            }
                        }}
                        onBlur={() => {
                            if (item.amount === '') {
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? { ...expense, amount: 0 }
                                            : expense,
                                    ),
                                );
                            }
                            onBlurField();
                        }}
                        className="no-spin rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs text-right tabular-nums text-[#b0352b] dark:border-white/10 dark:bg-white/10 dark:text-[#ff8b7c] sm:px-4 sm:text-sm"
                    />
                    {showDelete && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm('Удалить строку?')) {
                                    setItems((prev) =>
                                        prev.filter(
                                            (expense) => expense.id !== item.id,
                                        ),
                                    );
                                    onAfterDelete();
                                }
                            }}
                            aria-label={`Удалить трату ${index + 1}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-[#b0352b] transition hover:bg-[#b0352b]/10 dark:text-[#ff8b7c] dark:hover:bg-[#ff8b7c]/15"
                            disabled={readOnly}
                        >
                            —
                        </button>
                    )}
                    </div>
                );
                })}
            </div>
            <div
                className={`mt-3 grid items-center gap-2 rounded-lg border border-dashed border-black/10 bg-white/70 px-4 py-2 text-xs dark:border-white/10 dark:bg-white/5 ${
                    showDelete
                        ? 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_auto]'
                        : 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)]'
                }`}
            >
                <span>{totalLabel}</span>
                <span className="text-right font-display text-sm tabular-nums text-[#b0352b] dark:text-[#ff8b7c]">
                    {formatCurrency(totalAmount)}
                </span>
                {showDelete && <span />}
            </div>
        </div>
);
