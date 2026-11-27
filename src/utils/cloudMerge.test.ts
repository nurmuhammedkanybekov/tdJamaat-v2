import { describe, expect, it } from 'vitest';
import { mergePractice, mergeQuran, mergeSettings, mergeZikr } from './cloudMerge';

describe('cloud merge', () => {
    it('zikr: keeps the larger count, never adds twice', () => {
        const a = { days: { '2026-11-27': { subhanallah: 33, salawat: 10 } }, current: { subhanallah: 3 }, targets: { salawat: 100 } };
        const b = { days: { '2026-11-27': { subhanallah: 20 }, '2026-11-26': { salawat: 5 } }, current: { subhanallah: 7 }, targets: { salawat: 50, x: 1 } };
        const m = mergeZikr(a, b);
        expect(m.days).toEqual({ '2026-11-27': { subhanallah: 33, salawat: 10 }, '2026-11-26': { salawat: 5 } });
        expect(m.current).toEqual({ subhanallah: 7 });
        expect(m.targets).toEqual({ salawat: 100, x: 1 });
        // same both ways for the counts
        expect(mergeZikr(b, a).days).toEqual(m.days);
    });

    it('practice: joins the days', () => {
        const m = mergePractice({ tasbihat: { d1: ['fajr'] }, pages: { d1: [3, 1] } }, { tasbihat: { d1: ['isha', 'fajr'], d2: ['asr'] }, pages: { d1: [2] } });
        expect(m.tasbihat).toEqual({ d1: ['fajr', 'isha'], d2: ['asr'] });
        expect(m.pages).toEqual({ d1: [1, 2, 3] });
    });

    it('quran: the later place, joined bookmarks, local settings', () => {
        const local = { last: { surah: 2, ayah: 5, at: '2026-11-20T10:00:00Z' }, size: 2, marks: [{ surah: 1, ayah: 1 }] };
        const saved = { last: { surah: 3, ayah: 9, at: '2026-11-25T10:00:00Z' }, size: 1.6, mode: 'mushaf', marks: [{ surah: 1, ayah: 1 }, { surah: 36, ayah: 1 }] };
        const m = mergeQuran(local, saved);
        expect(m.last).toEqual(saved.last);
        expect(m.size).toBe(2);
        expect(m.mode).toBe('mushaf');
        expect(m.marks).toHaveLength(2);
        expect(mergeQuran({ last: { surah: 1, ayah: 2 } }, {}).last).toEqual({ surah: 1, ayah: 2 });
    });

    it('survives junk', () => {
        expect(mergeZikr(null, 'x').days).toEqual({});
        expect(mergePractice(undefined, { tasbihat: { d: 'no' } })).toEqual({ tasbihat: {}, pages: {} });
        expect(mergeSettings({ a: 1 }, { a: 2, b: 3 })).toEqual({ a: 1, b: 3 });
    });
});
