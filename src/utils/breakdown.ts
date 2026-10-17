// "Where the points came from": a person's score split by metric, for one
// week or as the average over the season's counted weeks.
import type { MetricValues, Team } from '../types';
import type { MemberWeek } from './insights';
import { METRICS } from './insights';
import { countedMembers, metricPoints, weights } from './scoring';

export interface BreakdownRow {
    metric: keyof MetricValues;
    /** Points earned (unrounded). */
    points: number;
    /** Points for exactly 100% of the plan (the metric's weight). */
    plan: number;
}

export interface Breakdown {
    rows: BreakdownRow[];
    total: number;
    /** The metric that brought the most points. */
    top: BreakdownRow | null;
    /** The metric furthest below its plan, with the points still missing (null if every plan was met). */
    missed: { row: BreakdownRow; missing: number } | null;
}

const build = (points: MetricValues): Breakdown => {
    const rows = METRICS.map(metric => ({ metric, points: points[metric], plan: weights[metric] }));
    const total = rows.reduce((s, r) => s + r.points, 0);
    const top = rows.reduce<BreakdownRow | null>((b, r) => (r.points > 0 && (!b || r.points > b.points) ? r : b), null);
    const missed = rows.reduce<Breakdown['missed']>((b, r) => {
        const missing = r.plan - r.points;
        return missing > 0.05 && (!b || missing > b.missing) ? { row: r, missing } : b;
    }, null);
    return { rows, total, top, missed };
};

/** One week (null if the week doesn't count for this person). */
export const weekBreakdown = (week: MemberWeek): Breakdown | null =>
    week.submitted ? build(metricPoints(week.member)) : null;

/** Average per counted week over the given weeks (null if none counted). */
export const averageBreakdown = (weeks: MemberWeek[]): Breakdown | null => {
    const counted = weeks.filter(w => w.submitted);
    if (counted.length === 0) return null;
    const sum = Object.fromEntries(METRICS.map(m => [m, 0])) as unknown as MetricValues;
    counted.forEach(w => { const p = metricPoints(w.member); METRICS.forEach(m => { sum[m] += p[m]; }); });
    METRICS.forEach(m => { sum[m] /= counted.length; });
    return build(sum);
};

export interface HouseBreakdown extends Breakdown {
    /** People counted (excused left out). */
    people: number;
    /** Per metric: how many people met the plan, and who did not. */
    atPlan: Record<keyof MetricValues, { met: number; below: string[] }>;
}

/** A house's week: average points per counted member, per metric (null if nobody counts). */
export const houseBreakdown = (team: Team): HouseBreakdown | null => {
    const counted = countedMembers(team);
    if (counted.length === 0) return null;
    const sum = Object.fromEntries(METRICS.map(m => [m, 0])) as unknown as MetricValues;
    const atPlan = Object.fromEntries(METRICS.map(m => [m, { met: 0, below: [] as string[] }])) as HouseBreakdown['atPlan'];
    counted.forEach(member => {
        const p = metricPoints(member);
        METRICS.forEach(m => {
            sum[m] += p[m];
            if (p[m] >= weights[m] - 1e-9 && (member.target[m] || 0) > 0) atPlan[m].met += 1;
            else atPlan[m].below.push(member.name);
        });
    });
    METRICS.forEach(m => { sum[m] /= counted.length; });
    return { ...build(sum), people: counted.length, atPlan };
};

export interface GoalHint {
    metric: keyof MetricValues;
    /** How many more are needed to reach the plan. */
    need: number;
    /** Points that reaching the plan would add. */
    gain: number;
}

/** What is still missing to reach 100% in each metric, biggest gain first.
 *  Metrics without a plan are skipped (they can't earn points). */
export const goalHints = (actual: MetricValues, target: MetricValues): GoalHint[] => {
    const points = metricPoints({ id: '', name: '', role: 'member', photoUrl: null, actual, target });
    return METRICS
        .filter(m => (target[m] || 0) > 0 && (actual[m] || 0) < target[m])
        .map(m => ({ metric: m, need: Math.ceil(target[m] - (actual[m] || 0)), gain: weights[m] - points[m] }))
        .sort((a, b) => b.gain - a.gain);
};
