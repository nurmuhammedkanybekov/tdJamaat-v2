import { describe, expect, it } from 'vitest';
import { AFTER_PRAYER, ZIKRS, addCount, allTime, emptyStore, lastDays, resetCurrent, streak, todayOf, todayTotal } from './zikr';

const d = (day: number) => new Date(2026, 10, day, 12);

describe('zikr counter', () => {
    it('counts per zikr and per day', () => {
        let s = emptyStore();
        s = addCount(s, 'subhanallah', 1, d(10)); s = addCount(s, 'subhanallah', 1, d(10)); s = addCount(s, 'salawat', 5, d(10));
        s = addCount(s, 'subhanallah', 1, d(11));
        expect(todayOf(s, 'subhanallah', d(10))).toBe(2);
        expect(todayTotal(s, d(10))).toBe(7);
        expect(todayTotal(s, d(11))).toBe(1);
        expect(allTime(s)).toBe(8);
        expect(allTime(s, 'subhanallah')).toBe(3);
        expect(s.current.subhanallah).toBe(3);
    });

    it('undo takes one back but never below zero, and never from another day', () => {
        let s = addCount(emptyStore(), 'tahlil', 2, d(10));
        s = addCount(s, 'tahlil', -1, d(10));
        expect(todayOf(s, 'tahlil', d(10))).toBe(1);
        s = addCount(s, 'tahlil', -5, d(10));
        expect(todayOf(s, 'tahlil', d(10))).toBe(0);
        expect(s.current.tahlil).toBe(0);
        s = addCount(s, 'tahlil', 3, d(10));
        s = addCount(s, 'tahlil', -1, d(11));       // a new day: yesterday's count is not touched
        expect(todayOf(s, 'tahlil', d(10))).toBe(3);
    });

    it('starting again keeps what was already counted today', () => {
        let s = addCount(emptyStore(), 'istighfar', 40, d(10));
        s = resetCurrent(s, 'istighfar');
        expect(s.current.istighfar).toBe(0);
        expect(todayOf(s, 'istighfar', d(10))).toBe(40);
    });

    it('the last days and the streak', () => {
        let s = emptyStore();
        for (const day of [8, 9, 10]) s = addCount(s, 'salawat', 10, d(day));
        expect(lastDays(s, 3, d(10)).map(x => x.total)).toEqual([10, 10, 10]);
        expect(streak(s, d(10))).toBe(3);
        expect(streak(s, d(11))).toBe(3);   // today still empty: the run is not broken yet
        expect(streak(s, d(12))).toBe(0);
    });

    it('the after-prayer set is 33 + 33 + 34 of known zikrs', () => {
        expect(AFTER_PRAYER.map(x => x.count)).toEqual([33, 33, 34]);
        expect(AFTER_PRAYER.every(x => ZIKRS.some(z => z.id === x.id))).toBe(true);
        expect(ZIKRS.length).toBe(10);
    });
});

describe('weekly plan', () => {
    it('counts the jamaat week and the pace for today', async () => {
        const { planRows, setPlan, emptyStore, addCount } = await import('./zikr');
        // Saturday 28 Nov 2026: the week began on Thursday 26th; 5 days left with today.
        const sat = new Date(2026, 10, 28, 12);
        let s = setPlan(emptyStore(), 'salawat', 700);
        s = addCount(s, 'salawat', 200, new Date(2026, 10, 26, 12));
        s = addCount(s, 'salawat', 50, sat);
        const [row] = planRows(s, sat);
        expect(row.done).toBe(250);
        expect(row.daysLeft).toBe(5);
        // 500 left before today over 5 days → 100 today, 50 already said
        expect(row.todayPace).toBe(50);
        expect(setPlan(s, 'salawat', 0).weekPlan).toEqual({});
    });
});
