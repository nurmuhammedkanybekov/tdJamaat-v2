import type { MetricValues, TeamMember, Team } from '../types';

// Scoring weights. A weight is the points earned at exactly 100% of target.
// СВТ and ИСТГ are kept low on purpose: their targets are large counts that
// are quick to reach, so even with no cap on the percentage they can't
// outweigh the other metrics. (They were 0.1, which made 100% worth almost
// nothing.)
export const weights: MetricValues = {
    'К-К': 45.0,
    'СВТ': 1.0,
    'КТП': 35.0,
    'ТХЖ': 20.0,
    'ДТА': 30.0,
    'ИСТГ': 1.0,
    'НФ': 20.0,
    'ТСП': 25.0
};

// Role and team colors are read from CSS custom properties (src/index.css)
// so they swap automatically with the light/dark theme toggle — both sets
// are validated categorical palettes (dataviz skill), computed once and
// documented alongside their `--role-*` / `--team-color-*` definitions.
export const COLORS = {
    imam: 'var(--role-imam)',
    zam: 'var(--role-zam)',
    member: 'var(--role-member)'
};

export const TEAM_COLORS = [
    'var(--team-color-1)', // blue
    'var(--team-color-2)', // orange
    'var(--team-color-3)', // aqua
    'var(--team-color-4)', // yellow
    'var(--team-color-5)', // magenta
    'var(--team-color-6)', // green
    'var(--team-color-7)', // violet
    'var(--team-color-8)'  // red
];

export const calculatePerformancePercentage = (actual: number, target: number): number => {
    if (target === 0) return 0;
    return (actual / target) * 100;
};

export const calculateMemberScore = (member: TeamMember): number => {
    let totalScore = 0;
    const metrics = Object.keys(weights) as Array<keyof MetricValues>;

    metrics.forEach(metric => {
        const actual = member.actual[metric] || 0;
        const target = member.target[metric] || 0;
        // calculatePerformancePercentage treats an unset/zeroed target as 0%,
        // never as a divide-by-zero — and, just as importantly, never as an
        // inflated 100%+ score. A target that's missing or cleared to 0
        // earns no points for that metric, the same way it earns no credit
        // in the house mini-card score below. This matters in a real
        // competition: without this, a blank target field would be a way
        // (accidental or not) to make a small "actual" count for far more
        // than it should.
        const performancePercentage = calculatePerformancePercentage(actual, target);
        const metricScore = (performancePercentage / 100) * weights[metric];
        totalScore += metricScore;
    });

    return Math.round(totalScore * 10) / 10;
};

// House rating (what houses are ranked by):
//   average member score  +  mini-card bonus
// Average, not total, so a small house competes fairly with a big one.
// The mini-card (house activities) adds up to MINI_CARD_POINTS per activity
// at 100% of its target. Each activity is capped at 100%: a target of 1
// (СПОРТ) done 7 times must not count as 700%. No target → no points.
export const MINI_CARD_POINTS = 5;

export const calculateMiniCardBonus = (miniCard: Team['miniCard']): number => {
    const total = Object.values(miniCard).reduce((sum, a) => {
        if (!a || a.target <= 0) return sum;
        return sum + Math.min(Math.max(a.actual, 0) / a.target, 1) * MINI_CARD_POINTS;
    }, 0);
    return Math.round(total * 10) / 10;
};

export const calculateMemberAverage = (team: Team): number =>
    team.members.length === 0
        ? 0
        : Math.round((team.members.reduce((sum, m) => sum + calculateMemberScore(m), 0) / team.members.length) * 10) / 10;

export const calculateHouseRating = (team: Team): number =>
    Math.round((calculateMemberAverage(team) + calculateMiniCardBonus(team.miniCard)) * 10) / 10;
