import { describe, expect, it } from 'vitest';
import { addCount, emptyStore } from '../utils/zikr';
import { addPages, markTasbihat, pagesOn, tasbihatDone, weekTotals } from './practice';

const at = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };

describe('practice', () => {
    it('adds the jamaat week from Thursday to Wednesday', () => {
        let z = emptyStore();
        z = addCount(z, 'salawat', 100, at('2026-11-19')); // Thursday
        z = addCount(z, 'istighfar', 50, at('2026-11-25')); // Wednesday
        z = addCount(z, 'istighfar', 7, at('2026-11-18')); // Wednesday before: last week
        let p = { tasbihat: {}, pages: {} };
        p = markTasbihat(p, 'fajr', true, at('2026-11-20'));
        p = markTasbihat(p, 'isha', true, at('2026-11-20'));
        p = markTasbihat(p, 'isha', true, at('2026-11-20'));
        p = addPages(p, [1, 2, 2, 3], at('2026-11-21'));
        const w = weekTotals(z, p, at('2026-11-24'));
        expect(w).toEqual({ start: '2026-11-19', end: '2026-11-25', salawat: 100, zikr: 50, tasbihat: 2, pages: 3 });
        expect(tasbihatDone(p, 'fajr', at('2026-11-20'))).toBe(true);
        expect(pagesOn(p, at('2026-11-21'))).toBe(3);
        expect(markTasbihat(p, 'fajr', false, at('2026-11-20')).tasbihat['2026-11-20']).toEqual(['isha']);
    });
});

describe('ayah of the day', () => {
    it('points at real ayahs and changes daily', async () => {
        const { DAILY_AYAHS, ayahOfDay } = await import('./quranData');
        const { SURAHS } = await import('../utils/quranMeta');
        for (const [s, a] of DAILY_AYAHS) expect(a).toBeLessThanOrEqual(SURAHS[s - 1][2]);
        expect(ayahOfDay(new Date(2026, 10, 24))).not.toEqual(ayahOfDay(new Date(2026, 10, 25)));
    });
});
