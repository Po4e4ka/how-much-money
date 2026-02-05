import type { ImgHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    const { alt, className, ...rest } = props;

    return (
        <>
            <img
                src="/img-white.png"
                alt={alt ?? 'Logo'}
                className={cn('block dark:hidden', className)}
                {...rest}
            />
            <img
                src="/img-black.png"
                alt={alt ?? 'Logo'}
                className={cn('hidden dark:block', className)}
                {...rest}
            />
        </>
    );
}
