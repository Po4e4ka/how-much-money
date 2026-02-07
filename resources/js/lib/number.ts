export const formatCurrency = (value: number) =>
    `${Math.max(0, Math.round(value)).toLocaleString('ru-RU')} ₽`;

export const formatSignedCurrency = (value: number) => {
    const rounded = Math.round(value);
    if (rounded === 0) {
        return '0 ₽';
    }
    const sign = rounded > 0 ? '+' : '−';
    return `${sign}${Math.abs(rounded).toLocaleString('ru-RU')} ₽`;
};

export const toIntegerValue = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits === '') {
        return '';
    }
    return Number(digits);
};

export const toNumberOrZero = (value: number | '') =>
    value === '' ? 0 : Number(value);
