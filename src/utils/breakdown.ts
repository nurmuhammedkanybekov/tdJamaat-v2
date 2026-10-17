// "Where the points came from": a person's score split by metric, for one
// week or as the average over the season's counted weeks.
import type { MetricValues } from '../types';
import type { MemberWeek } from './insights';
import { METRICS } from './insights';
import { metricPoints, weights } from './scoring';

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
