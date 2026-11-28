// The calendar's saved shape and how two copies of it become one. Pure: no
// app imports, so the cloud sync can use it (src/app/fasting.ts uses it too).

export type FastKind = 'ramadan' | 'sunnah' | 'nafl' | 'qaza';
/** plan: intended; kept: fasted; missed: did not (a missed Ramadan day is owed); off: removed */
export type FastState = 'plan' | 'kept' | 'missed' | 'off';
export interface Fast { k: FastKind; s: FastState; at: number }

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly';
/** A prayer the task follows, or a clock time 'HH:MM'. */
export type When = '' | 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | `${number}:${number}`;
export interface Task {
    id: string;
    text: string;
    /** the first day (a one-off task: its day) */
    day: string;
    when: When;
    repeat: Repeat;
    /** the last day a repeating task runs ('' = no end) */
    until: string;
    /** the days it was done on */
    done: string[];
    gone?: boolean;
    at: number;
}
export interface Note { v: string; at: number }

export interface CalendarStore {
    fasts: Record<string, Fast>;
    tasks: Record<string, Task>;
    notes: Record<string, Note>;
    /** fasts owed from earlier years (before what the calendar records) */
    qazaOwed: number;
    /** −1, 0 or +1: the hijri date as announced where the person lives */
    offset: number;
}

export const emptyCalendar = (): CalendarStore => ({ fasts: {}, tasks: {}, notes: {}, qazaOwed: 0, offset: 0 });

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const KINDS: FastKind[] = ['ramadan', 'sunnah', 'nafl', 'qaza'];
const STATES: FastState[] = ['plan', 'kept', 'missed', 'off'];
const REPEATS: Repeat[] = ['none', 'daily', 'weekly', 'monthly'];
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Any saved shape (the first version kept a bare kind per day and a bare note) → this one. */
export const normalizeCalendar = (raw: unknown): CalendarStore => {
    const s = isObj(raw) ? raw : {};
    const fasts: Record<string, Fast> = {};
    for (const [day, v] of Object.entries(isObj(s.fasts) ? s.fasts : {})) {
        if (typeof v === 'string') {
            const k = v === 'nazr' ? 'nafl' : v;
            if (KINDS.includes(k as FastKind)) fasts[day] = { k: k as FastKind, s: 'kept', at: 0 };
        } else if (isObj(v) && KINDS.includes(v.k as FastKind)) {
            fasts[day] = { k: v.k as FastKind, s: STATES.includes(v.s as FastState) ? v.s as FastState : 'kept', at: num(v.at) };
        }
    }
    const notes: Record<string, Note> = {};
    for (const [day, v] of Object.entries(isObj(s.notes) ? s.notes : {})) {
        if (typeof v === 'string') notes[day] = { v, at: 0 };
        else if (isObj(v) && typeof v.v === 'string') notes[day] = { v: v.v, at: num(v.at) };
    }
    const tasks: Record<string, Task> = {};
    for (const [id, v] of Object.entries(isObj(s.tasks) ? s.tasks : {})) {
        if (!isObj(v) || typeof v.text !== 'string' || typeof v.day !== 'string') continue;
        tasks[id] = {
            id, text: v.text, day: v.day,
            when: (typeof v.when === 'string' ? v.when : '') as When,
            repeat: REPEATS.includes(v.repeat as Repeat) ? v.repeat as Repeat : 'none',
            until: typeof v.until === 'string' ? v.until : '',
            done: Array.isArray(v.done) ? v.done.filter((d): d is string => typeof d === 'string') : [],
            gone: v.gone === true || undefined,
            at: num(v.at)
        };
    }
    return { fasts, tasks, notes, qazaOwed: Math.max(0, Math.min(9999, Math.round(num(s.qazaOwed)))), offset: Math.max(-2, Math.min(2, Math.round(num(s.offset)))) };
};

/** Two copies (this device's and the saved one) → one: for each day and task, the later change. */
export const mergeCalendarStores = (local: unknown, saved: unknown): CalendarStore => {
    const l = normalizeCalendar(local), s = normalizeCalendar(saved);
    const pick = <T extends { at: number }>(a: Record<string, T>, b: Record<string, T>) => {
        const out: Record<string, T> = { ...b };
        for (const [k, v] of Object.entries(a)) if (!out[k] || v.at >= out[k].at) out[k] = v;
        return out;
    };
    // a tick or untick changes the task's time too, so the later copy holds the right days
    const tasks = pick(l.tasks, s.tasks);
    return { fasts: pick(l.fasts, s.fasts), tasks, notes: pick(l.notes, s.notes), qazaOwed: l.qazaOwed, offset: l.offset };
};

