import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ExpenseSuggestionsState = {
    previous: string[];
    all: string[];
};

type ExpenseSuggestionsContextValue = ExpenseSuggestionsState;

const ExpenseSuggestionsContext = createContext<ExpenseSuggestionsContextValue | null>(
    null,
);

type ExpenseSuggestionsProviderProps = {
    periodId: string;
    type: 'income' | 'mandatory' | 'external';
    children: ReactNode;
};

export const ExpenseSuggestionsProvider = ({
    periodId,
    type,
    children,
}: ExpenseSuggestionsProviderProps) => {
    const [suggestions, setSuggestions] = useState<ExpenseSuggestionsState>({
        previous: [],
        all: [],
    });

    useEffect(() => {
        const controller = new AbortController();
        const fetchSuggestions = async () => {
            try {
                const params = new URLSearchParams({ type });
                const response = await fetch(
                    `/api/periods/${periodId}/expense-suggestions?${params.toString()}`,
                    { signal: controller.signal },
                );
                if (!response.ok) {
                    throw new Error('Не удалось загрузить подсказки.');
                }
                const payload = (await response.json()) as {
                    data?: { previous?: string[]; all?: string[] };
                };
                setSuggestions({
                    previous: payload.data?.previous ?? [],
                    all: payload.data?.all ?? [],
                });
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') {
                    return;
                }
            }
        };

        void fetchSuggestions();
        return () => controller.abort();
    }, [periodId, type]);

    const value = useMemo(() => suggestions, [suggestions]);

    return (
        <ExpenseSuggestionsContext.Provider value={value}>
            {children}
        </ExpenseSuggestionsContext.Provider>
    );
};

export const useExpenseSuggestions = () => {
    const value = useContext(ExpenseSuggestionsContext);
    return (
        value ?? {
            previous: [],
            all: [],
        }
    );
};
