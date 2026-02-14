import * as React from 'react';
import { cn } from '@/lib/utils';

type FloatingInputProps = React.ComponentProps<'input'> & {
    containerClassName?: string;
};

function FloatingInput({
    className,
    containerClassName,
    id,
    placeholder,
    ...props
}: FloatingInputProps) {
    const floatingText = placeholder ?? '';

    return (
        <div className={cn('relative', containerClassName)}>
            <input
                id={id}
                placeholder=" "
                data-slot="floating-input"
                aria-label={typeof floatingText === 'string' ? floatingText : undefined}
                className={cn(
                    'peer h-14 w-full rounded-xl border border-white/15 bg-white/8 px-3 pb-2 pt-6 text-base text-white outline-none transition-[color,border-color,box-shadow] placeholder:text-transparent md:text-sm',
                    'focus:border-[#b8a2ff] focus:ring-3 focus:ring-[#b8a2ff]/20',
                    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                    'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
                    className,
                )}
                {...props}
            />

            <label
                htmlFor={id}
                className={cn(
                    'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/45 transition-all duration-200',
                    'peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-[#b8a2ff]',
                    'peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-xs',
                )}
            >
                {floatingText}
            </label>
        </div>
    );
}

export { FloatingInput };
