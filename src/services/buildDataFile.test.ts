import { describe, expect, it } from 'vitest';
import { buildDataFile } from './buildDataFile';
import type { ActivityRow, HouseRow, MemberRow, MetricRow, WeekRow } from './buildDataFile';
import { defaultSeasonId, seasonView, weekLabel, seasonStartFor } from '../utils/seasons';
import type { MetricValues, MiniCard, Season } from '../types';
import { TARGETS, card } from '../test/factory';

const zero: MetricValues = { 'К-К': 0, 'СВТ': 0, 'КТП': 0, 'ТХЖ': 0, 'ДТА': 0, 'ИСТГ': 0, 'НФ': 0, 'ТСП': 0 };
const helpers = {
    normalizeMetrics: (v: unknown, f: MetricValues) => ({ ...f, ...((v as Partial<MetricValues>) ?? {}) }),
    normalizeMiniCard: (v: unknown, f: MiniCard) => ({ ...f, ...((v as Partial<MiniCard>) ?? {}) }),
    zeroMetrics: zero
};
const settings = { roleTargets: TARGETS, miniCard: card(0) };

const houses: HouseRow[] = [
    { id: 'A', name: 'A', display_order: 0, active: true },
    { id: 'B', name: 'B', display_order: 1, active: true },
    { id: 'OLD', name: 'Old', display_order: 2, active: false }
];
// Ali moved from A to B for season 2; Old house was closed after season 1.
const members: MemberRow[] = [
    { id: 'ali', house_id: 'B', name: 'Ali', role: 'zam', photo_url: null, display_order: 0, active: true },
    { id: 'bek', house_id: 'A', name: 'Bek', role: 'member', photo_url: null, display_order: 1, active: true },
    { id: 'cho', house_id: 'OLD', name: 'Cho', role: 'member', photo_url: null, display_order: 2, active: false }
];
const weeks: WeekRow[] = [1, 2, 3, 4].map(n => ({ week_number: n, start_date: null, end_date: null, locked: n <= 2 }));
const seasons: Season[] = [
    { id: 1, name: '2026–27', firstWeek: 1, lastWeek: 2 },
    { id: 2, name: '2027', firstWeek: 3, lastWeek: null }
];
const m = (member: string, wk: number, house: string, role: 'member' | 'zam' = 'member'): MetricRow =>
    ({ member_id: member, week_number: wk, actual: { 'К-К': 5 }, target: TARGETS[role], house_id: house, role });
const metrics: MetricRow[] = [
    m('ali', 1, 'A'), m('bek', 1, 'A'), m('cho', 1, 'OLD'),
    m('ali', 2, 'A'), // Bek and Old didn't submit week 2
    m('ali', 3, 'B', 'zam')
];
const activities: ActivityRow[] = [];

const data = buildDataFile({ houses, members, weeks, metrics, activities, seasons }, settings, helpers);
const teamsOf = (wk: number) => data.weeks.find(w => w.globalWeek === wk)!.teams;
const teamOf = (wk: number, id: string) => teamsOf(wk).find(t => t.id === id);

describe('buildDataFile with seasons', () => {
    it('a person who moved keeps their old results in the old house', () => {
        expect(teamOf(1, 'A')!.members.map(x => x.id).sort()).toEqual(['ali', 'bek']);
        expect(teamOf(1, 'B')).toBeUndefined();
        expect(teamOf(3, 'B')!.members.map(x => x.id)).toEqual(['ali']);
    });

    it('uses the role they had that week, not their role today', () => {
        expect(teamOf(1, 'A')!.members.find(x => x.id === 'ali')!.role).toBe('member');
        expect(teamOf(3, 'B')!.members.find(x => x.id === 'ali')!.role).toBe('zam');
    });

    it('a closed house still appears in the season it took part in', () => {
        expect(teamOf(1, 'OLD')!.members.map(x => x.id)).toEqual(['cho']);
        expect(teamOf(3, 'OLD')).toBeUndefined();
    });

    it('finished season, house not submitted that week: its own season roster at zero, not today\'s', () => {
        // A submitted week 2 (Ali's row) → exactly who was entered.
        expect(teamOf(2, 'A')!.members.map(x => x.id)).toEqual(['ali']);
        const old2 = teamOf(2, 'OLD')!;
        expect(old2.submitted).toBe(false);
        expect(old2.members.map(x => x.id)).toEqual(['cho']);
    });

    it('running season, house not submitted: today\'s active roster at zero', () => {
        const a4 = teamOf(4, 'A')!;
        expect(a4.submitted).toBe(false);
        expect(a4.members.map(x => x.id)).toEqual(['bek']);
        expect(teamOf(4, 'B')!.members.map(x => x.id)).toEqual(['ali']);
    });

    it('numbers weeks within their season', () => {
        expect(data.weeks.map(w => [w.globalWeek, w.seasonId, w.seasonWeek])).toEqual([[1, 1, 1], [2, 1, 2], [3, 2, 1], [4, 2, 2]]);
    });

    it('works before the seasons migration: one season over everything', () => {
        const legacy = buildDataFile({ houses, members, weeks, metrics, activities, seasons: [] }, settings, helpers);
        expect(legacy.seasons).toHaveLength(1);
        expect(legacy.weeks.every(w => w.seasonWeek === w.globalWeek)).toBe(true);
    });
});

describe('season helpers', () => {
    it('seasonView renumbers the weeks of one season from 1', () => {
        const s2 = seasonView(data, 2);
        expect(s2.weeks.map(w => [w.weekNumber, w.globalWeek])).toEqual([[1, 3], [2, 4]]);
    });

    it('defaultSeasonId: running season if it has weeks, else the latest with weeks', () => {
        expect(defaultSeasonId(data)).toBe(2);
        const empty = { ...data, seasons: [...data.seasons.map(s => ({ ...s, lastWeek: s.lastWeek ?? 4 })), { id: 3, name: '2028', firstWeek: 5, lastWeek: null }] };
        expect(defaultSeasonId(empty)).toBe(2);
    });

    it('weekLabel shows season week numbers, with the season name for old seasons', () => {
        expect(weekLabel(data, 4)).toBe('2-апта');
        expect(weekLabel(data, 1)).toBe('2026–27 · 1-апта');
        expect(weekLabel(data, 5)).toBe('3-апта');
    });

    it('seasonStartFor finds the first week of the week\'s season', () => {
        expect(seasonStartFor(data, 2)).toBe(1);
        expect(seasonStartFor(data, 4)).toBe(3);
    });
});
