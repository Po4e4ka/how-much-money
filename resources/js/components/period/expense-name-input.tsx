import { useMemo } from 'react';
import { AutoSuggestInput } from '@/components/auto-suggest-input';
import { useExpenseSuggestions } from '@/contexts/expense-suggestions-context';

type ExpenseNameInputProps = {
    value: string;
    placeholder: string;
    disabled?: boolean;
    containerClassName?: string;
    usedNames?: string[];
    onChange: (value: string) => void;
    onBlur: () => void;
};

const MAX_SUGGESTIONS = 8;

export const ExpenseNameInput = ({
    value,
    placeholder,
    disabled = false,
    containerClassName,
    usedNames = [],
    onChange,
    onBlur,
}: ExpenseNameInputProps) => {
    const { previous, all } = useExpenseSuggestions();

    const suggestions = useMemo(() => {
        const query = value.trim();
        const source = query.length > 0 ? all : previous;
        const used = new Set(
            usedNames
                .map((name) => name.trim().toLowerCase())
                .filter((name) => name.length > 0),
        );
        if (source.length === 0) {
            return [];
        }
        const normalized = query.toLowerCase();
        const filtered = source.filter((name) => {
            const lower = name.toLowerCase();
            if (used.has(lower)) {
                return false;
            }
            if (normalized.length === 0) {
                return true;
            }
            return lower.startsWith(normalized);
        });
        return filtered.slice(0, MAX_SUGGESTIONS);
    }, [all, previous, usedNames, value]);

    return (
        <AutoSuggestInput
            value={value}
            placeholder={placeholder}
            suggestions={suggestions}
            disabled={disabled}
            onChange={onChange}
            onSelect={onChange}
            onBlur={onBlur}
            header="Подсказки"
            containerClassName={containerClassName}
        />
    );
};
