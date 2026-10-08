// House rows for the Reports view (4-week periods and the season total).
// Same counting rule as everywhere else (weekCounts): a week a house hasn't
// submitted is "—" and left out while it is open, and counts as zeros once
// the admin has locked it.
import type { WeekData } from '../types';
import { calculateHouseRating } from './scoring';
import { weekCounts } from './insights';

const round1 = (n: number) => Math.round(n * 10) / 10;

export type Trend = 'up' | 'down' | 'stable';

export interface ReportRow {
    id: string;
    name: string;
    colorIndex: number;
    /** One cell per week of the period: the house rating, or null ("—", not counted). */
    cells: Array<number | null>;
    /** The counted weeks only. */
    scores: number[];
    average: number;
    best: number | null;
    worst: number | null;
    /** Last counted week minus the first counted week of the period (null under 2 weeks). */
    change: number | null;
    trend: Trend;
}

/** A house's rating for one week, or null when that week doesn't count (yet). */
export const houseWeekRating = (week: WeekData, houseId: string): number | null => {
    const team = week.teams.find(t => t.id === houseId);
    if (!team || team.members.length === 0 || !weekCounts(week, team)) return null;
    return round1(calculateHouseRating(team));
};

export const reportRows = (weeks: WeekData[], houses: Array<{ id: string; name: string }>): ReportRow[] =>
    houses.map((h, colorIndex): ReportRow => {
        const cells = weeks.map(w => houseWeekRating(w, h.id));
        const scores = cells.filter((x): x is number => x !== null);
        const change = scores.length >= 2 ? round1(scores[scores.length - 1] - scores[0]) : null;
        return {
            id: h.id,
            name: h.name,
            colorIndex,
            cells,
            scores,
            average: scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
            best: scores.length ? Math.max(...scores) : null,
            worst: scores.length ? Math.min(...scores) : null,
            change,
            trend: change === null || change === 0 ? 'stable' : change > 0 ? 'up' : 'down'
        };
    }).sort((a, b) => b.average - a.average);
