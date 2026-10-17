import { describe, expect, it } from 'vitest';
import { averageBreakdown, goalHints, houseBreakdown, weekBreakdown } from './breakdown';
import { calculateMemberAverage, calculateMemberScore, weights } from './scoring';
import type { MemberWeek } from './insights';
import { house, person } from '../test/factory';
import type { TeamMember } from '../types';

const week = (member: TeamMember, submitted = true): MemberWeek => ({
    weekIndex: 0, weekNumber: 1, houseId: 'h', houseName: 'H', member, score: calculateMemberScore(member),
    rank: 1, pct: member.actual, perfect: false, submitted, excused: !submitted
} as MemberWeek);

describe('points breakdown', () => {
    it('adds up to the score shown everywhere else', () => {
        for (const m of [person('a', 'member', 1), person('b', 'imam', 0.63), person('c', 'zam', 1, { 'К-К': 40, 'ДТА': 0 })]) {
            const b = weekBreakdown(week(m))!;
            expect(Math.round(b.total * 10) / 10).toBe(calculateMemberScore(m));
        }
    });

    it('a metric at exactly 100% earns its weight', () => {
        const b = weekBreakdown(week(person('a', 'member', 1)))!;
        b.rows.forEach(r => expect(r.points).toBeCloseTo(weights[r.metric]));
        expect(b.missed).toBeNull();
    });

    it('names the strongest and the most-missed metric', () => {
        const b = weekBreakdown(week(person('a', 'member', 1, { 'К-К': 14, 'ДТА': 0 })))!;
        expect(b.top?.metric).toBe('К-К');            // 200% → 169% of 45
        expect(b.missed?.row.metric).toBe('ДТА');     // 0 of 50
        expect(b.missed?.missing).toBe(50);
    });

    it('skips weeks that do not count (excused / not entered)', () => {
        expect(weekBreakdown(week(person('a'), false))).toBeNull();
        const avg = averageBreakdown([week(person('a', 'member', 1)), week(person('a', 'member', 0), false)])!;
        expect(Math.round(avg.total)).toBe(220);
        expect(averageBreakdown([week(person('a'), false)])).toBeNull();
    });

    it('averages over the counted weeks', () => {
        const avg = averageBreakdown([week(person('a', 'member', 1)), week(person('a', 'member', 0))])!;
        expect(avg.total).toBeCloseTo(110);
    });

    it('house: averages over present members and matches the member average', () => {
        const away = { ...person('away', 'member', 0), excused: true };
        const team = house('A', [person('a', 'member', 1), person('b', 'imam', 0.5, { 'ДТА': 0 }), away]);
        const b = houseBreakdown(team)!;
        expect(b.people).toBe(2);
        expect(Math.round(b.total * 10) / 10).toBeCloseTo(calculateMemberAverage(team), 0);
        expect(b.atPlan['ДТА']).toEqual({ met: 1, below: ['b'] });
        expect(b.missed?.row.metric).toBe('ДТА');
    });

    it('house with nobody counted has no breakdown (no NaN)', () => {
        expect(houseBreakdown(house('E', []))).toBeNull();
        expect(houseBreakdown(house('X', [{ ...person('x'), excused: true }]))).toBeNull();
    });

    it('goal hints: what is missing to reach each plan, biggest gain first', () => {
        const m = person('g', 'member', 1, { 'К-К': 4, 'ДТА': 0, 'СВТ': 2000 });
        const hints = goalHints(m.actual, m.target);
        expect(hints.map(h => h.metric)).toEqual(['ДТА', 'К-К']);   // ДТА 0/1 → +50, К-К 4/7 → +19.3
        expect(hints[0]).toMatchObject({ need: 1, gain: 50 });
        expect(hints[1].need).toBe(3);
        expect(hints[1].gain).toBeCloseTo(45 * 3 / 7);
    });

    it('goal hints: nothing when every plan is met, and no hint for a metric without a plan', () => {
        const done = person('d', 'member', 1);
        expect(goalHints(done.actual, done.target)).toEqual([]);
        const noPlan = person('n', 'member', 0);
        noPlan.target = { ...noPlan.target, 'К-К': 0 };
        expect(goalHints(noPlan.actual, noPlan.target).some(h => h.metric === 'К-К')).toBe(false);
    });
});
