// Side-by-side comparison of two people or two houses (CompareSheet).
// Everything is derived from Insights, so the numbers match the profile
// pages and the tables exactly.
import type { MetricValues } from '../types';
import type { Award } from './badges';
import type { HouseSeries, Insights, MemberSeries } from './insights';
import { METRICS, seasonSummary, weekOf } from './insights';

export type CompareKind = 'person' | 'house';

export interface CompareRow {
    label: string;
    a: number | null;
    b: number | null;
    /** How to print the value. */
    format: 'score' | 'rank' | 'count' | 'pct';
    /** Smaller wins (places). */
    lowerBetter?: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const avgOf = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/** Which side wins a row: 'a', 'b', or null (tie / nothing to compare). */
export const rowWinner = (row: CompareRow): 'a' | 'b' | null => {
    if (row.a === null || row.b === null || row.a === row.b) return null;
    const aBetter = row.lowerBetter ? row.a < row.b : row.a > row.b;
    return aBetter ? 'a' : 'b';
};

/** Weeks both sides took part in, and who scored more in each. */
export const headToHead = <T extends { weekIndex: number; submitted: boolean }>(a: T[], b: T[], value: (w: T) => number) => {
    let aWins = 0, bWins = 0, draws = 0;
    a.forEach(wa => {
        const wb = weekOf(b, wa.weekIndex);
        if (!wa.submitted || !wb || !wb.submitted) return;
        const d = value(wa) - value(wb);
        if (d > 0) aWins++; else if (d < 0) bWins++; else draws++;
    });
    return { a: aWins, b: bWins, draws };
};

/** Average percent of target per metric over the weeks a person's house submitted. */
export const metricAverages = (s: MemberSeries): MetricValues => {
    const counted = s.weeks.filter(w => w.submitted);
    const out = {} as MetricValues;
    METRICS.forEach(m => { out[m] = Math.round(avgOf(counted.map(w => w.pct[m]))); });
    return out;
};

export const personRows = (a: MemberSeries, b: MemberSeries, insights: Insights, awards: Award[], weekIndex: number, weeksTotal: number): CompareRow[] => {
    const sa = seasonSummary(a, insights, weeksTotal);
    const sb = seasonSummary(b, insights, weeksTotal);
    const wa = weekOf(a.weeks, weekIndex), wb = weekOf(b.weeks, weekIndex);
    const medals = (id: string) => awards.filter(x => x.holderId === id).length;
    return [
        { label: 'Ушул апта', a: wa?.submitted ? round1(wa.score) : null, b: wb?.submitted ? round1(wb.score) : null, format: 'score' },
        { label: 'Аптадагы орун', a: wa?.rank ?? null, b: wb?.rank ?? null, format: 'rank', lowerBetter: true },
        { label: 'Сезондогу орточо', a: sa.rank !== null ? sa.average : null, b: sb.rank !== null ? sb.average : null, format: 'score' },
        { label: 'Сезондогу орун', a: sa.rank, b: sb.rank, format: 'rank', lowerBetter: true },
        { label: 'Эң мыкты апта', a: sa.best ? round1(sa.best.score) : null, b: sb.best ? round1(sb.best.score) : null, format: 'score' },
        { label: 'Толук план', a: sa.perfectWeeks, b: sb.perfectWeeks, format: 'count' },
        { label: 'Медалдар', a: medals(a.id), b: medals(b.id), format: 'count' }
    ];
};

/** Place of each house by its average weekly rating over submitted weeks. */
const houseSeasonRanks = (insights: Insights) => {
    const list = [...insights.houses.values()]
        .map(h => { const ws = h.weeks.filter(w => w.submitted); return { id: h.id, avg: avgOf(ws.map(w => w.avg)), n: ws.length }; })
        .filter(x => x.n > 0)
        .sort((x, y) => y.avg - x.avg);
    const out = new Map<string, number>();
    list.forEach(x => out.set(x.id, list.findIndex(y => y.avg === x.avg) + 1));
    return out;
};

export const houseRows = (a: HouseSeries, b: HouseSeries, insights: Insights, awards: Award[], weekIndex: number): CompareRow[] => {
    const ranks = houseSeasonRanks(insights);
    const wa = weekOf(a.weeks, weekIndex), wb = weekOf(b.weeks, weekIndex);
    const counted = (h: HouseSeries) => h.weeks.filter(w => w.submitted);
    const seasonAvg = (h: HouseSeries, pick: (w: HouseSeries['weeks'][number]) => number) => (counted(h).length ? round1(avgOf(counted(h).map(pick))) : null);
    const best = (h: HouseSeries) => (counted(h).length ? round1(Math.max(...counted(h).map(w => w.avg))) : null);
    const medals = (id: string) => awards.filter(x => x.def.scope === 'house' && x.holderId === id).length;
    return [
        { label: 'Ушул апта', a: wa?.submitted ? round1(wa.avg) : null, b: wb?.submitted ? round1(wb.avg) : null, format: 'score' },
        { label: 'Аптадагы орун', a: wa?.rank ?? null, b: wb?.rank ?? null, format: 'rank', lowerBetter: true },
        { label: 'Сезондогу орточо', a: seasonAvg(a, w => w.avg), b: seasonAvg(b, w => w.avg), format: 'score' },
        { label: 'Сезондогу орун', a: ranks.get(a.id) ?? null, b: ranks.get(b.id) ?? null, format: 'rank', lowerBetter: true },
        { label: 'Мүчөлөрдүн орточосу', a: seasonAvg(a, w => w.memberAvg), b: seasonAvg(b, w => w.memberAvg), format: 'score' },
        { label: 'Мини-карта (орточо)', a: seasonAvg(a, w => w.cardBonus), b: seasonAvg(b, w => w.cardBonus), format: 'score' },
        { label: 'Эң мыкты апта', a: best(a), b: best(b), format: 'score' },
        { label: '1-орундагы апталар', a: a.weeks.filter(w => w.rank === 1).length, b: b.weeks.filter(w => w.rank === 1).length, format: 'count' },
        { label: 'Медалдар', a: medals(a.id), b: medals(b.id), format: 'count' }
    ];
};

/** A sensible opponent: the person/house ranked right next to `id` this season. */
export const defaultRival = (ids: string[], id: string | undefined): string | undefined => {
    if (ids.length < 2) return undefined;
    const i = id ? ids.indexOf(id) : -1;
    if (i < 0) return ids[1];
    return i === 0 ? ids[1] : ids[i - 1];
};
