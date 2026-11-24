import { describe, expect, it } from 'vitest';
import { DEFAULT_TAZALYK_ITEMS, TAZALYK_MAX, isComplete, normalizeScores, tazalykPoints } from './tazalyk';

const items = DEFAULT_TAZALYK_ITEMS;
const all = (n: number) => Object.fromEntries(items.map(i => [i, n]));

describe('Тазалык points', () => {
    it('five items rated 0–5: the sum is the points, at most 25', () => {
        expect(tazalykPoints(all(5), items)).toBe(TAZALYK_MAX);
        expect(tazalykPoints(all(0), items)).toBe(0);
        expect(tazalykPoints({ ...all(4), [items[0]]: 3 }, items)).toBe(19);
    });
    it('any number of items is scaled to 25', () => {
        expect(tazalykPoints({ a: 5, b: 0, c: 5 }, ['a', 'b', 'c'])).toBe(16.7);
        expect(tazalykPoints({ a: 5 }, ['a'])).toBe(25);
        expect(tazalykPoints({}, [])).toBe(0);
    });
    it('unrated items count as 0; out-of-range and unknown ratings are tamed', () => {
        expect(tazalykPoints({ [items[0]]: 5 }, items)).toBe(5);
        expect(tazalykPoints({ ...all(5), [items[0]]: 99 }, items)).toBe(25);
        expect(tazalykPoints({ ...all(5), [items[0]]: -3, gone: 5 }, items)).toBe(20);
    });
    it('normalizes stored JSON and knows when every item is rated', () => {
        const s = normalizeScores({ [items[0]]: '4', [items[1]]: 7, [items[2]]: null, other: 3 }, items);
        expect(s).toEqual({ [items[0]]: 4, [items[1]]: 5 });
        expect(isComplete(s, items)).toBe(false);
        expect(isComplete(all(1), items)).toBe(true);
        expect(normalizeScores(null, items)).toEqual({});
    });
});
