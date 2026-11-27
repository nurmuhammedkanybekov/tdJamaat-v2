import { describe, expect, it } from 'vitest';
import { hijriOf, noFast, ramadanDays, sunnahFast, upcoming } from './islamicCalendar';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 12);

describe('islamic calendar', () => {
    it('hijri with a correction', () => {
        const h = hijriOf(d(2026, 11, 27));
        const p = hijriOf(d(2026, 11, 27), 1);
        expect(h).not.toBeNull();
        expect(p!.day === h!.day + 1 || p!.day === 1).toBe(true);
    });
    it('sunnah days: Monday and Thursday, not Ramadan', () => {
        const mon = d(2026, 11, 23); // a Monday
        expect(mon.getDay()).toBe(1);
        expect(sunnahFast(mon, { day: 3, month: 6, year: 1448 })).not.toBeNull();
        expect(sunnahFast(mon, { day: 3, month: 9, year: 1448 })).toBeNull();
        expect(sunnahFast(d(2026, 11, 24), { day: 14, month: 6, year: 1448 })).not.toBeNull();
        expect(noFast({ day: 1, month: 10, year: 1448 })).toBe(true);
        expect(noFast({ day: 12, month: 12, year: 1448 })).toBe(true);
        expect(noFast({ day: 9, month: 12, year: 1448 })).toBe(false);
    });
    it('Ramadan 1448 has 29 or 30 days, all in month 9', () => {
        const days = ramadanDays(d(2026, 11, 27));
        expect(days.length).toBeGreaterThanOrEqual(29);
        expect(days.length).toBeLessThanOrEqual(30);
        expect(days.every(x => hijriOf(x)!.month === 9)).toBe(true);
        expect(hijriOf(days[0])!.day).toBe(1);
    });
    it('upcoming dates are in order', () => {
        const u = upcoming(d(2026, 11, 27), 0, 6);
        expect(u).toHaveLength(6);
        expect(u.every((x, i) => i === 0 || x.inDays >= u[i - 1].inDays)).toBe(true);
    });
});
