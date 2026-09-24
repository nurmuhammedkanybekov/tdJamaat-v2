import type { MetricValues, TeamMember, Team } from '../types';

// Scoring weights.
export const weights: MetricValues = {
    'К-К': 45.0,
    'СВТ': 0.1,
    'КТП': 35.0,
    'ТХЖ': 20.0,
    'ДТА': 30.0,
    'ИСТГ': 0.1,
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

export const calculateTeamScore = (team: Team): number => {
    const memberScores = team.members.reduce((sum, member) => sum + calculateMemberScore(member), 0);

    const miniCardScore = Object.keys(team.miniCard).reduce((sum, key) => {
        const activity = team.miniCard[key as keyof typeof team.miniCard];
        return sum + calculatePerformancePercentage(activity.actual, activity.target);
    }, 0);

    return Math.round((memberScores + miniCardScore * 0.5) * 10) / 10;
};
