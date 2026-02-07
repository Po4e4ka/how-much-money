import { BlockTitle } from '@/components/block-title';
import { PillButton } from '@/components/pill-button';
import { formatCurrency, formatSignedCurrency, toIntegerValue } from '@/lib/number';
import type { ExpensesBlockProps } from '@/types/period';

export const ExpensesBlock = ({
    title,
    items,
    setItems,
    showDelete,
    onToggleDelete,
    totalLabel,
    totalPlanned,
    totalActual,
    totalDifference,
    idPrefix,
    onBlurField,
    onAfterDelete,
    readOnly = false,
}: ExpensesBlockProps) => (
    <div className="rounded-lg border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center justify-between">
            <BlockTitle>{title}</BlockTitle>
            <div className="flex items-center gap-2">
                <PillButton
                    type="button"
                    onClick={() =>
                        setItems((prev) => [
                            ...prev,
                            {
                                id: `${idPrefix}${Date.now()}`,
                                name: '',
                                plannedAmount: '',
                                actualAmount: '',
                                actualTouched: false,
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
            className={`mt-3 grid items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60 ${
                showDelete
                    ? 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]'
                    : 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]'
            }`}
        >
            <span>
                <span className="sm:hidden">Название</span>
                <span className="hidden sm:inline">Название</span>
            </span>
            <span className="text-right">План</span>
            <span className="text-right">Факт</span>
            <span className="text-right">
                <span className="sm:hidden">Разн</span>
                <span className="hidden sm:inline">Разница</span>
            </span>
            {showDelete && <span className="text-center">—</span>}
        </div>
        <div className="mt-3 grid gap-2">
            {items.map((item, index) => (
                <div
                    key={item.id}
                    className={`grid items-center gap-2 ${
                        showDelete
                            ? 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]'
                            : 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]'
                    }`}
                >
                    <input
                        type="text"
                        placeholder={`Трата ${index + 1}`}
                        value={item.name}
                        disabled={readOnly}
                        onChange={(event) =>
                            setItems((prev) =>
                                prev.map((expense) =>
                                    expense.id === item.id
                                        ? {
                                              ...expense,
                                              name: event.target.value,
                                          }
                                        : expense,
                                ),
                            )
                        }
                        onBlur={onBlurField}
                        className="rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/10 sm:px-4 sm:text-sm"
                    />
                    <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={item.plannedAmount}
                        disabled={readOnly}
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            setItems((prev) =>
                                prev.map((expense) =>
                                    expense.id === item.id
                                        ? {
                                              ...expense,
                                              plannedAmount:
                                                  toIntegerValue(nextValue),
                                              actualAmount: expense.actualTouched
                                                  ? expense.actualAmount
                                                  : toIntegerValue(nextValue),
                                          }
                                        : expense,
                                ),
                            );
                        }}
                        onFocus={() => {
                            if (item.plannedAmount === 0) {
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? { ...expense, plannedAmount: '' }
                                            : expense,
                                    ),
                                );
                            }
                        }}
                        onBlur={() => {
                            if (item.plannedAmount === '') {
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? { ...expense, plannedAmount: 0 }
                                            : expense,
                                    ),
                                );
                            }
                            onBlurField();
                        }}
                        className="no-spin rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs text-right tabular-nums dark:border-white/10 dark:bg-white/10 sm:px-4 sm:text-sm"
                    />
                    <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={item.actualAmount}
                        disabled={readOnly}
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            setItems((prev) =>
                                prev.map((expense) =>
                                    expense.id === item.id
                                        ? {
                                              ...expense,
                                              actualAmount:
                                                  toIntegerValue(nextValue),
                                              actualTouched: true,
                                          }
                                        : expense,
                                ),
                            );
                        }}
                        onFocus={() => {
                            if (item.actualAmount === 0) {
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? { ...expense, actualAmount: '' }
                                            : expense,
                                    ),
                                );
                            }
                        }}
                        onBlur={() => {
                            if (item.actualAmount === '') {
                                setItems((prev) =>
                                    prev.map((expense) =>
                                        expense.id === item.id
                                            ? { ...expense, actualAmount: 0 }
                                            : expense,
                                    ),
                                );
                            }
                            onBlurField();
                        }}
                        className="no-spin rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs text-right tabular-nums dark:border-white/10 dark:bg-white/10 sm:px-4 sm:text-sm"
                    />
                    <div
                        className={`flex min-h-[36px] items-center justify-end px-0 py-2 text-xs tabular-nums sm:min-h-[40px] sm:px-4 sm:text-sm ${
                            item.plannedAmount - item.actualAmount > 0
                                ? 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                                : item.plannedAmount - item.actualAmount < 0
                                  ? 'text-[#b0352b] dark:text-[#ff8b7c]'
                                  : 'text-[#6a5d52] dark:text-white/70'
                        }`}
                    >
                        {formatSignedCurrency(
                            item.plannedAmount - item.actualAmount,
                        )}
                    </div>
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
            ))}
        </div>
        <div
            className={`mt-3 grid items-center gap-2 rounded-lg border border-dashed border-black/10 bg-white/70 px-4 py-2 text-xs dark:border-white/10 dark:bg-white/5 ${
                showDelete
                    ? 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]'
                    : 'grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]'
            }`}
        >
            <span>{totalLabel}</span>
            <span className="text-right font-display text-sm tabular-nums">
                {formatCurrency(totalPlanned)}
            </span>
            <span className="text-right font-display text-sm tabular-nums">
                {formatCurrency(totalActual)}
            </span>
            <span
                className={`text-right font-display text-sm tabular-nums ${
                    totalDifference > 0
                        ? 'text-[#1e7b4f] dark:text-[#7ce0b3]'
                        : totalDifference < 0
                          ? 'text-[#b0352b] dark:text-[#ff8b7c]'
                          : 'text-[#6a5d52] dark:text-white/70'
                }`}
            >
                {formatSignedCurrency(totalDifference)}
            </span>
            {showDelete && <span />}
        </div>
    </div>
);
