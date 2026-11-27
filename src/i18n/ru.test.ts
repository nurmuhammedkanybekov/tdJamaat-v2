import { afterEach, describe, expect, it } from 'vitest';
import { EN } from './en';
import { RU } from './ru';
import { __setLangForTests, placeSuffix, t } from './index';

const indexes = (s: string) => new Set([...s.matchAll(/\{(\d+)[:|}]/g)].map(m => m[1]));

describe('Russian texts', () => {
    afterEach(() => __setLangForTests('ky'));

    it('covers every text the English does, and nothing else', () => {
        expect(Object.keys(EN).filter(k => !(k in RU))).toEqual([]);
        expect(Object.keys(RU).filter(k => !(k in EN))).toEqual([]);
    });

    it('uses only the placeholders the Kyrgyz text has', () => {
        const bad = Object.entries(RU).filter(([ky, ru]) => [...indexes(ru)].some(i => !indexes(ky).has(i)));
        expect(bad).toEqual([]);
    });

    it('plural forms have three words', () => {
        const bad = Object.values(RU).flatMap(v => [...v.matchAll(/\{\d+\|([^}]*)\}/g)].map(m => m[1])).filter(f => f.split('|').length !== 3);
        expect(bad).toEqual([]);
    });

    it('fills Russian plurals', () => {
        __setLangForTests('ru');
        expect(t('{0} апта', 1)).toBe('1 неделя');
        expect(t('{0} апта', 3)).toBe('3 недели');
        expect(t('{0} апта', 5)).toBe('5 недель');
        expect(t('{0} апта', 11)).toBe('11 недель');
        expect(t('{0} апта', 22)).toBe('22 недели');
        expect(t('{0}-апта', 6)).toBe('6-я неделя');
        expect(placeSuffix(3)).toBe('-е место');
        expect(t('Бул текст котормосуз')).toBe('Бул текст котормосуз');
    });
});
