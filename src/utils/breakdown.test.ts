import { describe, expect, it } from 'vitest';
import { averageBreakdown, weekBreakdown } from './breakdown';
import { calculateMemberScore, weights } from './scoring';
import type { MemberWeek } from './insights';
import { person } from '../test/factory';
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
});
