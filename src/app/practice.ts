// What a person does in the app, kept on this phone: zikr counts (utils/zikr),
// tasbihat read, Quran pages read — and the jamaat week (Thursday → Wednesday)
// added up the way the captain's form asks for it.
//
// Nothing here is sent anywhere unless the person is signed in and chooses to
// (src/app/sync.ts); the counts work offline and without an account.
import { dayKey, loadZikr } from '../utils/zikr';
import type { ZikrStore } from '../utils/zikr';
import { thursdayOf } from '../utils/weekDates';

const KEY = 'tdjamaat-practice-v1';
const KEEP_DAYS = 400;

export interface PracticeStore {
    /** day → prayers whose tasbihat was read that day */
    tasbihat: Record<string, string[]>;
    /** day → mushaf pages read that day */
    pages: Record<string, number[]>;
}

const empty = (): PracticeStore => ({ tasbihat: {}, pages: {} });

export const loadPractice = (): PracticeStore => {
    try {
        const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PracticeStore> | null;
        return { tasbihat: s?.tasbihat ?? {}, pages: s?.pages ?? {} };
    } catch { return empty(); }
};

const trim = <T>(days: Record<string, T>): Record<string, T> => {
    const keys = Object.keys(days).sort();
    const out = { ...days };
    for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete out[k];
    return out;
};

export const savePractice = (s: PracticeStore) => {
    try { localStorage.setItem(KEY, JSON.stringify({ tasbihat: trim(s.tasbihat), pages: trim(s.pages) })); } catch { /* storage blocked */ }
    window.dispatchEvent(new Event('tdjamaat-practice'));
};

export const markTasbihat = (s: PracticeStore, prayer: string, done: boolean, now = new Date()): PracticeStore => {
    const key = dayKey(now);
    const have = new Set(s.tasbihat[key] ?? []);
    if (done) have.add(prayer); else have.delete(prayer);
    return { ...s, tasbihat: { ...s.tasbihat, [key]: [...have] } };
};

export const tasbihatDone = (s: PracticeStore, prayer: string, now = new Date()) => (s.tasbihat[dayKey(now)] ?? []).includes(prayer);

export const addPages = (s: PracticeStore, pages: number[], now = new Date()): PracticeStore => {
    const key = dayKey(now);
    const have = new Set(s.pages[key] ?? []);
    const before = have.size;
    pages.forEach(p => have.add(p));
    if (have.size === before) return s;
    return { ...s, pages: { ...s.pages, [key]: [...have].sort((a, b) => a - b) } };
};

/** Takes a page back (marked by mistake). */
export const removePage = (s: PracticeStore, page: number, now = new Date()): PracticeStore => {
    const key = dayKey(now);
    const have = (s.pages[key] ?? []).filter(p => p !== page);
    return { ...s, pages: { ...s.pages, [key]: have } };
};

export const pageReadToday = (s: PracticeStore, page: number, now = new Date()) => (s.pages[dayKey(now)] ?? []).includes(page);

export const pagesOn = (s: PracticeStore, now = new Date()) => (s.pages[dayKey(now)] ?? []).length;

/** The zikr ids counted as salawat (СВТ); every other zikr is ИСТГ. */
export const SALAWAT_IDS = new Set(['salawat']);

export interface WeekTotals {
    /** Thursday the week began */
    start: string;
    /** Wednesday it ends */
    end: string;
    salawat: number;
    zikr: number;
    tasbihat: number;
    pages: number;
}

/** Totals of the jamaat week that contains `now` (Thursday → Wednesday). */
export const weekTotals = (zikr: ZikrStore, practice: PracticeStore, now = new Date()): WeekTotals => {
    const start = thursdayOf(now);
    const [y, m, d] = start.split('-').map(Number);
    const end = dayKey(new Date(y, m - 1, d + 6));
    let salawat = 0, other = 0, tasbihat = 0, pages = 0;
    for (let i = 0; i < 7; i++) {
        const key = dayKey(new Date(y, m - 1, d + i));
        for (const [id, n] of Object.entries(zikr.days[key] ?? {})) {
            if (SALAWAT_IDS.has(id)) salawat += n; else other += n;
        }
        tasbihat += (practice.tasbihat[key] ?? []).length;
        pages += (practice.pages[key] ?? []).length;
    }
    return { start, end, salawat, zikr: other, tasbihat, pages };
};

export const currentWeekTotals = (now = new Date()) => weekTotals(loadZikr(), loadPractice(), now);
