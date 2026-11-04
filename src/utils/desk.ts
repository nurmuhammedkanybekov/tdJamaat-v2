// "The desk": what a captain (or the admin) needs to see first after logging
// in — their own house's week at a glance, and what to do next. Pure
// functions over the same DataFile/Insights the views use, so every number
// here matches the tables.
import type { DataFile, MetricValues, WeekData } from '../types';
import type { Insights } from './insights';
import { METRICS, PLAN_SCORE, weekOf } from './insights';
import { calculateMemberScore, countedMembers, metricPoints, weights } from './scoring';

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface HouseDesk {
    houseId: string;
    houseName: string;
    weekNumber: number;
    /** Week number across seasons (what the data entry form works with). */
    globalWeek: number;
    locked: boolean;
    /** The house has entered this week. */
    entered: boolean;
    /** Place among houses whose week counts (null if it doesn't count yet). */
    rank: number | null;
    /** Houses ranked this week. */
    ranked: number;
    rating: number | null;
    /** Rating change since the house's previous counted week. */
    change: number | null;
    /** The house just above / just below in the rating, with the gap in points. */
    above: { name: string; gap: number } | null;
    below: { name: string; gap: number } | null;
    /** People counted (excused left out) and how many reached the full plan score. */
    people: number;
    onPlan: number;
    best: { id: string; name: string; score: number } | null;
    /** Where the house lost the most points: the metric, how much the house
     *  rating would rise if everyone below plan there had met it, and who
     *  they are. (Counted per person, so one person's surplus never hides
     *  another's shortfall.) */
    weakest: { metric: keyof MetricValues; missing: number; below: string[] } | null;
}

export const houseDesk = (data: DataFile, insights: Insights, houseId: string, weekIndex: number): HouseDesk | null => {
    const week = data.weeks[weekIndex];
    const team = week?.teams.find(it => it.id === houseId);
    const series = insights.houses.get(houseId);
    if (!week || !team || !series) return null;

    const hw = weekOf(series.weeks, weekIndex);
    const counted = !!hw?.submitted && hw.rank !== null;
    const rating = counted ? hw!.avg : null;

    const others = [...insights.houses.values()]
        .filter(h => h.id !== houseId)
        .map(h => ({ name: h.name, w: weekOf(h.weeks, weekIndex) }))
        .filter((x): x is { name: string; w: NonNullable<typeof x.w> } => !!x.w && x.w.submitted && x.w.rank !== null);
    const ranked = others.length + (counted ? 1 : 0);

    let above: HouseDesk['above'] = null, below: HouseDesk['below'] = null;
    if (rating !== null) {
        const higher = others.filter(o => o.w.avg > rating).sort((a, b) => a.w.avg - b.w.avg)[0];
        const lower = others.filter(o => o.w.avg <= rating).sort((a, b) => b.w.avg - a.w.avg)[0];
        if (higher) above = { name: higher.name, gap: round1(higher.w.avg - rating) };
        if (lower) below = { name: lower.name, gap: round1(rating - lower.w.avg) };
    }

    const previous = series.weeks.filter(w => w.weekIndex < weekIndex && w.submitted).at(-1);
    const change = rating !== null && previous ? round1(rating - previous.avg) : null;

    const people = countedMembers(team);
    const scored = people.map(m => ({ id: m.id, name: m.name, score: calculateMemberScore(m) }));
    const bestPerson = team.submitted ? scored.reduce<HouseDesk['best']>((b, p) => (p.score > 0 && (!b || p.score > b.score) ? p : b), null) : null;
    let weakest: HouseDesk['weakest'] = null;
    if (team.submitted && people.length > 0) {
        for (const m of METRICS) {
            let lost = 0;
            const below: string[] = [];
            for (const p of people) {
                if (!((p.target[m] || 0) > 0)) continue;   // no plan set: nothing to earn
                const short = weights[m] - metricPoints(p)[m];
                if (short > 1e-9) { lost += short; below.push(p.name); }
            }
            const missing = round1(lost / people.length);
            if (missing > 0 && (!weakest || missing > weakest.missing)) weakest = { metric: m, missing, below };
        }
    }

    return {
        houseId, houseName: team.name, weekNumber: week.weekNumber, globalWeek: week.globalWeek, locked: week.locked,
        entered: team.submitted, rank: counted ? hw!.rank : null, ranked, rating, change, above, below,
        people: people.length,
        onPlan: team.submitted ? scored.filter(p => p.score >= PLAN_SCORE - 0.05).length : 0,
        best: bestPerson,
        weakest
    };
};

export interface AdminDeskHouse {
    id: string;
    name: string;
    /** Position in the house list (picks its colour). */
    colorIndex: number;
    entered: boolean;
    /** House rating, once the week counts for it. */
    rating: number | null;
}

export interface AdminDesk {
    weekNumber: number;
    globalWeek: number;
    locked: boolean;
    entered: number;
    total: number;
    /** Every house, in the usual order, with its status this week. */
    houses: AdminDeskHouse[];
    /** Houses that haven't entered the week yet. */
    waiting: { id: string; name: string }[];
}

export const adminDesk = (week: WeekData, insights?: Insights, weekIndex?: number): AdminDesk => ({
    weekNumber: week.weekNumber,
    globalWeek: week.globalWeek,
    locked: week.locked,
    entered: week.teams.filter(it => it.submitted).length,
    total: week.teams.length,
    houses: week.teams.map((it, i) => {
        const series = insights?.houses.get(it.id);
        const hw = series && weekIndex !== undefined ? weekOf(series.weeks, weekIndex) : undefined;
        return { id: it.id, name: it.name, colorIndex: series?.colorIndex ?? i, entered: it.submitted, rating: hw?.submitted ? hw.avg : null };
    }),
    waiting: week.teams.filter(it => !it.submitted).map(it => ({ id: it.id, name: it.name }))
});
