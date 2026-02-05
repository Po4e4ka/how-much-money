import { useCallback, useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type UsePwaInstallReturn = {
    readonly canInstall: boolean;
    readonly isStandalone: boolean;
    readonly promptInstall: () => Promise<boolean>;
};

const listeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let standaloneState = false;
let initialized = false;

const isStandaloneMode = (): boolean => {
    if (typeof window === 'undefined') return false;

    const navigatorStandalone =
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        navigatorStandalone
    );
};

const notify = () => {
    listeners.forEach((listener) => listener());
};

export const initPwaInstallListener = (): void => {
    if (initialized || typeof window === 'undefined') return;
    initialized = true;

    const updateStandalone = () => {
        standaloneState = isStandaloneMode();
        notify();
    };

    const handleBeforeInstall = (event: Event) => {
        event.preventDefault();
        deferredPrompt = event as BeforeInstallPromptEvent;
        notify();
    };

    const handleInstalled = () => {
        deferredPrompt = null;
        updateStandalone();
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');

    updateStandalone();
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    mediaQuery.addEventListener('change', updateStandalone);
};

export function usePwaInstall(): UsePwaInstallReturn {
    const [installPrompt, setInstallPrompt] =
        useState<BeforeInstallPromptEvent | null>(deferredPrompt);
    const [isStandalone, setIsStandalone] = useState(standaloneState);

    useEffect(() => {
        const handleChange = () => {
            setInstallPrompt(deferredPrompt);
            setIsStandalone(standaloneState);
        };

        listeners.add(handleChange);
        return () => listeners.delete(handleChange);
    }, []);

    const promptInstall = useCallback(async () => {
        if (!deferredPrompt) return false;

        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        deferredPrompt = null;
        notify();
        return choice.outcome === 'accepted';
    }, []);

    return {
        canInstall: Boolean(installPrompt) && !isStandalone,
        isStandalone,
        promptInstall,
    } as const;
}
