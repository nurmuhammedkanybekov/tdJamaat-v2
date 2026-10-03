// Small builders for test data: a season of weeks, houses and people,
// shaped exactly like what fetchDataFile() returns.
import type { DataFile, MetricValues, MiniCard, Role, Team, TeamMember, WeekData } from '../types';

export const TARGETS: Record<Role, MetricValues> = {
    imam: { 'К-К': 20, 'СВТ': 2100, 'КТП': 70, 'ТХЖ': 2, 'ДТА': 1, 'ИСТГ': 700, 'НФ': 7, 'ТСП': 10 },
    zam: { 'К-К': 10, 'СВТ': 1400, 'КТП': 40, 'ТХЖ': 1, 'ДТА': 1, 'ИСТГ': 350, 'НФ': 7, 'ТСП': 7 },
    member: { 'К-К': 7, 'СВТ': 700, 'КТП': 30, 'ТХЖ': 1, 'ДТА': 1, 'ИСТГ': 200, 'НФ': 7, 'ТСП': 7 }
};

const CARD_TARGETS: Record<keyof MiniCard, number> = { 'БГМДТ': 7, 'КПТ': 7, 'И-Н.2': 7, 'КИТЕП': 5, 'СПОРТ': 1, 'ТСПХ': 7, 'БАБХ': 7 };

/** Mini-card with every activity at `fraction` of its target (0 = nothing done). */
export const card = (fraction = 0, overrides: Partial<Record<keyof MiniCard, number>> = {}): MiniCard =>
    Object.fromEntries(Object.entries(CARD_TARGETS).map(([k, t]) => [k, { actual: overrides[k as keyof MiniCard] ?? Math.round(t * fraction), target: t }])) as unknown as MiniCard;

/** A person whose every metric is `fraction` of their role target. */
export const person = (id: string, role: Role = 'member', fraction = 1, overrides: Partial<MetricValues> = {}): TeamMember => {
    const target = TARGETS[role];
    const actual = Object.fromEntries(Object.entries(target).map(([k, t]) => [k, Math.round(t * fraction)])) as unknown as MetricValues;
    return { id, name: id, role, photoUrl: null, actual: { ...actual, ...overrides }, target: { ...target } };
};

export const house = (id: string, members: TeamMember[], opts: { submitted?: boolean; miniCard?: MiniCard } = {}): Team => ({
    id, name: id, members, miniCard: opts.miniCard ?? card(0), submitted: opts.submitted ?? true
});

export const week = (weekNumber: number, teams: Team[], seasonId = 1, seasonStart = 1): WeekData => ({
    weekNumber, globalWeek: weekNumber, seasonId, seasonWeek: weekNumber - seasonStart + 1, date: '', locked: false, teams
});

export const dataFile = (...weeks: WeekData[]): DataFile => ({ weeks, seasons: [{ id: 1, name: '2026–27', firstWeek: 1, lastWeek: null }] });
