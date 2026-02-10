import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem, SharedData } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { SessionExpiredModal } from '@/components/session-expired-modal';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Sharing',
        href: '/sharing',
    },
];

type ViewerInfo = {
    id: number;
    name: string;
    email: string;
};

type Viewer = {
    id: number;
    viewer_id: number;
    status: 'active' | 'blocked';
    viewer: ViewerInfo | null;
    created_at?: string | null;
};

type IncomingViewer = {
    id: number;
    user_id: number;
    status: 'active' | 'blocked';
    user: ViewerInfo | null;
    created_at?: string | null;
};

const statusLabels: Record<Viewer['status'], string> = {
    active: 'Активен',
    blocked: 'Заблокирован',
};

const statusBadgeVariant = (status: Viewer['status']) => {
    if (status === 'blocked') {
        return 'destructive' as const;
    }
    return 'secondary' as const;
};

export default function Sharing() {
    const { auth } = usePage<SharedData>().props;
    const [links, setLinks] = useState<Viewer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Viewer | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState<Record<number, boolean>>({});
    const [showSessionExpired, setShowSessionExpired] = useState(false);
    const [incoming, setIncoming] = useState<IncomingViewer[]>([]);
    const [incomingError, setIncomingError] = useState<string | null>(null);

    const listTitle = useMemo(() => {
        return auth?.user?.name
            ? `Кому открыт доступ от ${auth.user.name}`
            : 'Кому открыт доступ';
    }, [auth?.user?.name]);

    const fetchLinks = async () => {
        setIsLoading(true);
        setLoadError(null);

        try {
            const response = await fetch('/api/viewers');
            if (!response.ok) {
                throw new Error('Не удалось загрузить список доступов.');
            }

            const payload = (await response.json()) as { data: Viewer[] };
            setLinks(payload.data ?? []);
        } catch (err) {
            setLoadError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось загрузить список доступов.',
            );
        } finally {
            setIsLoading(false);
        }
    };

    const fetchIncoming = async () => {
        setIncomingError(null);
        try {
            const response = await fetch('/api/viewers/shared-with-me');
            if (!response.ok) {
                throw new Error('Не удалось загрузить доступы для просмотра.');
            }
            const payload = (await response.json()) as { data: IncomingViewer[] };
            setIncoming(payload.data ?? []);
        } catch (err) {
            setIncomingError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось загрузить доступы для просмотра.',
            );
        }
    };

    useEffect(() => {
        void fetchLinks();
        void fetchIncoming();
    }, []);

    const resetInviteState = () => {
        setInviteEmail('');
        setInviteError(null);
        setInviteSuccess(false);
    };

    const openInviteModal = () => {
        resetInviteState();
        setShowInviteModal(true);
    };

    const closeInviteModal = () => {
        setShowInviteModal(false);
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim()) {
            setInviteError('Введите почту пользователя.');
            return;
        }

        setInviteError(null);
        setInviteSuccess(false);
        setIsInviting(true);

        try {
            const token =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute('content') ?? '';

            const response = await fetch('/api/viewers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
                body: JSON.stringify({
                    email: inviteEmail.trim(),
                }),
            });

            if (response.status === 419) {
                setShowSessionExpired(true);
                return;
            }

            if (!response.ok) {
                const payload = (await response.json()) as { message?: string };
                setInviteError(
                    payload?.message ?? 'Не удалось отправить приглашение.',
                );
                return;
            }

            const payload = (await response.json()) as { data: Viewer };
            setLinks((prev) => [payload.data, ...prev]);
            setInviteSuccess(true);
            setInviteEmail('');
        } catch (err) {
            setInviteError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось отправить приглашение.',
            );
        } finally {
            setIsInviting(false);
        }
    };

    const handleToggleStatus = async (link: Viewer) => {
        setIsUpdating((prev) => ({ ...prev, [link.id]: true }));
        const nextStatus = link.status === 'active' ? 'blocked' : 'active';

        try {
            const token =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute('content') ?? '';

            const response = await fetch(`/api/viewers/${link.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
                body: JSON.stringify({
                    status: nextStatus,
                }),
            });

            if (response.status === 419) {
                setShowSessionExpired(true);
                return;
            }

            if (!response.ok) {
                throw new Error('Не удалось обновить статус.');
            }

            setLinks((prev) =>
                prev.map((item) =>
                    item.id === link.id
                        ? { ...item, status: nextStatus }
                        : item,
                ),
            );
        } catch (err) {
            setLoadError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось обновить статус.',
            );
        } finally {
            setIsUpdating((prev) => ({ ...prev, [link.id]: false }));
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        setIsDeleting(true);

        try {
            const token =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute('content') ?? '';

            const response = await fetch(`/api/viewers/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': token,
                },
            });

            if (response.status === 419) {
                setShowSessionExpired(true);
                return;
            }

            if (!response.ok) {
                throw new Error('Не удалось удалить доступ.');
            }

            setLinks((prev) => prev.filter((item) => item.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            setLoadError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось удалить доступ.',
            );
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sharing" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="font-display text-3xl">Доступ к периодам</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {listTitle}
                        </p>
                    </div>
                    <Button onClick={openInviteModal}>Добавить доступ</Button>
                </div>

                {loadError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {loadError}
                    </div>
                )}

                <div className="rounded-2xl border bg-card/60 p-6">
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Загрузка...</p>
                    ) : links.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Пока никому не выдан доступ.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {links.map((link) => (
                                <div
                                    key={link.id}
                                    className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-medium text-foreground">
                                                {link.viewer?.name || 'Без имени'}
                                            </p>
                                            <Badge variant={statusBadgeVariant(link.status)}>
                                                {statusLabels[link.status]}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {link.viewer?.email ?? 'Пользователь недоступен'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleStatus(link)}
                                            disabled={Boolean(isUpdating[link.id])}
                                        >
                                            {link.status === 'active'
                                                ? 'Заблокировать'
                                                : 'Разблокировать'}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => setDeleteTarget(link)}
                                        >
                                            Удалить
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border bg-card/60 p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="font-display text-2xl">
                                Доступы для просмотра
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Пользователи, которые дали вам доступ к своим периодам.
                            </p>
                        </div>
                    </div>

                    {incomingError && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {incomingError}
                        </div>
                    )}

                    <div className="mt-4">
                        {incoming.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Пока нет доступов для просмотра.
                            </p>
                        ) : (
                            <div className="divide-y">
                                {incoming.map((link) => (
                                    <div
                                        key={link.id}
                                        className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-medium text-foreground">
                                                    {link.user?.name || 'Без имени'}
                                                </p>
                                                <Badge
                                                    variant={statusBadgeVariant(
                                                        link.status,
                                                    )}
                                                >
                                                    {statusLabels[link.status]}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {link.user?.email ?? 'Пользователь недоступен'}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/shared/${link.user_id}`}>
                                                Посмотреть периоды
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Добавить доступ</DialogTitle>
                        <DialogDescription>
                            Укажите почту пользователя, которому хотите открыть доступ
                            к своим периодам.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="invite-email">Почта</Label>
                        <Input
                            id="invite-email"
                            type="email"
                            placeholder="user@email.com"
                            value={inviteEmail}
                            onChange={(event) => setInviteEmail(event.target.value)}
                        />
                        <InputError message={inviteError ?? undefined} />
                        {inviteSuccess && (
                            <p className="text-sm text-green-600">
                                Приглашение отправлено.
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={closeInviteModal}>
                            Отмена
                        </Button>
                        <Button onClick={handleInvite} disabled={isInviting}>
                            Отправить приглашение
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить доступ?</DialogTitle>
                        <DialogDescription>
                            {deleteTarget?.viewer?.email
                                ? `Удалить доступ для ${deleteTarget.viewer.email}?`
                                : 'Удалить доступ для этого пользователя?'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setDeleteTarget(null)}
                        >
                            Отмена
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            Удалить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {showSessionExpired && (
                <SessionExpiredModal
                    onClose={() => setShowSessionExpired(false)}
                    onReload={() => window.location.reload()}
                />
            )}
        </AppLayout>
    );
}
