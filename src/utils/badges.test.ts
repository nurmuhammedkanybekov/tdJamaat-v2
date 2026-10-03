import { describe, expect, it } from 'vitest';
import { computeAwards } from './badges';
import { buildInsights } from './insights';
import { card, dataFile, house, person, week } from '../test/factory';
import type { DataFile } from '../types';

const awardsOf = (data: DataFile) => computeAwards(data, buildInsights(data));
const ids = (data: DataFile, holder: string) => awardsOf(data).filter(a => a.holderId === holder).map(a => a.def.id);

describe('awards', () => {
    it('star of the week and podium go to places 1, 2 and 3', () => {
        const data = dataFile(week(1, [house('A', [
            person('p1', 'member', 1.2), person('p2', 'member', 1), person('p3', 'member', 0.8), person('p4', 'member', 0.5)
        ])]));
        expect(ids(data, 'p1')).toContain('week-star');
        expect(ids(data, 'p2')).toContain('podium');
        expect(ids(data, 'p3')).toContain('podium');
        expect(ids(data, 'p4')).not.toContain('podium');
    });

    it('nobody earns anything in a week their house did not submit', () => {
        const data = dataFile(week(1, [house('A', [person('p', 'member', 2)], { submitted: false })]));
        expect(awardsOf(data)).toHaveLength(0);
    });

    it('perfect plan needs all 8 targets', () => {
        const data = dataFile(week(1, [house('A', [person('ok', 'member', 1), person('no', 'member', 1, { 'ТСП': 6 })])]));
        expect(ids(data, 'ok')).toContain('perfect');
        expect(ids(data, 'no')).not.toContain('perfect');
    });

    it('"double" ignores СВТ and ИСТГ but counts К-К', () => {
        const svt = person('svt', 'member', 1, { 'СВТ': 2100, 'ИСТГ': 600 });
        const kk = person('kk', 'member', 1, { 'К-К': 14 });
        const data = dataFile(week(1, [house('A', [svt, kk])]));
        expect(ids(data, 'svt')).not.toContain('double');
        expect(ids(data, 'kk')).toContain('double');
    });

    it('"double" needs a target of at least 5 (ДТА 2/1 is not enough)', () => {
        const data = dataFile(week(1, [house('A', [person('d', 'member', 1, { 'ДТА': 2 })])]));
        expect(ids(data, 'd')).not.toContain('double');
    });

    it('a 3-week perfect streak is awarded once, on the third week', () => {
        const weeks = [1, 2, 3, 4].map(n => week(n, [house('A', [person('s', 'member', 1)])]));
        const iron = awardsOf(dataFile(...weeks)).filter(a => a.def.id === 'iron-3');
        expect(iron).toHaveLength(1);
        expect(iron[0].weekNumber).toBe(3);
    });

    it('biggest leap needs at least +10 points', () => {
        const small = dataFile(week(1, [house('A', [person('a', 'member', 0.5)])]), week(2, [house('A', [person('a', 'member', 0.52)])]));
        const big = dataFile(week(1, [house('A', [person('a', 'member', 0.5)])]), week(2, [house('A', [person('a', 'member', 0.9)])]));
        expect(ids(small, 'a')).not.toContain('leap');
        expect(ids(big, 'a')).toContain('leap');
    });

    it('house of the month is decided when a 4-week period completes', () => {
        const mk = (n: number) => week(n, [
            house('A', [person('a', 'member', 1)], { miniCard: card(1) }),
            house('B', [person('b', 'member', 0.8)], { miniCard: card(0.5) })
        ]);
        const three = dataFile(mk(1), mk(2), mk(3));
        const four = dataFile(mk(1), mk(2), mk(3), mk(4));
        expect(ids(three, 'A')).not.toContain('house-month');
        expect(ids(four, 'A')).toContain('house-month');
        expect(ids(four, 'B')).not.toContain('house-month');
    });

    it('mini-card master needs all 7 activities at target', () => {
        const data = dataFile(week(1, [
            house('A', [person('a')], { miniCard: card(1) }),
            house('B', [person('b')], { miniCard: card(1, { 'КИТЕП': 4 }) })
        ]));
        expect(ids(data, 'A')).toContain('house-card');
        expect(ids(data, 'B')).not.toContain('house-card');
    });

    it('every award carries a concrete reason with the week number', () => {
        const data = dataFile(week(6, [house('A', [person('a', 'member', 1)])]));
        for (const a of awardsOf(data)) expect(a.reason).toMatch(/6-апта/);
    });
});
