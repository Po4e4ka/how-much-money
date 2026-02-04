import { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type TooltipInfoProps = {
    text: string;
    ariaLabel?: string;
};

export function TooltipInfo({ text, ariaLabel }: TooltipInfoProps) {
    const [isTouch, setIsTouch] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const matcher = window.matchMedia('(hover: none) and (pointer: coarse)');
        const handleChange = () => setIsTouch(matcher.matches);
        handleChange();
        matcher.addEventListener('change', handleChange);
        return () => matcher.removeEventListener('change', handleChange);
    }, []);

    return (
        <Tooltip open={isTouch ? open : undefined} onOpenChange={setOpen}>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={ariaLabel ?? 'Подсказка'}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#6a5d52] transition hover:text-[#1c1a17] dark:text-white/60 dark:hover:text-white"
                    onClick={() => {
                        if (isTouch) {
                            setOpen((prev) => !prev);
                        }
                    }}
                >
                    <HelpCircle className="h-4 w-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-relaxed">
                {text}
            </TooltipContent>
        </Tooltip>
    );
}
