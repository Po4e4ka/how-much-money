import type {
    ComponentPropsWithoutRef,
    ElementType,
    ReactNode,
} from 'react';

type PillTone = 'neutral' | 'success' | 'danger' | 'accent';

type PillButtonProps<T extends ElementType = 'button'> = {
    as?: T;
    tone?: PillTone;
    active?: boolean;
    activeTone?: PillTone;
    className?: string;
    children: ReactNode;
} & ComponentPropsWithoutRef<T>;

const toneClasses: Record<PillTone, string> = {
    neutral: 'border-black/10 text-[#6a5d52] dark:border-white/10 dark:text-white/70',
    success: 'border-[#1e7b4f]/40 text-[#1e7b4f] dark:border-[#7ce0b3]/40 dark:text-[#7ce0b3]',
    danger: 'border-[#b0352b]/40 text-[#b0352b] dark:border-[#ff8b7c]/40 dark:text-[#ff8b7c]',
    accent:
        'border-[#1e7b4f]/40 bg-white/80 text-[#1e7b4f] shadow-[0_16px_32px_-24px_rgba(30,123,79,0.6)] group-hover:-translate-y-0.5 group-hover:bg-white dark:border-[#7ce0b3]/40 dark:bg-white/10 dark:text-[#7ce0b3]',
};

export const PillButton = <T extends ElementType = 'button'>({
    as,
    tone = 'neutral',
    active = false,
    activeTone,
    className,
    children,
    ...props
}: PillButtonProps<T>) => {
    const Component = as ?? 'button';
    const resolvedTone = active && activeTone ? activeTone : tone;
    return (
        <Component
            {...props}
            className={`rounded-full border px-3 py-1 text-xs transition ${toneClasses[resolvedTone]} ${
                className ?? ''
            }`}
        >
            {children}
        </Component>
    );
};
