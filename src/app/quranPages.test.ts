import { describe, expect, it } from 'vitest';
import { JUZ_START, SURAH_PAGES, juzOf, juzPages, pageList, toRanges, wholeJuz } from './quranPages';

describe('mushaf pages', () => {
    it('juz boundaries', () => {
        expect(JUZ_START).toHaveLength(30);
        expect(juzPages(1)).toEqual([1, 21]);
        expect(juzPages(30)).toEqual([582, 604]);
        expect(juzOf(21)).toBe(1);
        expect(juzOf(22)).toBe(2);
        expect(juzOf(604)).toBe(30);
        // the 30 juz cover the 604 pages once
        expect(Array.from({ length: 30 }, (_, i) => juzPages(i + 1)).reduce((s, [a, b]) => s + b - a + 1, 0)).toBe(604);
    });
    it('surahs', () => {
        expect(SURAH_PAGES).toHaveLength(114);
        expect(SURAH_PAGES[1]).toEqual([2, 49]);
        expect(SURAH_PAGES[35]).toEqual([440, 445]);
    });
    it('ranges', () => {
        expect(pageList(5, 3)).toEqual([3, 4, 5]);
        expect(toRanges([8, 1, 2, 3, 5, 7])).toEqual([[1, 3], [5, 5], [7, 8]]);
        expect(wholeJuz(pageList(1, 41))).toEqual([1, 2]);
        expect(wholeJuz(pageList(1, 40))).toEqual([1]);
    });
});
