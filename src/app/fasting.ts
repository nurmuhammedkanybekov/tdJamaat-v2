// Fasts and the day plans, kept on this device (and with a personal account,
// saved with it: cloud key 'calendar').
import { dayKey } from '../utils/zikr';
import { localChanged } from '../utils/localEvent';

export type FastKind = 'ramadan' | 'sunnah' | 'nafl' | 'qaza' | 'nazr';
export interface CalendarStore {
    /** day → the fast kept that day */
    fasts: Record<string, FastKind>;
    /** day → what the person plans for that day */
    notes: Record<string, string>;
    /** fasts owed from earlier Ramadans (missed days to make up) */
    qazaOwed: number;
    /** −1, 0 or +1: the hijri date as announced where the person lives */
    offset: number;
}

const KEY = 'tdjamaat-calendar-v1';
export const emptyCalendar = (): CalendarStore => ({ fasts: {}, notes: {}, qazaOwed: 0, offset: 0 });

export const loadCalendar = (): CalendarStore => {
    try {
        const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<CalendarStore> | null;
        return { ...emptyCalendar(), ...(s ?? {}), fasts: s?.fasts ?? {}, notes: s?.notes ?? {} };
    } catch { return emptyCalendar(); }
};

export const saveCalendar = (s: CalendarStore) => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
    localChanged();
    try { window.dispatchEvent(new Event('tdjamaat-calendar')); } catch { /* not in a browser */ }
};

export const setFast = (s: CalendarStore, day: Date, kind: FastKind | null): CalendarStore => {
    const fasts = { ...s.fasts };
    if (kind) fasts[dayKey(day)] = kind; else delete fasts[dayKey(day)];
    return { ...s, fasts };
};

export const setNote = (s: CalendarStore, day: Date, text: string): CalendarStore => {
    const notes = { ...s.notes };
    const v = text.trim().slice(0, 500);
    if (v) notes[dayKey(day)] = v; else delete notes[dayKey(day)];
    return { ...s, notes };
};

export const fastOn = (s: CalendarStore, day: Date) => s.fasts[dayKey(day)] ?? null;
export const qazaDone = (s: CalendarStore) => Object.values(s.fasts).filter(k => k === 'qaza').length;
