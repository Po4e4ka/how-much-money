import type { ReactNode } from 'react';

type FormulaRowProps = {
    children: ReactNode;
    className?: string;
};

type FormulaValueProps = {
    children: ReactNode;
    className?: string;
};

type FormulaOpProps = {
    children: ReactNode;
    className?: string;
};

export const FormulaRow = ({ children, className }: FormulaRowProps) => (
    <div
        className={`flex flex-wrap items-center gap-2 text-xs font-semibold sm:text-sm ${
            className ?? ''
        }`}
    >
        {children}
    </div>
);

export const FormulaValue = ({ children, className }: FormulaValueProps) => (
    <span
        className={`font-display inline-flex items-center leading-[0.9] tabular-nums ${
            className ?? ''
        }`}
    >
        {children}
    </span>
);

export const FormulaOp = ({ children, className }: FormulaOpProps) => (
    <span
        className={`relative -top-[1px] inline-flex items-center leading-[0.9] text-black/50 dark:text-white/60 ${
            className ?? ''
        }`}
    >
        {children}
    </span>
);
