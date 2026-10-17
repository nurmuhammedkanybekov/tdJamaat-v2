import { describe, expect, it } from 'vitest';
import { buildInsights } from './insights';
import { computeAwards } from './badges';
import { hallOfFame, seasonRecords, seasonTotals, totalsFor, weekOverWeek } from './community';
import { card, dataFile, house, person, week, TARGETS } from '../test/factory';

const df = dataFile(
    week(1, [house('A', [person('a', 'member', 1), person('b', 'member', 0.5)], { miniCard: card(1) }), house('B', [person('c', 'member', 1)])]),
    week(2, [house('A', [person('a', 'member', 1), { ...person('b', 'member', 1), excused: true }], { miniCard: card(1) }), house('B', [person('c', 'member', 0.5)], { submitted: false })]),
    week(3, [house('A', [person('a', 'member', 1), person('b', 'member', 1)], { miniCard: card(1) }), house('B', [person('c', 'member', 1)])])
);
const ins = buildInsights(df);
const awards = computeAwards(df, ins);

describe('community totals', () => {
    it('sum every counted person-week (not excused, not an unsubmitted open week)', () => {
        const t = seasonTotals(df, ins);
        // К-К member target 7: a 3×7 + b (round(3.5)=4 + 7) + c 2×7 (week 2 not submitted) = 21 + 11 + 14
        expect(t.metrics['К-К']).toBe(46);
        expect(t.personWeeks).toBe(7);
    });

    it('mini-card totals only from submitted house weeks', () => {
        const t = seasonTotals(df, ins);
        expect(t.card['БГМДТ']).toBe(21);   // house A, 3 weeks × 7
        expect(t.houseWeeks).toBe(5);       // A×3 + B×2
    });

    it('a single week (this week vs last week)', () => {
        expect(totalsFor(df, ins, [1]).metrics['К-К']).toBe(TARGETS.member['К-К']); // only a: b excused, B not submitted
    });
});

describe('records and hall of fame', () => {
    it('records name the people behind them', () => {
        const r = seasonRecords(ins, awards);
        expect(r.find(x => x.label === 'Эң жогорку жеке апта')!.value).toBe('220');
        expect(r.length).toBeGreaterThanOrEqual(3);
    });

    it('hall of fame: best house, top people (need half the season), streaks', () => {
        const h = hallOfFame({ id: 1, name: '2026–27', lastWeek: null }, df, ins, awards);
        expect(h.house!.name).toBe('A');
        expect(h.people[0].avg).toBe(220);
        expect(h.people.every(p => p.weeks >= 2)).toBe(true);
        expect(h.finished).toBe(false);
        expect(h.streak!.weeks).toBeGreaterThanOrEqual(2);
    });

    it('an empty season shows nothing instead of crashing', () => {
        const empty = dataFile();
        const h = hallOfFame({ id: 2, name: '2027', lastWeek: null }, empty, buildInsights(empty), []);
        expect(h.house).toBeNull();
        expect(h.people).toEqual([]);
        expect(seasonTotals(empty, buildInsights(empty)).personWeeks).toBe(0);
    });
});

describe('this week vs last week', () => {
    it('compares only houses that entered both weeks (a late house is not a "drop")', () => {
        const d = dataFile(
            week(1, [house('A', [person('a', 'member', 1)]), house('B', [person('b', 'member', 1)])]),
            week(2, [house('A', [person('a', 'member', 1)]), house('B', [person('b', 'member', 1)], { submitted: false })])
        );
        const i = buildInsights(d);
        const w = weekOverWeek(d, i, 1);
        expect(w.houses).toBe(1);
        expect(w.thisWeek.metrics['К-К']).toBe(w.lastWeek.metrics['К-К']); // same house, same work → no change
    });
});
