import { useEffect, useRef, useState } from 'react';
import { API_ERROR_EVENT } from '@/lib/api';

export default function ApiErrorToast() {
    const [visible, setVisible] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const onError = () => {
            setVisible(true);

            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = window.setTimeout(() => {
                setVisible(false);
                timeoutRef.current = null;
            }, 2800);
        };

        window.addEventListener(API_ERROR_EVENT, onError);

        return () => {
            window.removeEventListener(API_ERROR_EVENT, onError);
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            aria-live="polite"
            className={[
                'pointer-events-none fixed right-4 bottom-4 z-[110] transition-all duration-300',
                visible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-2 opacity-0',
            ].join(' ')}
        >
            <div className="rounded-xl border border-[#b8a2ff]/40 bg-[#1a2230]/95 px-4 py-3 text-sm font-medium text-[#f1edff] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.75)] backdrop-blur">
                Что-то пошло не так
            </div>
        </div>
    );
}
