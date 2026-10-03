// Season-wide derived data: per-person weekly history, rank movement,
// streaks. Everything here is computed from the same DataFile the views
// already load, with the same scoring rules (src/utils/scoring.ts), so a
// number on a profile page always matches the number in the tables.
import type { DataFile, MetricValues, Role, TeamMember } from '../types';
import { calculateMemberScore, calculatePerformancePercentage, weights } from './scoring';

export const METRICS = Object.keys(weights) as Array<keyof MetricValues>;

/** Score a person earns at exactly 100% on every metric (sum of weights). */
export const PLAN_SCORE = Math.round(METRICS.reduce((s, m) => s + weights[m], 0) * 10) / 10;

export const ROLE_LABEL: Record<Role, string> = { imam: 'Имам', zam: 'Орун басар', member: 'Мүчө' };

export interface MemberWeek {
    weekIndex: number;
    weekNumber: number;
    houseId: string;
    houseName: string;
    member: TeamMember;
    score: number;
    /** Rank among everyone whose house submitted that week (null if not submitted). */
    rank: number | null;
    /** Percent of target per metric. */
    pct: MetricValues;
    /** Every one of the 8 targets met (and every target actually set). */
    perfect: boolean;
    submitted: boolean;
}

export interface MemberSeries {
    id: string;
    name: string;
    role: Role;
    photoUrl: string | null;
    houseId: string;
    houseName: string;
    /** Only the weeks this person was on a roster, oldest first. */
    weeks: MemberWeek[];
}

export interface HouseWeek {
    weekIndex: number;
    weekNumber: number;
    avg: number;
    rank: number | null;
    submitted: boolean;
    memberCount: number;
    miniCardPct: number;
    miniCardComplete: boolean;
    allPerfect: boolean;
}

export interface HouseSeries {
    id: string;
    name: string;
    /** Position in the house list — picks its chart color. */
    colorIndex: number;
    weeks: HouseWeek[];
}

export interface Insights {
    members: Map<string, MemberSeries>;
    houses: Map<string, HouseSeries>;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Standard competition ranking: equal scores share a rank (1, 2, 2, 4).
const rankBy = <T>(items: T[], value: (t: T) => number): Map<T, number> => {
    const sorted = [...items].sort((a, b) => value(b) - value(a));
    const out = new Map<T, number>();
    sorted.forEach((item, i) => {
        const prev = sorted[i - 1];
        out.set(item, prev !== undefined && value(prev) === value(item) ? out.get(prev)! : i + 1);
    });
    return out;
};

export const buildInsights = (data: DataFile): Insights => {
    const members = new Map<string, MemberSeries>();
    const houses = new Map<string, HouseSeries>();

    data.weeks.forEach((week, weekIndex) => {
        // People: rank only among houses that submitted — a house that hasn't
        // entered its numbers yet shouldn't make its members look like they
        // fell to the bottom.
        const rows: MemberWeek[] = [];
        week.teams.forEach(team => {
            team.members.forEach(member => {
                const pct = {} as MetricValues;
                let perfect = true;
                METRICS.forEach(m => {
                    const target = member.target[m] || 0;
                    pct[m] = calculatePerformancePercentage(member.actual[m] || 0, target);
                    if (target <= 0 || (member.actual[m] || 0) < target) perfect = false;
                });
                rows.push({
                    weekIndex, weekNumber: week.weekNumber, houseId: team.id, houseName: team.name, member,
                    score: calculateMemberScore(member), rank: null, pct, perfect: perfect && team.submitted,
                    submitted: team.submitted
                });
            });
        });
        const ranked = rankBy(rows.filter(r => r.submitted), r => r.score);
        rows.forEach(r => {
            r.rank = ranked.get(r) ?? null;
            const existing = members.get(r.member.id);
            if (existing) {
                existing.weeks.push(r);
                // Latest week wins for display fields (photo, house, role).
                existing.name = r.member.name; existing.role = r.member.role; existing.photoUrl = r.member.photoUrl;
                existing.houseId = r.houseId; existing.houseName = r.houseName;
            } else {
                members.set(r.member.id, {
                    id: r.member.id, name: r.member.name, role: r.member.role, photoUrl: r.member.photoUrl,
                    houseId: r.houseId, houseName: r.houseName, weeks: [r]
                });
            }
        });

        // Houses
        const hrows = week.teams.map((team, colorIndex) => {
            const scores = team.members.map(calculateMemberScore);
            const avg = scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            const keys = Object.keys(team.miniCard) as Array<keyof typeof team.miniCard>;
            const cardPcts = keys.map(k => calculatePerformancePercentage(team.miniCard[k].actual, team.miniCard[k].target));
            const miniCardPct = cardPcts.length ? cardPcts.reduce((a, b) => a + Math.min(b, 100), 0) / cardPcts.length : 0;
            const miniCardComplete = team.submitted && keys.every(k => team.miniCard[k].target > 0 && team.miniCard[k].actual >= team.miniCard[k].target);
            const allPerfect = team.submitted && team.members.length > 0 && rows.filter(r => r.houseId === team.id).every(r => r.perfect);
            return { team, colorIndex, hw: { weekIndex, weekNumber: week.weekNumber, avg, rank: null as number | null, submitted: team.submitted, memberCount: team.members.length, miniCardPct, miniCardComplete, allPerfect } };
        });
        const hranked = rankBy(hrows.filter(h => h.hw.submitted), h => h.hw.avg);
        hrows.forEach(h => {
            h.hw.rank = hranked.get(h) ?? null;
            const existing = houses.get(h.team.id);
            if (existing) { existing.weeks.push(h.hw); existing.name = h.team.name; existing.colorIndex = h.colorIndex; }
            else houses.set(h.team.id, { id: h.team.id, name: h.team.name, colorIndex: h.colorIndex, weeks: [h.hw] });
        });
    });

    return { members, houses };
};

/** A person's (or house's) entry for a given week index, if they were on a roster then. */
export const weekOf = <T extends { weekIndex: number }>(weeks: T[], weekIndex: number): T | undefined =>
    weeks.find(w => w.weekIndex === weekIndex);

/**
 * Places gained since the previous week (positive = moved up). Null when
 * there's nothing fair to compare: first week, or either week not submitted.
 */
export const movement = <T extends { weekIndex: number; rank: number | null }>(weeks: T[], weekIndex: number): number | null => {
    const now = weekOf(weeks, weekIndex);
    const before = weekOf(weeks, weekIndex - 1);
    if (!now || !before || now.rank === null || before.rank === null) return null;
    return before.rank - now.rank;
};

/** Consecutive weeks, ending at `weekIndex`, that satisfy `test`. */
export const streakUntil = <T extends { weekIndex: number }>(weeks: T[], weekIndex: number, test: (w: T) => boolean): number => {
    let n = 0;
    for (let i = weekIndex; i >= 0; i--) {
        const w = weekOf(weeks, i);
        if (!w || !test(w)) break;
        n++;
    }
    return n;
};

/** Longest run of consecutive weeks satisfying `test`. */
export const longestStreak = <T extends { weekIndex: number }>(weeks: T[], test: (w: T) => boolean): number => {
    let best = 0, run = 0, last = -2;
    [...weeks].sort((a, b) => a.weekIndex - b.weekIndex).forEach(w => {
        if (test(w)) { run = w.weekIndex === last + 1 ? run + 1 : 1; best = Math.max(best, run); last = w.weekIndex; }
        else { run = 0; last = w.weekIndex; }
    });
    return best;
};
