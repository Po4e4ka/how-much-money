import { PeriodCard } from '@/components/period-card';

type PeriodListItem = {
    id: number;
    title: string;
    subtitle: string;
    isClosed?: boolean;
    actualRemaining?: number | null;
};

type PeriodListProps = {
    items: PeriodListItem[];
    baseHref?: string;
};

export const PeriodList = ({ items, baseHref }: PeriodListProps) => (
    <div className="grid gap-4">
        {items.map((period) => (
            <PeriodCard
                key={period.id}
                href={`${baseHref ?? '/periods'}/${period.id}`}
                title={period.title}
                subtitle={period.subtitle}
                isClosed={period.isClosed}
                actualRemaining={period.actualRemaining}
            />
        ))}
    </div>
);
