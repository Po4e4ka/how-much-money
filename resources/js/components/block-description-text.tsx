import type { ReactNode } from 'react';

type BlockDescriptionTextProps = {
    children: ReactNode;
    className?: string;
};

export const BlockDescriptionText = ({
    children,
    className,
}: BlockDescriptionTextProps) => (
    <p
        className={`mt-2 text-xs text-[#6a5d52] dark:text-white/60 ${
            className ?? ''
        }`}
    >
        {children}
    </p>
);
