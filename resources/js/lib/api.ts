import { getCsrfToken } from '@/lib/csrf';

type JsonRecord = Record<string, unknown>;

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
export const API_ERROR_EVENT = 'app:api-error';

export class ApiError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

export const isApiError = (error: unknown): error is ApiError =>
    error instanceof ApiError;

const notifyApiError = (error: ApiError) => {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(
        new CustomEvent(API_ERROR_EVENT, {
            detail: {
                status: error.status,
                message: error.message,
            },
        }),
    );
};

const firstValidationError = (data: JsonRecord): string | null => {
    const maybeErrors = data.errors;
    if (!maybeErrors || typeof maybeErrors !== 'object') {
        return null;
    }

    for (const value of Object.values(maybeErrors as JsonRecord)) {
        if (Array.isArray(value) && typeof value[0] === 'string') {
            return value[0];
        }
    }

    return null;
};

const extractMessage = (data: unknown, status: number): string => {
    if (typeof data === 'string' && data.trim()) {
        return data;
    }

    if (data && typeof data === 'object') {
        const record = data as JsonRecord;
        if (typeof record.message === 'string' && record.message.trim()) {
            return record.message;
        }

        const validation = firstValidationError(record);
        if (validation) {
            return validation;
        }
    }

    if (status === 419) {
        return 'Сессия истекла. Обновите страницу и попробуйте снова.';
    }

    return `Request failed with status ${status}`;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }

    const text = await response.text();
    return text || null;
};

export const apiFetch = async <T = unknown>(
    input: RequestInfo | URL,
    init: RequestInit = {},
): Promise<T> => {
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);

    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }
    if (!headers.has('X-Requested-With')) {
        headers.set('X-Requested-With', 'XMLHttpRequest');
    }
    if (MUTATION_METHODS.has(method) && !headers.has('X-XSRF-TOKEN')) {
        const token = getCsrfToken();
        if (token) {
            headers.set('X-XSRF-TOKEN', token);
        }
    }

    const response = await fetch(input, {
        credentials: 'same-origin',
        ...init,
        headers,
    });
    const payload = await parseResponseBody(response);

    if (!response.ok) {
        const error = new ApiError(
            extractMessage(payload, response.status),
            response.status,
            payload,
        );
        notifyApiError(error);
        throw error;
    }

    return payload as T;
};
