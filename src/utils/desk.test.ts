import { describe, expect, it } from 'vitest';
import { adminDesk, houseDesk } from './desk';
import { buildInsights } from './insights';
import { dataFile, house, person, week } from '../test/factory';

const w1 = week(1, [
    house('A', [person('a1', 'member', 1.2), person('a2', 'member', 1)]),
    house('B', [person('b1', 'member', 1), person('b2', 'member', 1, { 'СВТ': 0 })]),
    house('C', [person('c1', 'member', 0.6)])
]);
const w2 = week(2, [
    house('A', [person('a1', 'member', 1.2), person('a2', 'member', 1)]),
    house('B', [person('b1', 'member', 1), person('b2', 'member', 1)]),
    house('C', [person('c1', 'member', 0.6)], { submitted: false })
]);
const data = dataFile(w1, w2);
const ins = buildInsights(data);

describe('the captain\'s desk', () => {
    it('gives the place, the house just above and below, and the gap in points', () => {
        const d = houseDesk(data, ins, 'B', 0)!;
        expect(d.rank).toBe(2);
        expect(d.ranked).toBe(3);
        expect(d.above?.name).toBe('A');
        expect(d.below?.name).toBe('C');
        expect(d.above!.gap).toBeGreaterThan(0);
        expect(d.below!.gap).toBeGreaterThan(0);
    });

    it('the leader has nobody above; the change is against the previous counted week', () => {
        const d = houseDesk(data, ins, 'A', 1)!;
        expect(d.rank).toBe(1);
        expect(d.above).toBeNull();
        expect(d.change).toBe(0);
    });

    it('counts who reached the full plan and names the best person', () => {
        const d = houseDesk(data, ins, 'B', 0)!;
        expect(d.people).toBe(2);
        expect(d.onPlan).toBe(1);
        expect(d.best?.id).toBe('b1');
    });

    it('points at the metric that cost the most, with the people below plan there', () => {
        const d = houseDesk(data, ins, 'B', 0)!;
        expect(d.weakest?.metric).toBe('СВТ');
        expect(d.weakest?.below).toEqual(['b2']);
    });

    it('one person\'s surplus never hides another\'s shortfall', () => {
        const solo = dataFile(week(1, [house('S', [person('s1', 'member', 2), person('s2', 'member', 1, { 'СВТ': 0 })])]));
        const d = houseDesk(solo, buildInsights(solo), 'S', 0)!;
        expect(d.weakest?.metric).toBe('СВТ');
        expect(d.weakest?.missing).toBe(5);        // s2 lost all 10 points of СВТ, over 2 people
        expect(d.weakest?.below).toEqual(['s2']);
    });

    it('a house that has not entered the week: no rank, no numbers, ranked among the others only', () => {
        const d = houseDesk(data, ins, 'C', 1)!;
        expect(d.entered).toBe(false);
        expect(d.rank).toBeNull();
        expect(d.rating).toBeNull();
        expect(d.best).toBeNull();
        expect(d.weakest).toBeNull();
        expect(d.ranked).toBe(2);
    });

    it('unknown house → null', () => {
        expect(houseDesk(data, ins, 'Z', 0)).toBeNull();
    });
});

describe('the admin desk', () => {
    it('lists the houses that are still missing', () => {
        const d = adminDesk(w2);
        expect(d.entered).toBe(2);
        expect(d.total).toBe(3);
        expect(d.waiting.map(h => h.id)).toEqual(['C']);
    });

    it('shows every house with its status and rating', () => {
        const d = adminDesk(w2, ins, 1);
        expect(d.houses.map(h => [h.id, h.entered])).toEqual([['A', true], ['B', true], ['C', false]]);
        expect(d.houses[0].rating).toBeGreaterThan(0);
        expect(d.houses[2].rating).toBeNull();
    });
});
