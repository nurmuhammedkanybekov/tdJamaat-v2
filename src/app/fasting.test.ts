import { describe, expect, it } from 'vitest';
import { addTask, emptyCalendar, leftOver, mergeCalendarStores, moveTask, normalizeCalendar, occursOn, qazaLedger, removeTask, setFast, tasksOn, toggleTask, unconfirmedFasts, isDone, fastOn } from './fasting';

const d = (s: string) => new Date(`${s}T12:00:00`);

describe('calendar store', () => {
    it('reads the first version (a bare kind per day, a bare note; Назир becomes nafl)', () => {
        const s = normalizeCalendar({ fasts: { '2026-11-02': 'sunnah', '2026-11-03': 'nazr', '2026-11-04': 'odd' }, notes: { '2026-11-02': 'hello' }, qazaOwed: 4 });
        expect(s.fasts['2026-11-02']).toEqual({ k: 'sunnah', s: 'kept', at: 0 });
        expect(s.fasts['2026-11-03'].k).toBe('nafl');
        expect(s.fasts['2026-11-04']).toBeUndefined();
        expect(s.notes['2026-11-02'].v).toBe('hello');
        expect(s.qazaOwed).toBe(4);
    });

    it('repeats: daily, weekly, monthly (a short month takes its last day), and stops', () => {
        let s = addTask(emptyCalendar(), d('2026-01-31'), 'monthly', '', 'monthly');
        const m = Object.values(s.tasks)[0];
        expect(occursOn(m, '2026-02-28')).toBe(true);
        expect(occursOn(m, '2026-03-31')).toBe(true);
        expect(occursOn(m, '2026-01-30')).toBe(false);
        s = addTask(emptyCalendar(), d('2026-11-26'), 'weekly', 'fajr', 'weekly'); // a Thursday
        const w = Object.values(s.tasks)[0];
        expect(occursOn(w, '2026-12-03')).toBe(true);
        expect(occursOn(w, '2026-12-04')).toBe(false);
        s = removeTask(s, w.id, d('2026-12-10'));
        const stopped = Object.values(s.tasks)[0];
        expect(stopped.until).toBe('2026-12-09');
        expect(occursOn(stopped, '2026-12-03')).toBe(true);
        expect(occursOn(stopped, '2026-12-10')).toBe(false);
    });

    it('ticks a day, keeps the rest, sorts by prayer', () => {
        let s = addTask(emptyCalendar(), d('2026-11-28'), 'evening', 'isha');
        s = addTask(s, d('2026-11-28'), 'morning', 'fajr');
        s = addTask(s, d('2026-11-28'), 'any');
        expect(tasksOn(s, d('2026-11-28')).map(x => x.text)).toEqual(['morning', 'evening', 'any']);
        const id = tasksOn(s, d('2026-11-28'))[0].id;
        s = toggleTask(s, id, d('2026-11-28'));
        expect(isDone(s.tasks[id], d('2026-11-28'))).toBe(true);
        s = toggleTask(s, id, d('2026-11-28'));
        expect(isDone(s.tasks[id], d('2026-11-28'))).toBe(false);
    });

    it('left-over one-off tasks move to today', () => {
        let s = addTask(emptyCalendar(), d('2026-11-20'), 'old');
        s = addTask(s, d('2026-11-21'), 'done one');
        const done = Object.values(s.tasks).find(x => x.text === 'done one')!;
        s = toggleTask(s, done.id, d('2026-11-21'));
        const left = leftOver(s, d('2026-11-28'));
        expect(left.map(x => x.text)).toEqual(['old']);
        s = moveTask(s, left[0].id, d('2026-11-28'));
        expect(leftOver(s, d('2026-11-28'))).toEqual([]);
        expect(tasksOn(s, d('2026-11-28')).map(x => x.text)).toEqual(['old']);
    });

    it('make-up fasts: earlier years + missed Ramadan days − made up', () => {
        let s = { ...emptyCalendar(), qazaOwed: 3 };
        s = setFast(s, d('2026-02-20'), 'ramadan', 'missed');
        s = setFast(s, d('2026-02-21'), 'ramadan', 'kept');
        s = setFast(s, d('2026-05-04'), 'qaza', 'kept');
        s = setFast(s, d('2026-05-05'), 'qaza', 'plan');
        expect(qazaLedger(s)).toEqual({ earlier: 3, missed: 1, madeUp: 1, owed: 4, left: 3 });
        expect(unconfirmedFasts(s, d('2026-11-28')).length).toBe(1);
        s = setFast(s, d('2026-05-05'), 'qaza', 'off');
        expect(fastOn(s, d('2026-05-05'))).toBeNull();
    });

    it('two devices: the later change of each entry wins, so a removal does not come back', () => {
        const old = { fasts: { '2026-11-02': { k: 'sunnah', s: 'kept', at: 100 } }, notes: { '2026-11-02': { v: 'a', at: 100 } }, tasks: {} };
        const phone = { fasts: { '2026-11-02': { k: 'sunnah', s: 'off', at: 200 } }, notes: { '2026-11-02': { v: 'b', at: 50 } }, tasks: {} };
        const m = mergeCalendarStores(phone, old);
        expect(m.fasts['2026-11-02'].s).toBe('off');
        expect(m.notes['2026-11-02'].v).toBe('a');
        // the saved copy has a task the phone never saw: it is kept
        const saved = addTask(emptyCalendar(), d('2026-11-28'), 'from laptop');
        expect(Object.values(mergeCalendarStores(emptyCalendar(), saved).tasks).map(x => x.text)).toEqual(['from laptop']);
    });
});
