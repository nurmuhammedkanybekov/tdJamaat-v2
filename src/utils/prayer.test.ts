import { describe, expect, it } from 'vitest';
import { CITIES, clock, nextPrayer, prayerTimes } from './prayer';

describe('prayer times (Budapest)', () => {
    const bp = CITIES[0];
    it('gives six times in the right order on a normal day', () => {
        const t = prayerTimes(bp, new Date('2026-10-03T10:00:00Z'));
        const order = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map(d => d.getTime());
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        // Budapest early October: Dhuhr around 12:30 local, Maghrib around 18:35
        expect(clock(t.dhuhr, bp.tz)).toMatch(/^12:[2-4]\d$/);
        expect(clock(t.maghrib, bp.tz)).toMatch(/^18:[2-4]\d$/);
    });

    it('works in midsummer (high-latitude nights)', () => {
        const t = prayerTimes(bp, new Date('2027-06-21T10:00:00Z'));
        expect(t.isha.getTime()).toBeGreaterThan(t.maghrib.getTime());
        expect(t.fajr.getTime()).toBeLessThan(t.sunrise.getTime());
    });

    it('after Isha, the next prayer is tomorrow\'s Fajr', () => {
        const late = new Date('2026-10-03T21:30:00Z'); // 23:30 in Budapest
        const n = nextPrayer(bp, late);
        expect(n.key).toBe('fajr');
        expect(n.at.getTime()).toBeGreaterThan(late.getTime());
    });
});
