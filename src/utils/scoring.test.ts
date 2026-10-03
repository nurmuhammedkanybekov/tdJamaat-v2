import { describe, expect, it } from 'vitest';
import { calculateHouseRating, calculateMemberAverage, calculateMemberScore, calculateMiniCardBonus, calculatePerformancePercentage, MINI_CARD_POINTS, weights } from './scoring';
import { PLAN_SCORE } from './insights';
import { card, house, person } from '../test/factory';

describe('member score', () => {
    it('weights match the season formula (СВТ and ИСТГ are 1)', () => {
        expect(weights).toEqual({ 'К-К': 45, 'СВТ': 1, 'КТП': 35, 'ТХЖ': 20, 'ДТА': 30, 'ИСТГ': 1, 'НФ': 20, 'ТСП': 25 });
    });

    it('exactly 100% of every target earns the plan score (sum of weights)', () => {
        expect(PLAN_SCORE).toBe(177);
        for (const role of ['imam', 'zam', 'member'] as const) {
            expect(calculateMemberScore(person('a', role, 1))).toBe(177);
        }
    });

    it('nothing done scores 0', () => {
        expect(calculateMemberScore(person('a', 'member', 0))).toBe(0);
    });

    it('is not capped: double the К-К target doubles К-К points', () => {
        const base = person('a', 'member', 1);
        const extra = person('a', 'member', 1, { 'К-К': 14 });
        expect(calculateMemberScore(extra) - calculateMemberScore(base)).toBe(45);
    });

    it('a missing target (0) earns 0% for that metric, never inflated', () => {
        const m = person('a', 'member', 1);
        m.target['К-К'] = 0;
        m.actual['К-К'] = 50;
        expect(calculatePerformancePercentage(50, 0)).toBe(0);
        expect(calculateMemberScore(m)).toBe(177 - 45);
    });

    it('rounds to one decimal', () => {
        const m = person('a', 'member', 0, { 'К-К': 1 }); // 1/7 × 45 = 6.428…
        expect(calculateMemberScore(m)).toBe(6.4);
    });
});

describe('house rating', () => {
    it('mini-card: each activity is worth up to MINI_CARD_POINTS, all seven = 35', () => {
        expect(MINI_CARD_POINTS).toBe(5);
        expect(calculateMiniCardBonus(card(1))).toBe(35);
        expect(calculateMiniCardBonus(card(0))).toBe(0);
    });

    it('mini-card: overshooting is capped at 100% per activity (СПОРТ 7/1 is not 700%)', () => {
        expect(calculateMiniCardBonus(card(0, { 'СПОРТ': 7 }))).toBe(5);
        expect(calculateMiniCardBonus(card(2))).toBe(35);
    });

    it('mini-card: an activity with no target earns nothing; negative actual earns nothing', () => {
        const c = card(1);
        c['БАБХ'] = { actual: 7, target: 0 };
        c['КПТ'] = { actual: -3, target: 7 };
        expect(calculateMiniCardBonus(c)).toBe(25);
    });

    it('rating = member average + mini-card bonus', () => {
        const h = house('A', [person('a', 'member', 1), person('b', 'member', 0)], { miniCard: card(1) });
        expect(calculateMemberAverage(h)).toBe(88.5);
        expect(calculateHouseRating(h)).toBe(123.5);
    });

    it('a house with no members never produces NaN', () => {
        const h = house('A', [], { miniCard: card(1) });
        expect(calculateMemberAverage(h)).toBe(0);
        expect(calculateHouseRating(h)).toBe(35);
    });

    it('averaging keeps a small house fair against a big one', () => {
        const small = house('S', [person('a', 'member', 1)]);
        const big = house('B', [person('b', 'member', 1), person('c', 'member', 1), person('d', 'member', 1)]);
        expect(calculateHouseRating(small)).toBe(calculateHouseRating(big));
    });
});
