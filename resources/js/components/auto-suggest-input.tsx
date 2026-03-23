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
    onRemoveSuggestion?: (value: string) => void;
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
    onRemoveSuggestion,
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
        setIsFocused(false);
        inputRef.current?.blur();
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
                className={`relative flex items-center rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs sm:px-4 sm:text-sm dark:border-white/10 dark:bg-white/10 ${containerClassName}`.trim()}
            >
                {isFocused && ghostSuffix && (
                    <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-[#6a5d52]/70 sm:left-4 dark:text-white/40">
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
                    className={`relative z-20 w-full bg-transparent text-xs outline-none placeholder:text-[#6a5d52]/60 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm dark:text-white dark:placeholder:text-white/40 ${inputClassName}`.trim()}
                />
            </div>
            {shouldShowSuggestions && (
                <div
                    className="absolute right-0 left-0 z-30 mt-1"
                    onMouseDown={(event) => event.preventDefault()}
                >
                    <div className="rounded-lg border border-black/10 bg-white/95 p-2 text-xs shadow-[0_20px_40px_-26px_rgba(28,26,23,0.6)] backdrop-blur dark:border-white/10 dark:bg-[#1f1b17]/95">
                        <div className="px-2 py-1 text-[10px] tracking-[0.2em] text-[#6a5d52] uppercase dark:text-white/60">
                            {header}
                        </div>
                        <div className="flex flex-wrap gap-2 px-2 pb-2">
                            {suggestions.map((name, index) => (
                                <div
                                    key={name}
                                    onMouseEnter={() =>
                                        setHighlightIndex(index)
                                    }
                                    className={[
                                        'inline-flex items-center rounded-full border text-[11px] font-medium transition',
                                        index === highlightIndex
                                            ? 'border-black/20 bg-black/10 text-[#1c1a17] dark:border-white/30 dark:bg-white/10 dark:text-white'
                                            : 'border-black/10 bg-black/5 text-[#1c1a17] hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10',
                                    ].join(' ')}
                                >
                                    <button
                                        type="button"
                                        onClick={() => applySuggestion(name)}
                                        className="px-3 py-1"
                                    >
                                        {name}
                                    </button>
                                    {onRemoveSuggestion && (
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onRemoveSuggestion(name);
                                            }}
                                            aria-label={`Больше не подсказывать ${name}`}
                                            className="rounded-r-full px-2 py-1 text-[10px] text-[#6a5d52] transition hover:bg-black/10 hover:text-[#1c1a17] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                                        >
                                            x
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
