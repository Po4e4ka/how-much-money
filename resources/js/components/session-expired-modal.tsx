import { PillButton } from '@/components/pill-button';

type SessionExpiredModalProps = {
    onClose: () => void;
    onReload: () => void;
};

export const SessionExpiredModal = ({
    onClose,
    onReload,
}: SessionExpiredModalProps) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
        <div className="w-full max-w-xl rounded-lg border border-black/10 bg-white/95 p-6 text-[#1c1a17] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)] dark:border-white/10 dark:bg-[#1c1a17] dark:text-white">
            <h3 className="font-display text-2xl">Сессия истекла</h3>
            <p className="mt-3 text-sm text-[#6a5d52] dark:text-white/70">
                Сессия истекла, поэтому действие не выполнено. Обновите страницу
                и повторите попытку.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
                <PillButton
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2"
                >
                    Закрыть
                </PillButton>
                <PillButton
                    type="button"
                    onClick={onReload}
                    tone="success"
                    className="px-4 py-2"
                >
                    Обновить страницу
                </PillButton>
            </div>
        </div>
    </div>
);
