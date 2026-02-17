import type { RefObject } from 'react';
import { PeriodCard } from '@/components/period-card';

type PeriodListItem = {
    id: number;
    title: string;
    subtitle: string;
    isClosed?: boolean;
    actualRemaining?: number | null;
    elementRef?: RefObject<HTMLAnchorElement | null>;
};

type PeriodListProps = {
    items: PeriodListItem[];
    baseHref?: string;
    itemHref?: (period: PeriodListItem) => string;
};

export const PeriodList = ({ items, baseHref, itemHref }: PeriodListProps) => (
    <div className="grid gap-4">
        {items.map((period) => (
            <PeriodCard
                key={period.id}
                href={itemHref?.(period) ?? `${baseHref ?? '/periods'}/${period.id}`}
                title={period.title}
                subtitle={period.subtitle}
                isClosed={period.isClosed}
                actualRemaining={period.actualRemaining}
                elementRef={period.elementRef}
            />
        ))}
    </div>
);
