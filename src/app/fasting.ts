// The calendar's own things, kept on this device (and, with a personal
// account, saved with it: cloud key 'calendar'): the fasts, the day plans
// (tasks, once or repeating) and a note for any day.
//
// Every entry carries the time it was last changed (`at`), and a removed one
// stays as a marker, so two devices agree: the later change wins, and a fast
// or a task taken away on the phone does not come back from the saved copy.
import { dayKey } from '../utils/zikr';
import { localChanged } from '../utils/localEvent';

import type { CalendarStore, FastKind, FastState, Repeat, Task, When, Fast } from '../utils/calendarStore';
import { emptyCalendar, normalizeCalendar } from '../utils/calendarStore';
export type { CalendarStore, FastKind, FastState, Repeat, Task, When, Fast, Note } from '../utils/calendarStore';
export { emptyCalendar, normalizeCalendar, mergeCalendarStores } from '../utils/calendarStore';

const KEY = 'tdjamaat-calendar-v1';
export const loadCalendar = (): CalendarStore => {
    try { return normalizeCalendar(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return emptyCalendar(); }
};

export const saveCalendar = (s: CalendarStore) => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
    localChanged();
    try { window.dispatchEvent(new Event('tdjamaat-calendar')); } catch { /* not in a browser */ }
};

/* ── fasts ─────────────────────────────────────────────────────────────── */

export const fastOn = (s: CalendarStore, day: Date): Fast | null => {
    const f = s.fasts[dayKey(day)];
    return f && f.s !== 'off' ? f : null;
};
export const setFast = (s: CalendarStore, day: Date, k: FastKind, state: FastState): CalendarStore =>
    ({ ...s, fasts: { ...s.fasts, [dayKey(day)]: { k, s: state, at: Date.now() } } });

/** Make-up fasts: owed from earlier years, plus Ramadan days marked missed, less those made up. */
export const qazaLedger = (s: CalendarStore) => {
    const all = Object.values(s.fasts);
    const missed = all.filter(f => f.k === 'ramadan' && f.s === 'missed').length;
    const madeUp = all.filter(f => f.k === 'qaza' && f.s === 'kept').length;
    const owed = s.qazaOwed + missed;
    return { earlier: s.qazaOwed, missed, madeUp, owed, left: Math.max(0, owed - madeUp) };
};

/* ── notes ─────────────────────────────────────────────────────────────── */

export const noteOn = (s: CalendarStore, day: Date) => s.notes[dayKey(day)]?.v ?? '';
export const setNote = (s: CalendarStore, day: Date, text: string): CalendarStore => {
    const v = text.slice(0, 2000);
    if ((s.notes[dayKey(day)]?.v ?? '') === v) return s;
    return { ...s, notes: { ...s.notes, [dayKey(day)]: { v, at: Date.now() } } };
};

/* ── tasks ─────────────────────────────────────────────────────────────── */

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const parse = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); };

/** Does the task fall on this day? */
export const occursOn = (task: Task, key: string): boolean => {
    if (task.gone || key < task.day || (task.until && key > task.until)) return false;
    if (task.repeat === 'none') return key === task.day;
    if (task.repeat === 'daily') return true;
    const a = parse(task.day), b = parse(key);
    if (task.repeat === 'weekly') return a.getDay() === b.getDay();
    // monthly: the same date; on a shorter month, its last day
    const last = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
    return b.getDate() === Math.min(a.getDate(), last);
};

// Prayers in their order through the day; clock times sort among them.
const WHEN_RANK: Record<string, number> = { fajr: 5 * 60, dhuhr: 13 * 60, asr: 16 * 60 + 30, maghrib: 18 * 60 + 30, isha: 20 * 60 };
const rank = (w: When) => (!w ? 24 * 60 : w in WHEN_RANK ? WHEN_RANK[w] : (() => { const [h, m] = w.split(':').map(Number); return h * 60 + m; })());

export const tasksOn = (s: CalendarStore, day: Date): Task[] => {
    const key = dayKey(day);
    return Object.values(s.tasks).filter(t => occursOn(t, key)).sort((a, b) => rank(a.when) - rank(b.when) || a.day.localeCompare(b.day) || a.id.localeCompare(b.id));
};
export const isDone = (task: Task, day: Date) => task.done.includes(dayKey(day));

/** One-off tasks of earlier days left undone (the oldest first). */
export const leftOver = (s: CalendarStore, today: Date): Task[] => {
    const key = dayKey(today);
    return Object.values(s.tasks).filter(t => !t.gone && t.repeat === 'none' && t.day < key && !t.done.includes(t.day)).sort((a, b) => a.day.localeCompare(b.day));
};

/** Planned fasts of earlier days, not yet marked kept or missed. */
export const unconfirmedFasts = (s: CalendarStore, today: Date) => {
    const key = dayKey(today);
    return Object.entries(s.fasts).filter(([d, f]) => f.s === 'plan' && d < key).map(([d, f]) => ({ day: parse(d), fast: f })).sort((a, b) => a.day.getTime() - b.day.getTime());
};

const put = (s: CalendarStore, task: Task): CalendarStore => ({ ...s, tasks: { ...s.tasks, [task.id]: { ...task, at: Date.now() } } });

export const addTask = (s: CalendarStore, day: Date, text: string, when: When = '', repeat: Repeat = 'none'): CalendarStore => {
    const v = text.trim().slice(0, 300);
    if (!v) return s;
    return put(s, { id: newId(), text: v, day: dayKey(day), when, repeat, until: '', done: [], at: 0 });
};
export const editTask = (s: CalendarStore, id: string, change: Partial<Pick<Task, 'text' | 'when' | 'repeat'>>): CalendarStore => {
    const task = s.tasks[id];
    if (!task) return s;
    const next = { ...task, ...change };
    if (change.text !== undefined) { next.text = change.text.trim().slice(0, 300); if (!next.text) return removeTask(s, id, parse(task.day)); }
    return put(s, next);
};
export const toggleTask = (s: CalendarStore, id: string, day: Date): CalendarStore => {
    const task = s.tasks[id];
    if (!task) return s;
    const key = dayKey(day);
    const done = task.done.includes(key) ? task.done.filter(d => d !== key) : [...task.done, key].sort();
    return put(s, { ...task, done });
};
/** A one-off task to another day (the left-over ones to today). */
export const moveTask = (s: CalendarStore, id: string, to: Date): CalendarStore => {
    const task = s.tasks[id];
    if (!task || task.repeat !== 'none') return s;
    return put(s, { ...task, day: dayKey(to), done: [] });
};
/** A one-off task goes; a repeating one stops from this day on (the days before keep their ticks). */
export const removeTask = (s: CalendarStore, id: string, from: Date): CalendarStore => {
    const task = s.tasks[id];
    if (!task) return s;
    const key = dayKey(from);
    if (task.repeat === 'none' || key <= task.day) return put(s, { ...task, gone: true });
    const prev = new Date(from); prev.setDate(prev.getDate() - 1);
    return put(s, { ...task, until: dayKey(prev) });
};
