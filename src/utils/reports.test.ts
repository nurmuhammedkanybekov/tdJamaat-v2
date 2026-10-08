import { describe, expect, it } from 'vitest';
import { buildInsights, weekCounts, weekOf } from './insights';
import { reportRows } from './reports';
import { dataFile, house, person, week } from '../test/factory';

const locked = <T extends { locked: boolean }>(w: T): T => ({ ...w, locked: true });

describe('weeks a house has not submitted', () => {
    it('count only once the admin has locked the week', () => {
        expect(weekCounts({ locked: false }, { submitted: false })).toBe(false);
        expect(weekCounts({ locked: true }, { submitted: false })).toBe(true);
        expect(weekCounts({ locked: false }, { submitted: true })).toBe(true);
    });

    it('open week: "—" in the report, left out of average and trend', () => {
        const weeks = [
            week(1, [house('A', [person('a', 'member', 1)]), house('B', [person('b', 'member', 0.5)])]),
            week(2, [house('A', [person('a', 'member', 0.5)]), house('B', [person('b', 'member', 0)], { submitted: false })])
        ];
        const rows = reportRows(weeks, [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }]);
        const b = rows.find(r => r.id === 'B')!;
        expect(b.cells[1]).toBeNull();
        expect(b.scores).toHaveLength(1);
        expect(b.change).toBeNull();
        expect(b.trend).toBe('stable');
        // A: first week higher than the second → down, by the real difference
        const a = rows.find(r => r.id === 'A')!;
        expect(a.trend).toBe('down');
        expect(a.change).toBeLessThan(0);
    });

    it('locked week: counts as 0 in the report and in rankings', () => {
        const weeks = [
            week(1, [house('A', [person('a', 'member', 1)]), house('B', [person('b', 'member', 0.5)])]),
            locked(week(2, [house('A', [person('a', 'member', 1)]), house('B', [person('b', 'member', 0)], { submitted: false })]))
        ];
        const b = reportRows(weeks, [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }]).find(r => r.id === 'B')!;
        expect(b.cells[1]).toBe(0);
        expect(b.trend).toBe('down');
        const ins = buildInsights(dataFile(...weeks));
        expect(weekOf(ins.houses.get('B')!.weeks, 1)!.rank).toBe(2);
        expect(weekOf(ins.members.get('b')!.weeks, 1)!.rank).toBe(2);
    });

    it('cells stay under their own week when an earlier week is missing', () => {
        const weeks = [
            week(1, [house('A', [person('a', 'member', 1)], { submitted: false })]),
            week(2, [house('A', [person('a', 'member', 1)])])
        ];
        const [a] = reportRows(weeks, [{ id: 'A', name: 'A' }]);
        expect(a.cells[0]).toBeNull();
        expect(a.cells[1]).not.toBeNull();
    });
});
