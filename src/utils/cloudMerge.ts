// What a personal account keeps, and how two copies of it become one: the
// phone's and the one saved from another device. Counts never add up twice
// (the larger is kept), marks are joined, and a setting made on this device
// wins over the saved one. Pure functions; src/services/cloudStore.ts does
// the reading and writing.

export type CloudKey = 'zikr' | 'practice' | 'quran' | 'tasbihat' | 'city' | 'calendar';
export const CLOUD_KEYS: CloudKey[] = ['zikr', 'practice', 'quran', 'tasbihat', 'city', 'calendar'];

import { mergeCalendarStores } from '../app/fasting';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const obj = (v: unknown): Obj => (isObj(v) ? v : {});
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** day → id → count: the larger count of each. */
const maxCounts = (a: unknown, b: unknown) => {
    const out: Record<string, Record<string, number>> = {};
    for (const src of [obj(a), obj(b)]) {
        for (const [day, ids] of Object.entries(src)) {
            const d = (out[day] ??= {});
            for (const [id, n] of Object.entries(obj(ids))) d[id] = Math.max(d[id] ?? 0, num(n));
        }
    }
    return out;
};

/** day → list: both lists joined. */
const joinDays = <T extends string | number>(a: unknown, b: unknown, sort: (x: T, y: T) => number) => {
    const out: Record<string, T[]> = {};
    for (const src of [obj(a), obj(b)]) {
        for (const [day, list] of Object.entries(src)) {
            if (!Array.isArray(list)) continue;
            out[day] = [...new Set([...(out[day] ?? []), ...(list as T[])])].sort(sort);
        }
    }
    return out;
};

export const mergeZikr = (local: unknown, saved: unknown) => {
    const l = obj(local), s = obj(saved);
    const current: Record<string, number> = {};
    for (const src of [obj(s.current), obj(l.current)]) for (const [id, n] of Object.entries(src)) current[id] = Math.max(current[id] ?? 0, num(n));
    // Own zikrs: both devices' kept (by id; this device's version first).
    const custom = new Map<string, Obj>();
    for (const src of [s.custom, l.custom]) if (Array.isArray(src)) for (const c of src) if (isObj(c) && typeof c.id === 'string') custom.set(c.id, c);
    const favs = Array.isArray(l.favs) && (l.favs.length || !Array.isArray(s.favs)) ? l.favs : Array.isArray(s.favs) ? s.favs : [];
    return { ...s, ...l, days: maxCounts(l.days, s.days), current, targets: { ...obj(s.targets), ...obj(l.targets) }, custom: [...custom.values()], favs, weekGoal: num(l.weekGoal) || num(s.weekGoal), weekPlan: { ...obj(s.weekPlan), ...obj(l.weekPlan) } };
};

export const mergePractice = (local: unknown, saved: unknown) => {
    const l = obj(local), s = obj(saved);
    return {
        tasbihat: joinDays<string>(l.tasbihat, s.tasbihat, (x, y) => x.localeCompare(y)),
        pages: joinDays<number>(l.pages, s.pages, (x, y) => x - y)
    };
};

export const mergeQuran = (local: unknown, saved: unknown) => {
    const l = obj(local), s = obj(saved);
    // The place one stopped reading: the later one (an older copy has no time: the phone's wins).
    const ll = isObj(l.last) ? l.last : null, sl = isObj(s.last) ? s.last : null;
    const last = ll && sl ? (String(sl.at ?? '') > String(ll.at ?? '') ? sl : ll) : ll ?? sl ?? undefined;
    const marks = new Map<string, Obj>();
    for (const src of [s.marks, l.marks]) {
        if (!Array.isArray(src)) continue;
        for (const m of src) if (isObj(m)) marks.set(`${m.surah}:${m.ayah}`, m);
    }
    const out: Obj = { ...s, ...l, marks: [...marks.values()] };
    if (last) out.last = last; else delete out.last;
    return out;
};

/** Fasts, tasks and notes: the later change of each (src/app/fasting.ts). */
export const mergeCalendar = (local: unknown, saved: unknown) => mergeCalendarStores(local, saved);

/** Settings: this device's choice, else the saved one. */
export const mergeSettings = (local: unknown, saved: unknown) => ({ ...obj(saved), ...obj(local) });

export const MERGE: Record<CloudKey, (local: unknown, saved: unknown) => unknown> = {
    zikr: mergeZikr,
    practice: mergePractice,
    quran: mergeQuran,
    tasbihat: mergeSettings,
    city: (local, saved) => local ?? saved,
    calendar: mergeCalendar
};
