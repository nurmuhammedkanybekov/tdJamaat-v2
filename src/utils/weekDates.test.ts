import { describe, expect, it } from 'vitest';
import { formatWeekRange, isThursday, thursdayOf, weekRange } from './weekDates';

describe('jamaat weeks: Thursday → Wednesday', () => {
    it('counts weeks from the anchor Thursday', () => {
        expect(weekRange('2026-11-19', 0)).toEqual({ start: '2026-11-19', end: '2026-11-25' });
        expect(weekRange('2026-11-19', 2)).toEqual({ start: '2026-12-03', end: '2026-12-09' });
        expect(weekRange('2026-12-31', 1)).toEqual({ start: '2027-01-07', end: '2027-01-13' });
    });
    it('knows a Thursday, and the Thursday a day belongs to', () => {
        expect(isThursday('2026-11-19')).toBe(true);
        expect(isThursday('2026-11-20')).toBe(false);
        expect(isThursday('nope')).toBe(false);
        expect(thursdayOf(new Date(2026, 10, 19, 9))).toBe('2026-11-19');   // Thursday itself
        expect(thursdayOf(new Date(2026, 10, 25, 23))).toBe('2026-11-19');  // Wednesday
        expect(thursdayOf(new Date(2026, 10, 26, 0, 30))).toBe('2026-11-26'); // next Thursday
    });
    it('formats a range in Kyrgyz', () => {
        expect(formatWeekRange('2026-11-19', '2026-11-25')).toBe('19–25 ноябрь');
        expect(formatWeekRange('2026-11-26', '2026-12-02')).toBe('26 ноябрь – 2 декабрь');
        expect(formatWeekRange(null, null)).toBe('');
    });
});
