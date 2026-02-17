import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import type { AppLayoutProps } from '@/types';

export default function AppHeaderLayout({
    children,
    breadcrumbs,
    hideBreadcrumbsOnMobile,
    hideHeader,
}: AppLayoutProps) {
    return (
        <AppShell>
            {!hideHeader && (
                <AppHeader
                    breadcrumbs={breadcrumbs}
                    hideBreadcrumbsOnMobile={hideBreadcrumbsOnMobile}
                />
            )}
            <AppContent>{children}</AppContent>
        </AppShell>
    );
}
