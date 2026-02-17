import { ApiError } from '@/lib/api';
import {
    closeOnboardingPeriod,
    deleteOnboardingPeriod,
    getOnboardingPeriod,
    onboardingExpenseSuggestions,
    pinOnboardingPeriod,
    updateOnboardingPeriod,
} from '@/lib/onboarding-periods';

const periodIdFromPath = (path: string): number => {
    const match = path.match(/\/api\/periods\/(\d+)/);
    if (!match) {
        throw new ApiError('Неверный путь запроса.', 400, null);
    }
    return Number(match[1]);
};

const parseBody = (init: RequestInit): Record<string, unknown> => {
    if (!init.body || typeof init.body !== 'string') {
        return {};
    }
    try {
        return JSON.parse(init.body) as Record<string, unknown>;
    } catch {
        return {};
    }
};

export const onboardingApiFetch = async <T = unknown>(
    input: RequestInfo | URL,
    init: RequestInit = {},
): Promise<T> => {
    const rawUrl = String(input);
    const [path, query = ''] = rawUrl.split('?');
    const method = (init.method ?? 'GET').toUpperCase();
    const body = parseBody(init);

    if (path.includes('/expense-suggestions') && method === 'GET') {
        const periodId = periodIdFromPath(path);
        const params = new URLSearchParams(query);
        const type = (params.get('type') ??
            'mandatory') as 'income' | 'mandatory' | 'external' | 'unforeseen';
        return {
            data: onboardingExpenseSuggestions(periodId, type),
        } as T;
    }

    if (path.endsWith('/close') && method === 'POST') {
        const periodId = periodIdFromPath(path);
        return { data: closeOnboardingPeriod(periodId) } as T;
    }

    if (path.endsWith('/pin') && method === 'POST') {
        const periodId = periodIdFromPath(path);
        return {
            data: pinOnboardingPeriod(
                periodId,
                Boolean(body.pinned),
                Boolean(body.force),
            ),
        } as T;
    }

    if (path.startsWith('/api/periods/') && method === 'GET') {
        const periodId = periodIdFromPath(path);
        const period = getOnboardingPeriod(periodId);
        return {
            data: period,
        } as T;
    }

    if (path.startsWith('/api/periods/') && method === 'PUT') {
        const periodId = periodIdFromPath(path);
        const updated = updateOnboardingPeriod(periodId, body);
        return { data: updated } as T;
    }

    if (path.startsWith('/api/periods/') && method === 'DELETE') {
        const periodId = periodIdFromPath(path);
        deleteOnboardingPeriod(periodId);
        return null as T;
    }

    throw new ApiError('Неподдерживаемый onboarding-запрос.', 400, {
        path,
        method,
    });
};

