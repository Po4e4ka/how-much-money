type BlockSepLineProps = {
    className?: string;
};

export const BlockSepLine = ({ className }: BlockSepLineProps) => (
    <div
        className={`h-px w-full bg-black/10 dark:bg-white/10 ${className ?? ''}`}
    />
);
