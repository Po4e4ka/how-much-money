import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

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
    type: 'income' | 'mandatory' | 'external' | 'unforeseen';
    viewerId?: number;
    children: ReactNode;
};

export const ExpenseSuggestionsProvider = ({
    periodId,
    type,
    viewerId,
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
                if (viewerId) {
                    params.set('viewer_id', viewerId.toString());
                }
                const payload = await apiFetch<{
                    data?: { previous?: string[]; all?: string[] };
                }>(
                    `/api/periods/${periodId}/expense-suggestions?${params.toString()}`,
                    { signal: controller.signal },
                );
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
    }, [periodId, type, viewerId]);

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
