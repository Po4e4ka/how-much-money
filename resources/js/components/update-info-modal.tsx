import type { ReactNode } from 'react';
import { PillButton } from '@/components/pill-button';

const UPDATE_INFO_MD = `
## Приложение обновилось!
___
## Что нового?

- исправления UI на странице с периодами при создании нового периода
- исправлено это окошко
- исправления UI страницы периода
- добавлен новый блок "рассчёт среднего на оставшиеся дни"
- поправлена цифра "Фактически среднее за период" - теперь считаются только заполненные дни

___
version: 0.1.2
`;

const UPDATE_INFO_CTA_LABEL = 'Круто!';

type UpdateInfoModalProps = {
    onConfirm: () => void;
    confirmDisabled?: boolean;
};

const renderInline = (text: string): ReactNode[] => {
    const parts = text.split('**');
    return parts.map((part, index) =>
        index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
    );
};

const renderMarkdown = (md: string): ReactNode[] => {
    const lines = md.trim().split('\n');
    const blocks: ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
        if (!listItems.length) return;
        blocks.push(
            <ul key={`list-${blocks.length}`} className="list-disc pl-5">
                {listItems.map((item, index) => (
                    <li key={index}>{renderInline(item)}</li>
                ))}
            </ul>,
        );
        listItems = [];
    };

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            flushList();
            return;
        }
        if (trimmed.startsWith('- ')) {
            listItems.push(trimmed.slice(2));
            return;
        }

        flushList();

        if (trimmed.startsWith('### ')) {
            blocks.push(
                <h4 key={`h4-${blocks.length}`} className="text-lg font-semibold">
                    {renderInline(trimmed.slice(4))}
                </h4>,
            );
            return;
        }
        if (trimmed.startsWith('## ')) {
            blocks.push(
                <h3 key={`h3-${blocks.length}`} className="text-xl font-semibold">
                    {renderInline(trimmed.slice(3))}
                </h3>,
            );
            return;
        }
        if (trimmed.startsWith('# ')) {
            blocks.push(
                <h2 key={`h2-${blocks.length}`} className="text-2xl font-semibold">
                    {renderInline(trimmed.slice(2))}
                </h2>,
            );
            return;
        }

        blocks.push(
            <p key={`p-${blocks.length}`} className="text-sm text-[#6a5d52] dark:text-white/70">
                {renderInline(trimmed)}
            </p>,
        );
    });

    flushList();

    return blocks;
};

export const UpdateInfoModal = ({
    onConfirm,
    confirmDisabled = false,
}: UpdateInfoModalProps) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
        <div className="w-full max-w-xl rounded-3xl border border-black/10 bg-white/95 p-6 text-[#1c1a17] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)] dark:border-white/10 dark:bg-[#1c1a17] dark:text-white">
            <div className="space-y-4">{renderMarkdown(UPDATE_INFO_MD)}</div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
                <PillButton
                    type="button"
                    onClick={onConfirm}
                    className="border-transparent bg-[#d87a4a] px-4 py-2 text-xs font-semibold text-white shadow-[0_14px_28px_-18px_rgba(216,122,74,0.8)] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={confirmDisabled}
                >
                    {UPDATE_INFO_CTA_LABEL}
                </PillButton>
            </div>
        </div>
    </div>
);
