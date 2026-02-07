import { BlockTitle } from '@/components/block-title';
import { PillButton } from '@/components/pill-button';

type PeriodDaysCardProps = {
    days: number;
    startDate: string;
    endDate: string;
    isEditing: boolean;
    readOnly: boolean;
    onToggleEditing: () => void;
    onStartDateChange: (nextValue: string) => void;
    onEndDateChange: (nextValue: string) => void;
    minStartDate?: string;
    maxStartDate?: string;
    minEndDate?: string;
    maxEndDate?: string;
};

export const PeriodDaysCard = ({
    days,
    startDate,
    endDate,
    isEditing,
    readOnly,
    onToggleEditing,
    onStartDateChange,
    onEndDateChange,
    minStartDate,
    maxStartDate,
    minEndDate,
    maxEndDate,
}: PeriodDaysCardProps) => (
    <div className="rounded-lg border border-black/10 bg-white/80 px-5 py-4 text-sm shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center justify-between">
            <BlockTitle>Дни периода</BlockTitle>
            <PillButton
                type="button"
                onClick={onToggleEditing}
                active={isEditing}
                activeTone="success"
                disabled={readOnly}
            >
                {isEditing ? 'Готово' : 'Редактировать'}
            </PillButton>
        </div>
        <div className="mt-3 flex items-center gap-3">
            <div className="px-1 text-base font-semibold tabular-nums">
                {days}
            </div>
            <span className="text-xs text-[#6a5d52] dark:text-white/60">
                дней
            </span>
        </div>
        {isEditing && (
            <div className="mt-3 grid gap-2 grid-cols-2">
                <label className="grid gap-1 text-xs text-[#6a5d52] dark:text-white/60">
                    Начало
                    <input
                        type="date"
                        value={startDate}
                        disabled={readOnly}
                        onChange={(event) =>
                            onStartDateChange(event.target.value)
                        }
                        min={minStartDate}
                        max={maxStartDate}
                        className="rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/10 sm:text-sm"
                    />
                </label>
                <label className="grid gap-1 text-xs text-[#6a5d52] dark:text-white/60">
                    Конец
                    <input
                        type="date"
                        value={endDate}
                        disabled={readOnly}
                        onChange={(event) =>
                            onEndDateChange(event.target.value)
                        }
                        min={minEndDate}
                        max={maxEndDate}
                        className="rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/10 sm:text-sm"
                    />
                </label>
            </div>
        )}
    </div>
);
