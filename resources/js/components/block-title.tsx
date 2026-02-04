import type { ReactNode } from 'react';
import { TooltipInfo } from '@/components/tooltip-info';

type BlockTitleProps = {
    children: ReactNode;
    className?: string;
    tooltipText?: string;
    tooltipAriaLabel?: string;
};

export const BlockTitle = ({
    children,
    className,
    tooltipText,
    tooltipAriaLabel,
}: BlockTitleProps) => (
    <div
        className={`text-xs uppercase tracking-[0.3em] text-[#6a5d52] dark:text-white/60 ${
            className ?? ''
        }`}
    >
        <span>{children}</span>
        {tooltipText ? (
            <span className="ml-2 inline-flex align-middle">
                <TooltipInfo
                    text={tooltipText}
                    ariaLabel={tooltipAriaLabel ?? 'Дополнительная информация'}
                />
            </span>
        ) : null}
    </div>
);
