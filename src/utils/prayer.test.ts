import { describe, expect, it } from 'vitest';
import { CITIES, clock, nextPrayer, prayerNow, prayerTimes } from './prayer';

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

describe('prayerNow', () => {
    const bp = CITIES[0];
    const day = new Date('2026-11-26T12:00:00Z');
    const times = prayerTimes(bp, day);
    const at = (d: Date, min: number) => new Date(d.getTime() + min * 60000);
    it('after Maghrib it is Maghrib, ending at Isha', () => {
        const p = prayerNow(bp, at(times.maghrib, 30));
        expect(p.active?.key).toBe('maghrib');
        expect(p.active?.endsKey).toBe('isha');
        expect(p.next.key).toBe('isha');
    });
    it('Fajr ends at sunrise; between sunrise and Dhuhr no prayer is running', () => {
        expect(prayerNow(bp, at(times.fajr, 5)).active?.endsKey).toBe('sunrise');
        const mid = prayerNow(bp, at(times.sunrise, 30));
        expect(mid.active).toBeNull();
        expect(mid.next.key).toBe('dhuhr');
    });
    it('before Fajr it is still last night\'s Isha', () => {
        const p = prayerNow(bp, at(times.fajr, -20));
        expect(p.active?.key).toBe('isha');
        expect(p.active?.endsKey).toBe('fajr');
    });
    it('after Isha it lasts until the next Fajr', () => {
        const p = prayerNow(bp, at(times.isha, 60));
        expect(p.active?.key).toBe('isha');
        expect(p.active!.endsAt.getTime()).toBeGreaterThan(times.isha.getTime());
    });
});
