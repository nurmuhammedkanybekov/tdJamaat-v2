// Day-by-day consistency from what the app already counts on this phone:
// zikr and salawat (utils/zikr), tasbihat read and Quran pages read
// (app/practice). Nothing is invented: a day "kept" is a day with any of it.
import { dayKey } from '../utils/zikr';
import type { ZikrStore } from '../utils/zikr';
import type { PracticeStore } from './practice';

export interface DayMark {
    key: string;
    date: Date;
    /** Which practices that day had: zikr/salawat, tasbihat (0–5 prayers), pages. */
    zikr: number;
    tasbihat: number;
    pages: number;
    /** 0 = nothing, 1–3 = how many of the three kinds of practice were kept. */
    level: number;
}

const markOf = (zikr: ZikrStore, practice: PracticeStore, date: Date): DayMark => {
    const key = dayKey(date);
    const z = Object.values(zikr.days[key] ?? {}).reduce((a, b) => a + b, 0);
    const tb = (practice.tasbihat[key] ?? []).length;
    const pg = (practice.pages[key] ?? []).length;
    return { key, date, zikr: z, tasbihat: tb, pages: pg, level: (z > 0 ? 1 : 0) + (tb > 0 ? 1 : 0) + (pg > 0 ? 1 : 0) };
};

/** The last `n` days, oldest first. */
export const lastMarks = (zikr: ZikrStore, practice: PracticeStore, n: number, now = new Date()): DayMark[] =>
    Array.from({ length: n }, (_, i) => markOf(zikr, practice, new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i))));

/** Days in a row with any practice, ending today (or yesterday, if today is still empty). */
export const currentRun = (zikr: ZikrStore, practice: PracticeStore, now = new Date()): number => {
    let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (markOf(zikr, practice, d).level === 0) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    let n = 0;
    while (n < 400 && markOf(zikr, practice, d).level > 0) { n++; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1); }
    return n;
};

/** The longest run of kept days in everything stored. */
export const bestRun = (zikr: ZikrStore, practice: PracticeStore): number => {
    const keys = new Set([...Object.keys(zikr.days), ...Object.keys(practice.tasbihat), ...Object.keys(practice.pages)]);
    const kept = [...keys].filter(k => {
        const [y, m, d] = k.split('-').map(Number);
        return markOf(zikr, practice, new Date(y, m - 1, d)).level > 0;
    }).sort();
    let best = 0, run = 0, prev: Date | null = null;
    for (const k of kept) {
        const [y, m, d] = k.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        run = prev && Math.round((date.getTime() - prev.getTime()) / 864e5) === 1 ? run + 1 : 1;
        best = Math.max(best, run);
        prev = date;
    }
    return best;
};
