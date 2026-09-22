import type { MetricValues, TeamMember, Team } from '../types';

// Scoring weights — unchanged from the original formula
export const weights: MetricValues = {
    'К-К': 45.0,
    'СВТ': 15.0,
    'КТП': 35.0,
    'ТХЖ': 20.0,
    'ДТА': 30.0,
    'ИСТГ': 10.0,
    'НФ': 20.0,
    'ТСП': 25.0
};

// Validated categorical palette (dataviz skill reference/palette.md) — fixed
// order, not cycled, CVD-checked. Role badges use three non-adjacent slots;
// TEAM_COLORS uses the full ordered set for up to 8 houses.
export const COLORS = {
    imam: '#e34948',   // slot 8 red
    zam: '#eb6834',    // slot 2 orange
    member: '#2a78d6'  // slot 1 blue
};

export const TEAM_COLORS = [
    '#2a78d6', // blue
    '#eb6834', // orange
    '#1baf7a', // aqua
    '#eda100', // yellow
    '#e87ba4', // magenta
    '#008300', // green
    '#4a3aa7', // violet
    '#e34948'  // red
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
        const target = member.target[metric] || 1;
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
