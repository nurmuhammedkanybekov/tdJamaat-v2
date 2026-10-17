import { describe, expect, it } from 'vitest';
import { calculateHouseRating, calculateMemberAverage } from './scoring';
import { buildInsights, longestStreak, seasonSummary, streakUntil, weekOf } from './insights';
import { computeAwards } from './badges';
import { buildDataFile } from '../services/buildDataFile';
import { card, dataFile, house, person, week, TARGETS } from '../test/factory';
import type { TeamMember } from '../types';

const away = (m: TeamMember): TeamMember => ({ ...m, excused: true });

describe('excused week (sick, travelling)', () => {
    it('is left out of the house average — the house is not dragged down by a zero', () => {
        const h = house('A', [person('a', 'member', 1), away(person('b', 'member', 0))]);
        expect(calculateMemberAverage(h)).toBe(220);
        expect(calculateMemberAverage(house('A', [person('a', 'member', 1), person('b', 'member', 0)]))).toBe(110);
    });

    it('everyone excused: average 0, never NaN; the mini-card still counts', () => {
        const h = house('A', [away(person('a')), away(person('b'))], { miniCard: card(1) });
        expect(calculateMemberAverage(h)).toBe(0);
        expect(calculateHouseRating(h)).toBe(35);
    });

    it('is not ranked and does not count for the person that week', () => {
        const ins = buildInsights(dataFile(week(1, [house('A', [person('a', 'member', 1), away(person('b', 'member', 1))])])));
        const b = weekOf(ins.members.get('b')!.weeks, 0)!;
        expect(b.excused).toBe(true);
        expect(b.submitted).toBe(false);
        expect(b.rank).toBeNull();
        expect(weekOf(ins.members.get('a')!.weeks, 0)!.rank).toBe(1);
        expect(weekOf(ins.houses.get('A')!.weeks, 0)!.excusedCount).toBe(1);
    });

    it('neither breaks nor extends a streak', () => {
        const weeks = [1, 2, 3, 4].map(n => week(n, [house('A', [n === 3 ? away(person('p', 'member', 0)) : person('p', 'member', 1)])]));
        const series = buildInsights(dataFile(...weeks)).members.get('p')!;
        expect(streakUntil(series.weeks, 3, w => w.perfect)).toBe(3);   // weeks 1, 2, 4 — week 3 passed over
        expect(longestStreak(series.weeks, w => w.perfect)).toBe(3);
    });

    it('a "strong week" streak keeps going across an excused week (medal still earned)', () => {
        const weeks = [1, 2, 3, 4, 5].map(n => week(n, [house('A', [n === 3 ? away(person('p', 'member', 0)) : person('p', 'member', 1)])]));
        const awards = computeAwards(dataFile(...weeks), buildInsights(dataFile(...weeks))).filter(a => a.def.id === 'steady-4');
        expect(awards).toHaveLength(1);
        expect(awards[0].weekNumber).toBe(5);
    });

    it('season summary: excused weeks are not counted against "active weeks"', () => {
        const weeks = [1, 2, 3].map(n => week(n, [house('A', [n === 2 ? away(person('p', 'member', 0)) : person('p', 'member', 1)])]));
        const ins = buildInsights(dataFile(...weeks));
        const s = seasonSummary(ins.members.get('p')!, ins, 3);
        expect(s.excusedWeeks).toBe(1);
        expect(s.weeksTotal).toBe(2);
        expect(s.weeksActive).toBe(2);
        expect(s.average).toBe(220);
    });

    it('is read from the database row (weekly_metrics.excused)', () => {
        const df = buildDataFile({
            houses: [{ id: 'h', name: 'H', display_order: 0, active: true }],
            members: [{ id: 'm', house_id: 'h', name: 'M', role: 'member', photo_url: null, display_order: 0, active: true }],
            weeks: [{ week_number: 1, start_date: null, end_date: null }],
            metrics: [{ member_id: 'm', week_number: 1, actual: {}, target: TARGETS.member, house_id: 'h', role: 'member', excused: true }],
            activities: [],
            seasons: []
        }, { roleTargets: TARGETS, miniCard: card(0) }, { normalizeMetrics: (v, f) => ({ ...f, ...(v as object) }), normalizeMiniCard: (_v, f) => f, zeroMetrics: { ...TARGETS.member } });
        expect(df.weeks[0].teams[0].members[0].excused).toBe(true);
    });
});
