import { describe, expect, it } from 'vitest';
import { buildDataFile } from '../services/buildDataFile';
import type { HouseRow, MemberRow, MetricRow, WeekRow } from '../services/buildDataFile';
import { buildInsights, weekOf } from './insights';
import { calculateHouseRating } from './scoring';
import { DEFAULT_TAZALYK_ITEMS } from './tazalyk';
import type { MetricValues, MiniCard } from '../types';
import { TARGETS, card } from '../test/factory';

const zero: MetricValues = { 'К-К': 0, 'СВТ': 0, 'КТП': 0, 'ТХЖ': 0, 'ДТА': 0, 'ИСТГ': 0, 'НФ': 0, 'ТСП': 0 };
const helpers = {
    normalizeMetrics: (v: unknown, f: MetricValues) => ({ ...f, ...((v as Partial<MetricValues>) ?? {}) }),
    normalizeMiniCard: (v: unknown, f: MiniCard) => ({ ...f, ...((v as Partial<MiniCard>) ?? {}) }),
    zeroMetrics: zero
};
const houses: HouseRow[] = [{ id: 'A', name: 'A', display_order: 0, active: true }, { id: 'B', name: 'B', display_order: 1, active: true }];
const members: MemberRow[] = [
    { id: 'a1', house_id: 'A', name: 'a1', role: 'member', photo_url: null, display_order: 0, active: true },
    { id: 'b1', house_id: 'B', name: 'b1', role: 'member', photo_url: null, display_order: 1, active: true }
];
const full = { ...TARGETS.member };
const metrics: MetricRow[] = [1, 2].flatMap(w => [
    { member_id: 'a1', week_number: w, actual: full, target: TARGETS.member, house_id: 'A', role: 'member' as const },
    { member_id: 'b1', week_number: w, actual: full, target: TARGETS.member, house_id: 'B', role: 'member' as const }
]);
// Week 1 doesn't count Тазалык, week 2 does; A is rated in both, B in neither.
const weeks: WeekRow[] = [
    { week_number: 1, start_date: '2026-11-19', end_date: '2026-11-25', tazalyk: false },
    { week_number: 2, start_date: '2026-11-26', end_date: '2026-12-02', tazalyk: true }
];
const allFour = Object.fromEntries(DEFAULT_TAZALYK_ITEMS.map(i => [i, 4]));
const tazalyk = [1, 2].map(w => ({ house_id: 'A', week_number: w, scores: allFour, note: null, saved_by_role: 'inspector' }));
const data = buildDataFile({ houses, members, weeks, metrics, activities: [], seasons: [], tazalyk }, { roleTargets: TARGETS, miniCard: card(0) }, helpers);

describe('Тазалык in the house rating', () => {
    it('a week that does not count it: no Тазалык at all, even if a house was rated', () => {
        const [a, b] = data.weeks[0].teams;
        expect(a.tazalyk).toBeUndefined();
        expect(b.tazalyk).toBeUndefined();
        expect(calculateHouseRating(a)).toBe(calculateHouseRating(b));
    });
    it('a week that counts it: rated houses get their points, unrated ones 0 (pending)', () => {
        const [a, b] = data.weeks[1].teams;
        expect(a.tazalyk?.total).toBe(20);
        expect(a.tazalyk?.by).toBe('inspector');
        expect(b.tazalyk).toBeNull();
        expect(calculateHouseRating(a) - calculateHouseRating(b)).toBeCloseTo(20, 5);
    });
    it('insights carry the points, the pending state and the rank', () => {
        const ins = buildInsights(data);
        const wa = weekOf(ins.houses.get('A')!.weeks, 1)!, wb = weekOf(ins.houses.get('B')!.weeks, 1)!;
        expect(wa.tazalyk).toBe(20);
        expect(wb.tazalyk).toBe(0);
        expect(wb.tazalykPending).toBe(true);
        expect(wa.rank).toBe(1);
        expect(weekOf(ins.houses.get('A')!.weeks, 0)!.tazalyk).toBeNull();
    });
    it('week dates are shown Thursday – Wednesday', () => {
        expect(data.weeks[0].date).toBe('19–25 ноябрь');
        expect(data.weeks[1].date).toBe('26 ноябрь – 2 декабрь');
    });
});
