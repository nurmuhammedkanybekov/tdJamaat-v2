import { describe, expect, it } from 'vitest';
import { isSuspicious, memberTypos, miniCardTypos, usualValues } from './typos';
import { card, TARGETS } from '../test/factory';

describe('typo warnings', () => {
    it('one extra zero is caught (СВТ 21000, plan 700, usually ~2100)', () => {
        expect(isSuspicious(21000, 700, 2100)).toBe(true);
    });

    it('someone who really does a lot is not nagged (usually 5000, now 7000)', () => {
        expect(isSuspicious(7000, 700, 5000)).toBe(false);
    });

    it('below 10× the plan is never a warning', () => {
        expect(isSuspicious(3, 1, null)).toBe(false);     // 3 fasts, plan 1
        expect(isSuspicious(6900, 700, null)).toBe(false);
    });

    it('10 fasts in one week (plan 1) is caught even without history', () => {
        expect(isSuspicious(10, 1, null)).toBe(true);
    });

    it('no plan, or nothing entered: no warning', () => {
        expect(isSuspicious(500, 0, null)).toBe(false);
        expect(isSuspicious(0, 7, null)).toBe(false);
    });

    it('usual value = median of recent non-zero weeks', () => {
        const h = [1, 2, 3].map(n => ({ ...TARGETS.member, 'СВТ': n * 1000, 'НФ': 0 }));
        const u = usualValues(h);
        expect(u['СВТ']).toBe(2000);
        expect(u['НФ']).toBeUndefined();
    });

    it('lists every suspicious field of a member and of the mini-card', () => {
        const actual = { ...TARGETS.member, 'СВТ': 21000, 'ДТА': 10 };
        const w = memberTypos('m', actual, TARGETS.member, { 'СВТ': 2100 });
        expect(w.map(x => x.key).sort()).toEqual(['ДТА', 'СВТ']);
        expect(miniCardTypos(card(0, { 'СПОРТ': 10 })).map(x => x.key)).toEqual(['СПОРТ']);
    });
});
