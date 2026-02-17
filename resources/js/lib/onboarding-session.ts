const ONBOARDING_TOUR_COMPLETED_KEY = 'onboarding:tour:completed';
const ONBOARDING_TOUR_STARTED_KEY = 'onboarding:tour:started';
const ONBOARDING_PERIOD_GUIDE_COMPLETED_KEY =
    'onboarding:period-guide:completed';

export const isTourCompleted = () => {
    if (typeof window === 'undefined') {
        return false;
    }
    return window.sessionStorage.getItem(ONBOARDING_TOUR_COMPLETED_KEY) === '1';
};

export const markTourCompleted = () => {
    if (typeof window === 'undefined') {
        return;
    }
    window.sessionStorage.setItem(ONBOARDING_TOUR_COMPLETED_KEY, '1');
};

export const isTourStarted = () => {
    if (typeof window === 'undefined') {
        return false;
    }
    return window.sessionStorage.getItem(ONBOARDING_TOUR_STARTED_KEY) === '1';
};

export const markTourStarted = () => {
    if (typeof window === 'undefined') {
        return;
    }
    window.sessionStorage.setItem(ONBOARDING_TOUR_STARTED_KEY, '1');
};

export const resetTourSession = () => {
    if (typeof window === 'undefined') {
        return;
    }
    window.sessionStorage.removeItem(ONBOARDING_TOUR_STARTED_KEY);
    window.sessionStorage.removeItem(ONBOARDING_TOUR_COMPLETED_KEY);
    window.sessionStorage.removeItem(ONBOARDING_PERIOD_GUIDE_COMPLETED_KEY);
};

export const isPeriodGuideCompleted = () => {
    if (typeof window === 'undefined') {
        return false;
    }
    return (
        window.sessionStorage.getItem(ONBOARDING_PERIOD_GUIDE_COMPLETED_KEY) ===
        '1'
    );
};

export const markPeriodGuideCompleted = () => {
    if (typeof window === 'undefined') {
        return;
    }
    window.sessionStorage.setItem(ONBOARDING_PERIOD_GUIDE_COMPLETED_KEY, '1');
};
