// Plans: what a person means to memorize or read, how far they are, and
// whether anyone should look at it. Pure functions, used by the member's
// page and by the captain's and admin's overview.
import type { JattooGoal, JattooRecord, PlanStatus, PlanTrack } from './jattoo';
import { quranAyahs } from './jattoo';

export interface StudyEntry {
    id: number;
    goalId: number | null;
    memberId: string;
    track: 'reading' | 'book';
    title: string | null;
    amount: number;
    pageFrom: number | null;
    pageTo: number | null;
    onDay: string;
    note: string | null;
}

export interface PlanEvent {
    id: number;
    goalId: number;
    kind: 'created' | 'extended' | 'paused' | 'resumed' | 'done' | 'dropped' | 'reopened' | 'changed';
    oldDue: string | null;
    newDue: string | null;
    note: string | null;
    byRole: string | null;
    at: string;
}

export type PlanState = 'done' | 'ontrack' | 'behind' | 'overdue' | 'open' | 'paused' | 'dropped' | 'stalled';

export interface PlanView {
    plan: JattooGoal;
    track: PlanTrack;
    done: number;
    /** Hifz: ayahs the person noted but no captain has heard yet. */
    pending: number;
    target: number;
    pct: number;
    state: PlanState;
    /** To reach the due date: units per week from now (null without one). */
    perWeek: number | null;
    /** Days since anything was written for this plan (null: never). */
    quietDays: number | null;
    /** 'YYYY-MM-DD' of the last progress. */
    lastDay: string | null;
}

const day = (s: string) => Date.parse(`${s.slice(0, 10)}T00:00:00Z`);
const daysBetween = (a: string, b: string) => Math.round((day(b) - day(a)) / 86400000);

export const trackOf = (g: JattooGoal): PlanTrack => g.track ?? 'hifz';

/** Progress of one plan from the records and the reading log. */
export const planView = (raw: JattooGoal, records: JattooRecord[], log: StudyEntry[], today: string): PlanView => {
    const g = raw.startDate ? raw : { ...raw, startDate: today };
    const track = trackOf(g);
    const mine = records.filter(r => r.memberId === g.memberId);
    let done = 0, pending = 0, lastDay: string | null = null;
    if (track === 'hifz') {
        const heard = mine.filter(r => r.verified !== false);
        const noted = mine.filter(r => r.verified === false);
        if (g.category === 'quran' && g.surah) {
            const a = quranAyahs(heard, g.surah, g.ayahFrom ?? 1, g.ayahTo ?? Infinity);
            const b = quranAyahs(noted, g.surah, g.ayahFrom ?? 1, g.ayahTo ?? Infinity);
            done = a.size;
            pending = [...b].filter(x => !a.has(x)).length;
            const rel = mine.filter(r => r.category === 'quran' && r.surah === g.surah);
            lastDay = rel.map(r => r.recitedOn).sort().pop() ?? null;
        } else {
            const same = (r: JattooRecord) => r.category === g.category && r.title.trim().toLowerCase() === g.title.trim().toLowerCase();
            done = heard.filter(same).reduce((s, r) => s + r.amount, 0);
            pending = noted.filter(same).reduce((s, r) => s + r.amount, 0);
            lastDay = mine.filter(same).map(r => r.recitedOn).sort().pop() ?? null;
        }
    } else {
        const entries = log.filter(e => e.goalId === g.id);
        if (track === 'reading' && g.pageFrom && g.pageTo) {
            const pages = new Set<number>();
            for (const e of entries) {
                if (e.pageFrom && e.pageTo) for (let p = Math.max(e.pageFrom, g.pageFrom); p <= Math.min(e.pageTo, g.pageTo); p++) pages.add(p);
            }
            const loose = entries.filter(e => !e.pageFrom).reduce((s, e) => s + e.amount, 0);
            done = pages.size + loose;
        } else {
            done = entries.reduce((s, e) => s + e.amount, 0);
        }
        lastDay = entries.map(e => e.onDay).sort().pop() ?? null;
    }
    const target = Math.max(1, g.target);
    done = Math.min(done, target);
    const pct = Math.round((done / target) * 100);
    const status: PlanStatus = g.status ?? 'active';
    const quietDays = lastDay ? daysBetween(lastDay, today) : null;
    let state: PlanState = 'open';
    let perWeek: number | null = null;
    if (status === 'done' || done >= target) state = 'done';
    else if (status === 'paused') state = 'paused';
    else if (status === 'dropped') state = 'dropped';
    else if (g.dueDate) {
        const left = daysBetween(today, g.dueDate);
        if (left < 0) state = 'overdue';
        else {
            const total = Math.max(1, daysBetween(g.startDate, g.dueDate));
            const expected = target * Math.min(1, Math.max(0, daysBetween(g.startDate, today) / total));
            state = done + 1e-9 >= expected ? 'ontrack' : 'behind';
            perWeek = Math.ceil((target - done) / Math.max(1, left / 7));
        }
    }
    // Nothing written for three weeks on a running plan: someone should ask.
    if ((state === 'open' || state === 'ontrack') && daysBetween(lastDay ?? g.startDate, today) > 21) state = 'stalled';
    return { plan: g, track, done, pending, target, pct, state, perWeek, quietDays, lastDay };
};

/** How much a plan needs attention (higher first): overdue, waiting to be heard, behind, stalled… */
export const attention = (v: PlanView): number =>
    v.state === 'overdue' ? 50 : v.pending > 0 ? 40 : v.state === 'behind' ? 30 : v.state === 'stalled' ? 20 : v.state === 'paused' ? 5 : v.state === 'done' || v.state === 'dropped' ? 0 : 10;

/** A suggested new due date when a plan is extended: at the pace so far. */
export const suggestDue = (v: PlanView, today: string): string => {
    const started = v.plan.startDate;
    const elapsed = Math.max(7, daysBetween(started, today));
    const rate = v.done > 0 ? v.done / elapsed : 0;
    const need = v.target - v.done;
    const daysMore = rate > 0 ? Math.ceil(need / rate) : 28;
    const d = new Date(day(today) + Math.min(365, Math.max(7, daysMore)) * 86400000);
    return d.toISOString().slice(0, 10);
};

/** Short summary of one person's plans, for an overview row. */
export const planSummary = (j: { goals: JattooGoal[]; records: JattooRecord[]; log?: StudyEntry[] } | undefined, memberId: string, today: string) => {
    const views = (j?.goals ?? []).filter(g => g.memberId === memberId).map(g => planView(g, j?.records ?? [], j?.log ?? [], today));
    const active = views.filter(v => v.state !== 'done' && v.state !== 'dropped');
    return {
        active: active.length,
        done: views.filter(v => v.state === 'done').length,
        late: active.filter(v => v.state === 'overdue' || v.state === 'behind' || v.state === 'stalled').length,
        waiting: (j?.records ?? []).filter(r => r.memberId === memberId && r.verified === false).length,
        score: Math.max(0, ...views.map(attention))
    };
};
