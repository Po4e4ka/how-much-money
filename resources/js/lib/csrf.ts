const readCookie = (name: string): string | null => {
    if (typeof document === 'undefined') {
        return null;
    }

    const value = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith(`${name}=`))
        ?.split('=')
        .slice(1)
        .join('=');

    return value ? decodeURIComponent(value) : null;
};

export const getCsrfToken = (): string => {
    const cookieToken = readCookie('XSRF-TOKEN');
    if (cookieToken) {
        return cookieToken;
    }

    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? ''
    );
};

export const withCsrfHeaders = (
    headers: Record<string, string> = {},
): Record<string, string> => {
    const token = getCsrfToken();

    if (!token) {
        return headers;
    }

    return {
        ...headers,
        'X-XSRF-TOKEN': token,
    };
};
