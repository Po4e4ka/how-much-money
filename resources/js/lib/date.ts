export const normalizeDate = (value: string) => {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
        return '';
    }
    return trimmed.includes('T') ? trimmed.slice(0, 10) : trimmed;
};

export const parseDate = (value: string) => {
    const trimmed = normalizeDate(value);
    if (!trimmed) {
        return new Date('invalid');
    }
    const [year, month, day] = trimmed.split('-').map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
};

export const isValidDate = (value: string) => {
    const date = parseDate(value);
    return Number.isFinite(date.getTime());
};

export const dateKey = (value: string) => {
    const trimmed = normalizeDate(value);
    if (!trimmed) {
        return NaN;
    }
    return Number(trimmed.replaceAll('-', ''));
};

export const formatDateShort = (value: string) => {
    const date = parseDate(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
};

const formatMonthYear = (value: string) =>
    new Intl.DateTimeFormat('ru-RU', {
        month: 'long',
        year: 'numeric',
    }).format(parseDate(value));

export const formatMonthRange = (start: string, end: string) => {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
        month: 'short',
    });
    const startMonth = formatter.format(parseDate(start));
    const endMonth = formatter.format(parseDate(end));
    const startYear = parseDate(start).getFullYear();
    const endYear = parseDate(end).getFullYear();

    if (startYear === endYear) {
        if (startMonth === endMonth) {
            return formatMonthYear(start);
        }
        return `${startMonth}–${endMonth} ${startYear}`;
    }

    return `${startMonth} ${startYear} – ${endMonth} ${endYear}`;
};

export const addMonthsClamp = (value: string, months: number) => {
    if (!value) {
        return '';
    }
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
        return '';
    }
    const targetMonth = month - 1 + months;
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    const nextDay = Math.min(day, lastDay);
    const nextMonth = String(normalizedMonth + 1).padStart(2, '0');
    const nextDate = String(nextDay).padStart(2, '0');
    return `${targetYear}-${nextMonth}-${nextDate}`;
};

export const calculateDaysInclusive = (start: string, end: string) => {
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
};

export const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
