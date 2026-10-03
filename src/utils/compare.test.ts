import { describe, expect, it } from 'vitest';
import { buildInsights } from './insights';
import { defaultRival, headToHead, houseRows, metricAverages, personRows, rowWinner } from './compare';
import { card, dataFile, house, person, week } from '../test/factory';

const data = dataFile(
    week(1, [house('A', [person('a', 'member', 1)], { miniCard: card(1) }), house('B', [person('b', 'member', 0.5)])]),
    week(2, [house('A', [person('a', 'member', 0.5)]), house('B', [person('b', 'member', 1)])]),
    week(3, [house('A', [person('a', 'member', 1)]), house('B', [person('b', 'member', 0.5)], { submitted: false })])
);
const ins = buildInsights(data);

describe('compare', () => {
    it('picks the winner of a row, smaller wins for places', () => {
        expect(rowWinner({ label: '', a: 10, b: 5, format: 'score' })).toBe('a');
        expect(rowWinner({ label: '', a: 1, b: 2, format: 'rank', lowerBetter: true })).toBe('a');
        expect(rowWinner({ label: '', a: 3, b: 3, format: 'count' })).toBeNull();
        expect(rowWinner({ label: '', a: null, b: 3, format: 'score' })).toBeNull();
    });

    it('head to head counts only weeks both sides submitted', () => {
        const h = headToHead(ins.members.get('a')!.weeks, ins.members.get('b')!.weeks, w => w.score);
        expect(h).toEqual({ a: 1, b: 1, draws: 0 }); // week 3: B did not submit
    });

    it('person rows: this week, places and perfect weeks', () => {
        const rows = personRows(ins.members.get('a')!, ins.members.get('b')!, ins, [], 2, 3);
        const row = (l: string) => rows.find(r => r.label === l)!;
        expect(row('Ушул апта').b).toBeNull();
        expect(row('Аптадагы орун').a).toBe(1);
        expect(row('Толук план')).toMatchObject({ a: 2, b: 1 });
        expect(rowWinner(row('Сезондогу орун'))).toBe('a');
    });

    it('house rows include the mini-card average', () => {
        const rows = houseRows(ins.houses.get('A')!, ins.houses.get('B')!, ins, [], 1);
        const cardRow = rows.find(r => r.label === 'Мини-карта (орточо)')!;
        expect(cardRow.a).toBeGreaterThan(0);
        expect(cardRow.b).toBe(0);
        expect(rows.find(r => r.label === '1-орундагы апталар')!.a).toBe(2);
    });

    it('metric averages are percent of target over submitted weeks', () => {
        expect(metricAverages(ins.members.get('b')!)['НФ']).toBe(Math.round((57 + 100) / 2)); // 4/7 and 7/7
    });

    it('default rival is the neighbour in the list', () => {
        expect(defaultRival(['x', 'y', 'z'], 'x')).toBe('y');
        expect(defaultRival(['x', 'y', 'z'], 'z')).toBe('y');
        expect(defaultRival(['x', 'y', 'z'], undefined)).toBe('y');
        expect(defaultRival(['x'], 'x')).toBeUndefined();
    });
});
