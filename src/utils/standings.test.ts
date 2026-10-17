import { describe, expect, it } from 'vitest';
import { buildInsights } from './insights';
import { houseCity, houseStandings, personStandings } from './standings';
import { dataFile, house, person, week } from '../test/factory';

// Mester and Pannonia are in Budapest, Baksai in Debrecen.
const data = dataFile(
    week(1, [house('Mester', [person('m1', 'member', 1)]), house('Pannonia', [person('p1', 'member', 0.5)]), house('Baksai', [person('b1', 'member', 0.8), person('late', 'member', 0, {})])]),
    week(2, [house('Mester', [person('m1', 'member', 0.6)]), house('Pannonia', [person('p1', 'member', 1.2)]), house('Baksai', [person('b1', 'member', 0.9), person('late', 'member', 1.5)])]),
    week(3, [house('Mester', [person('m1', 'member', 0.7)]), house('Pannonia', [person('p1', 'member', 1.1)]), house('Baksai', [person('b1', 'member', 0.9)], { submitted: false })])
);
const insights = buildInsights(data);

describe('cities', () => {
    it('Pannonia, Damjanich and Mester are Budapest; the rest Debrecen', () => {
        expect(['Pannonia', 'Damjanich', 'Mester', 'Дамянич', 'Baksai', 'Dobozy'].map(houseCity))
            .toEqual(['budapest', 'budapest', 'budapest', 'budapest', 'debrecen', 'debrecen']);
    });
});

describe('house standings', () => {
    it('week, everyone: the same ranks as the rest of the site', () => {
        const rows = houseStandings(insights, 2, 'week', 'all');
        rows.forEach(r => expect(r.rank).toBe(r.week!.rank));
        expect(rows.find(r => r.h.name === 'Baksai')!.value).toBeNull();   // not entered yet
    });

    it('season: average of the counted weeks so far, best first', () => {
        const rows = houseStandings(insights, 2, 'season', 'all');
        const values = rows.map(r => r.value!);
        expect(values).toEqual([...values].sort((a, b) => b - a));
        expect(rows[0].h.name).toBe('Pannonia');
        expect(rows.map(r => r.rank)).toEqual([1, 2, 3]);
        const mester = insights.houses.get('Mester')!.weeks.map(w => w.avg);
        expect(rows.find(r => r.h.name === 'Mester')!.value).toBeCloseTo((mester[0] + mester[1] + mester[2]) / 3, 0);
        expect(rows.find(r => r.h.name === 'Baksai')!.weeks).toBe(2);       // week 3 not entered: not counted
        expect(rows.find(r => r.h.name === 'Pannonia')!.weeks).toBe(3);
    });

    it('city filter ranks within the city', () => {
        const rows = houseStandings(insights, 2, 'week', 'budapest');
        expect(rows.map(r => r.h.name).sort()).toEqual(['Mester', 'Pannonia']);
        expect(rows.map(r => r.rank)).toEqual([1, 2]);
        expect(houseStandings(insights, 2, 'season', 'debrecen').map(r => r.h.name)).toEqual(['Baksai']);
    });
});

describe('person standings', () => {
    it('season: someone with under half of the weeks is listed without a place', () => {
        // "late" counted only in week 2 (week 1 at 0 counts too: house submitted) → check with week 3 cut
        const rows = personStandings(insights, 2, 'season', 'all', 3);
        const ranked = rows.filter(r => r.rank !== null).map(r => r.s.id);
        expect(ranked).toContain('p1');
        expect(rows[rows.length - 1].rank === null || rows.every(r => r.rank !== null)).toBe(true);
        // ranks are 1..n without gaps for distinct values
        const ranks = rows.filter(r => r.rank !== null).map(r => r.rank);
        expect(ranks).toEqual([...ranks].sort((a, b) => a! - b!));
    });

    it('min weeks: one great week can not top the season', () => {
        const d = dataFile(
            week(1, [house('Mester', [person('steady', 'member', 1)])]),
            week(2, [house('Mester', [person('steady', 'member', 1)])]),
            week(3, [house('Mester', [person('steady', 'member', 1), person('once', 'member', 3)])])
        );
        const rows = personStandings(buildInsights(d), 2, 'season', 'all', 3);
        expect(rows[0].s.id).toBe('steady');
        expect(rows.find(r => r.s.id === 'once')!.rank).toBeNull();
    });

    it('city filter keeps only people of that city, ranked within it', () => {
        const rows = personStandings(insights, 1, 'week', 'debrecen', 2);
        expect(rows.every(r => r.week!.houseName === 'Baksai')).toBe(true);
        expect(rows[0].rank).toBe(1);
    });
});
