import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type ExpenseSuggestionsState = {
    previous: string[];
    all: string[];
    hideSuggestion: (name: string) => Promise<void>;
};

type ExpenseSuggestionsContextValue = ExpenseSuggestionsState;

const ExpenseSuggestionsContext =
    createContext<ExpenseSuggestionsContextValue | null>(null);

type ExpenseSuggestionsProviderProps = {
    periodId: string;
    type: 'income' | 'mandatory' | 'external' | 'unforeseen';
    viewerId?: number;
    disabled?: boolean;
    children: ReactNode;
};

export const ExpenseSuggestionsProvider = ({
    periodId,
    type,
    viewerId,
    disabled = false,
    children,
}: ExpenseSuggestionsProviderProps) => {
    const [suggestions, setSuggestions] = useState<ExpenseSuggestionsState>({
        previous: [],
        all: [],
        hideSuggestion: async () => {},
    });

    const disabledValue = useMemo(
        () => ({
            previous: [],
            all: [],
            hideSuggestion: async () => {},
        }),
        [],
    );

    useEffect(() => {
        if (disabled) {
            return;
        }

        const controller = new AbortController();
        const hideSuggestion = async (name: string) => {
            const params = new URLSearchParams();
            if (viewerId) {
                params.set('viewer_id', viewerId.toString());
            }

            await apiFetch(
                `/api/periods/${periodId}/expense-suggestions${
                    params.size > 0 ? `?${params.toString()}` : ''
                }`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type,
                        name,
                    }),
                },
            );

            setSuggestions((prev) => {
                const suggestionKey = name.trim().toLowerCase();

                return {
                    ...prev,
                    previous: prev.previous.filter(
                        (item) => item.trim().toLowerCase() !== suggestionKey,
                    ),
                    all: prev.all.filter(
                        (item) => item.trim().toLowerCase() !== suggestionKey,
                    ),
                };
            });
        };

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
                    hideSuggestion,
                });
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') {
                    return;
                }
            }
        };

        void fetchSuggestions();
        return () => controller.abort();
    }, [periodId, type, viewerId, disabled]);

    const value = useMemo(() => suggestions, [suggestions]);

    if (disabled) {
        return (
            <ExpenseSuggestionsContext.Provider value={disabledValue}>
                {children}
            </ExpenseSuggestionsContext.Provider>
        );
    }

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
            hideSuggestion: async () => {},
        }
    );
};
