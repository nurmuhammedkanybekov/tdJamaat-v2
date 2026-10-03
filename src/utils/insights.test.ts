import { describe, expect, it } from 'vitest';
import { buildInsights, longestStreak, movement, streakUntil, weekOf } from './insights';
import { card, dataFile, house, person, week } from '../test/factory';

describe('insights', () => {
    it('ranks people only among houses that submitted', () => {
        const data = dataFile(week(1, [
            house('A', [person('a1', 'member', 1)]),
            house('B', [person('b1', 'member', 0.5)], { submitted: false })
        ]));
        const ins = buildInsights(data);
        expect(weekOf(ins.members.get('a1')!.weeks, 0)!.rank).toBe(1);
        expect(weekOf(ins.members.get('b1')!.weeks, 0)!.rank).toBeNull();
        expect(weekOf(ins.houses.get('B')!.weeks, 0)!.rank).toBeNull();
    });

    it('equal scores share a rank (1, 2, 2, 4)', () => {
        const data = dataFile(week(1, [house('A', [
            person('x', 'member', 1), person('y', 'member', 0.5), person('z', 'member', 0.5), person('w', 'member', 0.1)
        ])]));
        const ins = buildInsights(data);
        expect(['x', 'y', 'z', 'w'].map(id => weekOf(ins.members.get(id)!.weeks, 0)!.rank)).toEqual([1, 2, 2, 4]);
    });

    it('ranks houses by rating, so the mini-card can decide the winner', () => {
        const data = dataFile(week(1, [
            house('A', [person('a', 'member', 1)], { miniCard: card(0) }),                  // 177 + 0
            house('B', [person('b', 'member', 1, { 'ТСП': 6 })], { miniCard: card(1) })   // ~173 + 35
        ]));
        const ins = buildInsights(data);
        expect(weekOf(ins.houses.get('B')!.weeks, 0)!.rank).toBe(1);
        expect(weekOf(ins.houses.get('B')!.weeks, 0)!.cardBonus).toBe(35);
    });

    it('movement: null in the first week, places gained afterwards', () => {
        const w1 = week(1, [house('A', [person('a', 'member', 0.2), person('b', 'member', 1)])]);
        const w2 = week(2, [house('A', [person('a', 'member', 1), person('b', 'member', 0.2)])]);
        const ins = buildInsights(dataFile(w1, w2));
        const a = ins.members.get('a')!.weeks;
        expect(movement(a, 0)).toBeNull();
        expect(movement(a, 1)).toBe(1);
        expect(movement(ins.members.get('b')!.weeks, 1)).toBe(-1);
    });

    it('movement: null when the house did not submit either week', () => {
        const w1 = week(1, [house('A', [person('a', 'member', 1)])]);
        const w2 = week(2, [house('A', [person('a', 'member', 0)], { submitted: false })]);
        expect(movement(buildInsights(dataFile(w1, w2)).members.get('a')!.weeks, 1)).toBeNull();
    });

    it('perfect week needs every target met and every target set', () => {
        const ok = person('ok', 'member', 1);
        const short = person('short', 'member', 1, { 'НФ': 6 });
        const noTarget = person('nt', 'member', 1);
        noTarget.target['ДТА'] = 0;
        const ins = buildInsights(dataFile(week(1, [house('A', [ok, short, noTarget])])));
        expect(weekOf(ins.members.get('ok')!.weeks, 0)!.perfect).toBe(true);
        expect(weekOf(ins.members.get('short')!.weeks, 0)!.perfect).toBe(false);
        expect(weekOf(ins.members.get('nt')!.weeks, 0)!.perfect).toBe(false);
    });

    it('streaks count consecutive weeks only', () => {
        const ws = [0, 1, 2, 4, 5].map(i => ({ weekIndex: i, ok: true }));
        expect(streakUntil(ws, 2, w => w.ok)).toBe(3);
        expect(streakUntil(ws, 5, w => w.ok)).toBe(2);
        expect(longestStreak(ws, w => w.ok)).toBe(3);
    });

    it('a person who joins later has no false zero weeks before joining', () => {
        const w1 = week(1, [house('A', [person('a', 'member', 1)])]);
        const w2 = week(2, [house('A', [person('a', 'member', 1), person('new', 'member', 1)])]);
        const ins = buildInsights(dataFile(w1, w2));
        expect(ins.members.get('new')!.weeks.map(w => w.weekIndex)).toEqual([1]);
    });
});

describe('season summary (Wrapped)', () => {
    it('totals, average, best week, rank and growth', async () => {
        const { seasonSummary } = await import('./insights');
        const weeks = [0.5, 0.6, 0.9, 1.0].map((f, i) => week(i + 1, [house('A', [person('me', 'member', f), person('other', 'member', 0.7)])]));
        const ins = buildInsights(dataFile(...weeks));
        const s = seasonSummary(ins.members.get('me')!, ins, 4);
        expect(s.weeksTotal).toBe(4);
        expect(s.weeksActive).toBe(4);
        expect(s.best!.weekNumber).toBe(4);
        expect(s.perfectWeeks).toBe(1);
        expect(s.rank).toBe(1);
        expect(s.of).toBe(2);
        expect(s.growth).toBeGreaterThan(0);
        expect(s.total).toBeCloseTo(s.average * 4, 0);
    });

    it('growth is null with fewer than 4 counted weeks', async () => {
        const { seasonSummary } = await import('./insights');
        const ins = buildInsights(dataFile(week(1, [house('A', [person('me')])])));
        expect(seasonSummary(ins.members.get('me')!, ins, 1).growth).toBeNull();
    });
});
