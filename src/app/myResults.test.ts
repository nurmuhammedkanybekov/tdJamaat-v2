import { describe, expect, it } from 'vitest';
import { computeAwards } from '../utils/badges';
import { buildInsights } from '../utils/insights';
import { dataFile, house, person, week } from '../test/factory';
import { houseOnly, myAwards, nextGoals } from './myResults';

describe('my results', () => {
    const data = dataFile(
        week(1, [house('A', [person('me', 'member', 1), person('x', 'member', 0.5)]), house('B', [person('b', 'member', 2)])]),
        week(2, [house('A', [person('me', 'member', 1), person('x', 'member', 0.5)]), house('B', [person('b', 'member', 2)])])
    );

    it('keeps only the member\'s own house', () => {
        const d = houseOnly(data, 'A');
        expect(d.weeks.every(w => w.teams.length === 1 && w.teams[0].id === 'A')).toBe(true);
    });

    it('shows only awards that do not compare houses, grouped with a count', () => {
        const d = houseOnly(data, 'A');
        const awards = computeAwards(d, buildInsights(d));
        expect(awards.some(a => a.holderId === 'me' && a.def.id === 'week-star')).toBe(true);
        const mine = myAwards(awards, 'me');
        expect(mine.map(a => a.award.def.id)).not.toContain('week-star');
        const perfect = mine.find(a => a.award.def.id === 'perfect');
        expect(perfect?.count).toBe(2);
        expect(perfect?.weeks).toEqual([1, 2]);
    });

    it('next goals: the perfect week, then the runs', () => {
        const d = houseOnly(data, 'A');
        const ins = buildInsights(d);
        const me = ins.members.get('me')!;
        expect(nextGoals(me.weeks, 1)).toEqual([{ id: 'iron-3', have: 2, need: 3 }, { id: 'steady-4', have: 2, need: 4 }]);
        const x = ins.members.get('x')!;
        const g = nextGoals(x.weeks, 1);
        expect(g[0].id).toBe('perfect');
        expect(g[0].need).toBe(8);
        expect(g.find(y => y.id.startsWith('iron'))).toBeUndefined();
    });
});
