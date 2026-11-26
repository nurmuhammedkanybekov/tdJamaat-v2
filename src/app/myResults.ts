// The logic behind "Менин жыйынтыгым" (a member's own results), kept apart
// from the page so it can be tested. A member can read only their own house,
// so everything here is computed on that house alone, and only the awards
// that do not depend on other houses are shown.
import type { DataFile } from '../types';
import type { Award } from '../utils/badges';
import { STRONG_METRICS, metricsAtPlan, strongWeek } from '../utils/badges';
import type { MemberWeek } from '../utils/insights';
import { streakUntil } from '../utils/insights';

/** The data with every other house left out (members can read nothing else anyway). */
export const houseOnly = (data: DataFile, houseId: string): DataFile => ({
    ...data,
    weeks: data.weeks.map(w => ({ ...w, teams: w.teams.filter(tm => tm.id === houseId) }))
});

/** Awards that follow from a person's own numbers alone. "Апта жылдызы",
 *  "Сыйлык тепкичи" and "Чоң секирик" compare everyone in the jamaat, which a
 *  member's view cannot see, so they are left out rather than shown wrong. */
export const SELF_CONTAINED = new Set(['perfect', 'iron-3', 'iron-5', 'double', 'rising', 'steady-4', 'steady-8', 'steady-16', 'full-season']);

export interface MyAward { award: Award; count: number; weeks: number[]; reasons: string[] }

/** A person's own awards, one entry per kind, the rarest first. */
export const myAwards = (awards: Award[], memberId: string): MyAward[] => {
    const order = { seal: 0, gold: 1, silver: 2, bronze: 3 } as const;
    const by = new Map<string, MyAward>();
    for (const a of awards) {
        if (a.holderId !== memberId || !SELF_CONTAINED.has(a.def.id)) continue;
        const cur = by.get(a.def.id);
        if (cur) { cur.count++; cur.weeks.push(a.weekNumber); cur.reasons.push(a.reason); }
        else by.set(a.def.id, { award: a, count: 1, weeks: [a.weekNumber], reasons: [a.reason] });
    }
    return [...by.values()].sort((x, y) => order[x.award.def.tier] - order[y.award.def.tier] || y.count - x.count);
};

export interface Goal { id: string; have: number; need: number }

/**
 * The next awards within reach, measured at the given week:
 * a perfect week (metrics at plan out of 8), the perfect-plan run (3, then 5)
 * and the run of strong weeks (4, 8, 16).
 */
export const nextGoals = (weeks: MemberWeek[], weekIndex: number): Goal[] => {
    const w = weeks.find(x => x.weekIndex === weekIndex);
    const out: Goal[] = [];
    if (w && w.submitted && !w.perfect) out.push({ id: 'perfect', have: metricsAtPlan(w), need: 8 });
    const perfectRun = streakUntil(weeks, weekIndex, x => x.perfect);
    if (perfectRun > 0 && perfectRun < 5) out.push({ id: perfectRun < 3 ? 'iron-3' : 'iron-5', have: perfectRun, need: perfectRun < 3 ? 3 : 5 });
    const strongRun = streakUntil(weeks, weekIndex, strongWeek);
    const strongNeed = [4, 8, 16].find(n => strongRun < n);
    if (strongNeed) out.push({ id: `steady-${strongNeed}`, have: strongRun, need: strongNeed });
    return out;
};

export { STRONG_METRICS };
