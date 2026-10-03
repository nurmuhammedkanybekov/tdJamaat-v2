import { describe, expect, it } from 'vitest';
import { formatHijri, isRamadan, toHijri } from './hijri';

describe('hijri', () => {
    it('converts a known date (3 Oct 2026 = 22 Rabius-sani 1448)', () => {
        const h = toHijri(new Date('2026-10-03T12:00:00Z'))!;
        expect(h).toEqual({ day: 22, month: 4, year: 1448 });
        expect(formatHijri(h)).toBe('22 Рабиус-сани 1448');
    });

    it('detects Ramadan (1 Mar 2025 was 1 Ramadan 1446)', () => {
        expect(isRamadan(toHijri(new Date('2025-03-10T12:00:00Z')))).toBe(true);
        expect(isRamadan(toHijri(new Date('2026-10-03T12:00:00Z')))).toBe(false);
    });
});
