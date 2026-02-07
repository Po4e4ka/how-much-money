import type { CSSProperties } from 'react';

export const delay = (ms: number) =>
    ({ '--delay': `${ms}ms` } as CSSProperties);
