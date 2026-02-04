import type { ReactNode } from 'react';

type BigDigitProps = {
    children: ReactNode;
    className?: string;
};

export const BigDigit = ({ children, className }: BigDigitProps) => (
    <div className={`font-display text-2xl ${className ?? ''}`}>
        {children}
    </div>
);
