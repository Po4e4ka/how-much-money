import { useEffect, useMemo, useRef, useState } from 'react';

type AutoSuggestInputProps = {
    value: string;
    placeholder: string;
    suggestions: string[];
    disabled?: boolean;
    onChange: (value: string) => void;
    onSelect: (value: string) => void;
    onBlur: () => void;
    header?: string;
    className?: string;
    containerClassName?: string;
    inputClassName?: string;
};

export const AutoSuggestInput = ({
    value,
    placeholder,
    suggestions,
    disabled = false,
    onChange,
    onSelect,
    onBlur,
    header = 'Подсказки',
    className = '',
    containerClassName = '',
    inputClassName = '',
}: AutoSuggestInputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (highlightIndex >= suggestions.length && suggestions.length > 0) {
            setHighlightIndex(0);
        }
    }, [highlightIndex, suggestions.length]);

    const ghostSuffix = useMemo(() => {
        if (!value) return '';
        const candidate = suggestions[highlightIndex] ?? suggestions[0];
        if (!candidate) return '';
        if (!candidate.toLowerCase().startsWith(value.toLowerCase())) return '';
        return candidate.slice(value.length);
    }, [highlightIndex, suggestions, value]);

    const applySuggestion = (name: string) => {
        onSelect(name);
        setHighlightIndex(0);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            setIsFocused(false);
            inputRef.current?.blur();
            return;
        }

        if (event.key === 'Tab' && suggestions.length > 0) {
            event.preventDefault();
            const delta = event.shiftKey ? -1 : 1;
            const nextIndex =
                (highlightIndex + delta + suggestions.length) %
                suggestions.length;
            setHighlightIndex(nextIndex);
            return;
        }

        if (event.key !== 'Enter') return;

        event.preventDefault();
        if (suggestions.length === 0) return;
        const match = suggestions[highlightIndex] ?? suggestions[0];
        if (match) {
            applySuggestion(match);
        }
    };

    const shouldShowSuggestions =
        isFocused && suggestions.length > 0 && !disabled;

    return (
        <div className={`relative ${className}`.trim()}>
            <div
                className={`relative flex items-center rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/10 sm:px-4 sm:text-sm ${containerClassName}`.trim()}
            >
                {ghostSuffix && (
                    <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#6a5d52]/70 dark:text-white/40 sm:left-4">
                        <span className="invisible">{value}</span>
                        {ghostSuffix}
                    </span>
                )}
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    disabled={disabled}
                    onChange={(event) => {
                        onChange(event.target.value);
                        setHighlightIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        setIsFocused(true);
                        setHighlightIndex(0);
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                        onBlur();
                    }}
                    className={`relative z-20 w-full bg-transparent text-xs outline-none placeholder:text-[#6a5d52]/60 disabled:cursor-not-allowed disabled:opacity-70 dark:text-white dark:placeholder:text-white/40 sm:text-sm ${inputClassName}`.trim()}
                />
            </div>
            {shouldShowSuggestions && (
                <div
                    className="absolute left-0 right-0 z-30 mt-1"
                    onMouseDown={(event) => event.preventDefault()}
                >
                    <div className="rounded-lg border border-black/10 bg-white/95 p-2 text-xs shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] backdrop-blur dark:border-white/10 dark:bg-[#1f1b17]/95">
                        <div className="px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6a5d52] dark:text-white/60">
                            {header}
                        </div>
                        <div className="flex flex-wrap gap-2 px-2 pb-2">
                            {suggestions.map((name, index) => (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => applySuggestion(name)}
                                    onMouseEnter={() => setHighlightIndex(index)}
                                    className={[
                                        'rounded-full border px-3 py-1 text-[11px] font-medium transition',
                                        index === highlightIndex
                                            ? 'border-black/20 bg-black/10 text-[#1c1a17] dark:border-white/30 dark:bg-white/10 dark:text-white'
                                            : 'border-black/10 bg-black/5 text-[#1c1a17] hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10',
                                    ].join(' ')}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
