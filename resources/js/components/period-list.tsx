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
};

export const PeriodList = ({ items }: PeriodListProps) => (
    <div className="grid gap-4">
        {items.map((period) => (
            <PeriodCard
                key={period.id}
                href={`/periods/${period.id}`}
                title={period.title}
                subtitle={period.subtitle}
                isClosed={period.isClosed}
                actualRemaining={period.actualRemaining}
            />
        ))}
    </div>
);
