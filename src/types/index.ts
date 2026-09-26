// Types for tdJamaat v2
//
// The 8 individual metrics and 7 team activities keep the same keys as the
// original app (they're the community's existing formula) — only the
// storage model underneath changed, from a JSON blob per team per week to
// real houses/members tables. Team/TeamMember below are a *reconstructed*
// per-week view shaped close to the original, so scoring.ts and rankings.ts
// barely had to change.

export type Role = 'imam' | 'zam' | 'member';

export interface MetricValues {
    'К-К': number;
    'СВТ': number;
    'КТП': number;
    'ТХЖ': number;
    'ДТА': number;
    'ИСТГ': number;
    'НФ': number;
    'ТСП': number;
}

export interface MiniCardActivity {
    actual: number;
    target: number;
}

export interface MiniCard {
    'БГМДТ': MiniCardActivity;
    'КПТ': MiniCardActivity;
    'И-Н.2': MiniCardActivity;
    'КИТЕП': MiniCardActivity;
    'СПОРТ': MiniCardActivity;
    'ТСПХ': MiniCardActivity;
    'БАБХ': MiniCardActivity;
}

// ---------------------------------------------------------------------------
// Persistent roster (mirrors the `houses` / `members` tables directly)
// ---------------------------------------------------------------------------

export interface House {
    id: string;
    name: string;
    slug: string;
    displayOrder: number;
    active: boolean;
}

export interface Member {
    id: string;
    houseId: string;
    name: string;
    role: Role;
    photoUrl: string | null;
    displayOrder: number;
    active: boolean;
}

// ---------------------------------------------------------------------------
// Reconstructed per-week view used by the dashboard/scoring code
// ---------------------------------------------------------------------------

export interface TeamMember {
    id: string; // member id
    name: string;
    role: Role;
    photoUrl: string | null;
    actual: MetricValues;
    target: MetricValues;
}

export interface Team {
    id: string; // house id
    name: string;
    miniCard: MiniCard;
    members: TeamMember[];
}

export interface WeekData {
    weekNumber: number;
    date: string;
    teams: Team[];
}

export interface DataFile {
    weeks: WeekData[];
}

// ---------------------------------------------------------------------------
// Rankings (unchanged shape from the original app)
// ---------------------------------------------------------------------------

export interface TeamRanking {
    name: string;
    index: number;
    totalScore: number;
    avgMemberScore: number;
    memberCount: number;
    rank: number;
}

export interface MemberRanking extends TeamMember {
    index: number;
    score: number;
    performancePercentages: MetricValues;
    rank: number;
}

export interface FourWeekData {
    teamName: string;
    weeklyScores: number[];
    averageScore: number;
    totalScore: number;
    bestWeek: number;
    worstWeek: number;
    trends: 'up' | 'down' | 'stable';
    ranking: number;
    periodStart: number;
    periodEnd: number;
}
