import { describe, expect, it } from 'vitest';
import { bestRun, currentRun, lastMarks } from './consistency';
import type { ZikrStore } from '../utils/zikr';
import type { PracticeStore } from './practice';

const now = new Date(2026, 10, 26, 12);
const zikr: ZikrStore = { days: { '2026-11-26': { salawat: 10 }, '2026-11-25': { istighfar: 3 }, '2026-11-20': { salawat: 1 } }, current: {}, targets: {} };
const practice: PracticeStore = { tasbihat: { '2026-11-24': ['fajr'], '2026-11-26': ['fajr', 'isha'] }, pages: { '2026-11-26': [1, 2], '2026-11-21': [5] } };

describe('consistency', () => {
    it('marks each day by the kinds of practice kept', () => {
        const m = lastMarks(zikr, practice, 3, now);
        expect(m.map(d => d.key)).toEqual(['2026-11-24', '2026-11-25', '2026-11-26']);
        expect(m.map(d => d.level)).toEqual([1, 1, 3]);
        expect(m[2].tasbihat).toBe(2);
    });
    it('counts the current run back from today', () => {
        expect(currentRun(zikr, practice, now)).toBe(3); // 24, 25, 26
    });
    it('a run still counts while today is empty', () => {
        expect(currentRun(zikr, practice, new Date(2026, 10, 27, 9))).toBe(3);
        expect(currentRun(zikr, practice, new Date(2026, 10, 28, 9))).toBe(0);
    });
    it('finds the best run in everything stored', () => {
        expect(bestRun(zikr, practice)).toBe(3); // 20–21 is 2, 24–26 is 3
    });
});
