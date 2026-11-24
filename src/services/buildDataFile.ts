// Turns raw table rows into the per-week view the dashboard uses. Pure (no
// database access) so it can be tested directly.
//
// Who counts in a house for a given week:
//  - the house submitted that week → exactly the people it submitted, in
//    the house they were in AT THAT TIME (weekly_metrics.house_id; people
//    change houses between seasons and must not drag their old results
//    along). Someone who joins in week 8 doesn't appear as a zero in weeks
//    1–7; someone who leaves keeps their past weeks.
//  - not submitted, running season → today's active roster at zero, so the
//    house visibly shows as "nothing entered" rather than vanishing.
//  - not submitted, finished season → the people who were in that house
//    during that season, at zero (never today's roster).
import type { DataFile, MetricValues, MiniCard, Role, Season, Team, TeamMember, WeekData } from '../types';
import { houseDisplayName } from '../utils/houseName';
import { DEFAULT_TAZALYK_ITEMS, normalizeScores, tazalykPoints } from '../utils/tazalyk';
import type { TazalykEntry } from '../utils/tazalyk';
import { formatWeekRange } from '../utils/weekDates';

export type HouseRow = { id: string; name: string; display_order: number; active: boolean };
export type MemberRow = { id: string; house_id: string; name: string; role: Role; photo_url: string | null; display_order: number; active: boolean };
export type WeekRow = { week_number: number; start_date: string | null; end_date: string | null; locked?: boolean | null; tazalyk?: boolean | null };
export type MetricRow = { member_id: string; week_number: number; actual: unknown; target: unknown; house_id?: string | null; role?: Role | null; excused?: boolean | null };
export type ActivityRow = { house_id: string; week_number: number; activity: unknown };
export type TazalykRow = { house_id: string; week_number: number; scores: unknown; note?: string | null; saved_by_role?: string | null };

export interface BuildSettings {
    roleTargets: Record<Role, MetricValues>;
    miniCard: MiniCard;
    /** The Тазалык checklist (season_settings.tazalyk_items). */
    tazalykItems?: string[];
}

export interface BuildHelpers {
    normalizeMetrics: (value: unknown, fallback: MetricValues) => MetricValues;
    normalizeMiniCard: (value: unknown, fallback: MiniCard) => MiniCard;
    zeroMetrics: MetricValues;
}


/** The season a database week number belongs to (latest matching season). */
export const seasonForWeek = (seasons: Season[], week: number): Season | undefined =>
    [...seasons].sort((a, b) => b.firstWeek - a.firstWeek).find(s => week >= s.firstWeek && (s.lastWeek === null || week <= s.lastWeek));

export const buildDataFile = (
    rows: { houses: HouseRow[]; members: MemberRow[]; weeks: WeekRow[]; metrics: MetricRow[]; activities: ActivityRow[]; seasons: Season[]; tazalyk?: TazalykRow[] },
    settings: BuildSettings,
    h: BuildHelpers
): DataFile => {
    const { houses, members, weeks, metrics, activities } = rows;
    // No seasons table yet (migration not run) → one season covering everything.
    const seasons: Season[] = rows.seasons.length
        ? [...rows.seasons].sort((a, b) => a.firstWeek - b.firstWeek)
        : [{ id: 0, name: '2026–27', firstWeek: weeks.length ? Math.min(...weeks.map(w => w.week_number)) : 1, lastWeek: null }];

    const memberById = new Map(members.map(m => [m.id, m]));
    const houseOfRow = (r: MetricRow) => r.house_id ?? memberById.get(r.member_id)?.house_id ?? null;
    const metricsByWeek = new Map<number, MetricRow[]>();
    metrics.forEach(r => metricsByWeek.set(r.week_number, [...(metricsByWeek.get(r.week_number) ?? []), r]));
    const activityByKey = new Map(activities.map(r => [`${r.house_id}|${r.week_number}`, r]));
    const tazalykByKey = new Map((rows.tazalyk ?? []).map(r => [`${r.house_id}|${r.week_number}`, r]));
    const tazalykItems = settings.tazalykItems ?? DEFAULT_TAZALYK_ITEMS;
    const tazalykOf = (houseId: string, week: WeekRow): TazalykEntry | null | undefined => {
        if (!week.tazalyk) return undefined;
        const row = tazalykByKey.get(`${houseId}|${week.week_number}`);
        if (!row) return null;
        const scores = normalizeScores(row.scores, tazalykItems);
        return { scores, total: tazalykPoints(scores, tazalykItems), note: row.note ?? null, by: row.saved_by_role ?? null };
    };
    const seasonOfWeek = new Map(weeks.map(w => [w.week_number, seasonForWeek(seasons, w.week_number) ?? seasons[seasons.length - 1]]));

    // Per season: who was in which house (from saved rows), for finished seasons.
    const seasonRoster = new Map<string, Map<string, Role>>(); // `${seasonId}|${houseId}` → member → role
    metrics.forEach(r => {
        const season = seasonOfWeek.get(r.week_number);
        const houseId = houseOfRow(r);
        if (!season || !houseId) return;
        const key = `${season.id}|${houseId}`;
        const map = seasonRoster.get(key) ?? new Map<string, Role>();
        map.set(r.member_id, (r.role ?? memberById.get(r.member_id)?.role ?? 'member') as Role);
        seasonRoster.set(key, map);
    });
    const housesWithRowsInSeason = new Set([...seasonRoster.keys()]);

    const weekDataList: WeekData[] = weeks.map(week => {
        const season = seasonOfWeek.get(week.week_number)!;
        const running = season.lastWeek === null;
        const weekRows = metricsByWeek.get(week.week_number) ?? [];

        const visibleHouses = houses.filter(house =>
            weekRows.some(r => houseOfRow(r) === house.id) ||
            activityByKey.has(`${house.id}|${week.week_number}`) ||
            (running ? house.active : housesWithRowsInSeason.has(`${season.id}|${house.id}`))
        );

        const teams: Team[] = visibleHouses.map(house => {
            const submittedRows = weekRows.filter(r => houseOfRow(r) === house.id);
            let roster: Array<{ id: string; role: Role; row?: MetricRow }>;
            if (submittedRows.length > 0) {
                roster = submittedRows
                    .map(r => ({ id: r.member_id, role: (r.role ?? memberById.get(r.member_id)?.role ?? 'member') as Role, row: r }))
                    .sort((a, b) => (memberById.get(a.id)?.display_order ?? 0) - (memberById.get(b.id)?.display_order ?? 0));
            } else if (running) {
                roster = members.filter(m => m.house_id === house.id && m.active).map(m => ({ id: m.id, role: m.role }));
            } else {
                roster = [...(seasonRoster.get(`${season.id}|${house.id}`) ?? new Map()).entries()].map(([id, role]) => ({ id, role }));
            }

            const teamMembers: TeamMember[] = roster
                .filter(x => memberById.has(x.id))
                .map(({ id, role, row }) => {
                    const member = memberById.get(id)!;
                    const roleTarget = settings.roleTargets[role] ?? settings.roleTargets.member;
                    return {
                        id,
                        name: member.name,
                        role,
                        photoUrl: member.photo_url,
                        actual: h.normalizeMetrics(row?.actual, h.zeroMetrics),
                        target: row ? h.normalizeMetrics(row.target, roleTarget) : roleTarget,
                        excused: row?.excused === true
                    };
                });

            const activityRow = activityByKey.get(`${house.id}|${week.week_number}`);
            return {
                id: house.id,
                name: houseDisplayName(house.name),
                miniCard: h.normalizeMiniCard(activityRow?.activity, settings.miniCard),
                members: teamMembers,
                submitted: submittedRows.length > 0 || !!activityRow,
                tazalyk: tazalykOf(house.id, week)
            };
        });

        return {
            weekNumber: week.week_number,
            globalWeek: week.week_number,
            seasonId: season.id,
            seasonWeek: week.week_number - season.firstWeek + 1,
            date: formatWeekRange(week.start_date, week.end_date),
            startDate: week.start_date,
            endDate: week.end_date,
            locked: week.locked === true,
            tazalyk: week.tazalyk === true,
            teams
        };
    });

    return { weeks: weekDataList, seasons };
};
