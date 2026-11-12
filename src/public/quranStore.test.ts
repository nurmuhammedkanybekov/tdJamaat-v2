import { describe, expect, it } from 'vitest';
import { searchKey } from './quranStore';

const finds = (typed: string, name: string) => searchKey(name).includes(searchKey(typed));

describe('surah search', () => {
    it('finds a surah typed in Kyrgyz letters', () => {
        expect(finds('бакара', 'Al-Baqarah')).toBe(true);
        expect(finds('фатиха', 'Al-Fatihah')).toBe(true);
        expect(finds('ясин', 'Ya-Sin')).toBe(true);
        expect(finds('ихлас', 'Al-Ikhlas')).toBe(true);
        expect(finds('рахман', 'Ar-Rahman')).toBe(true);
        expect(finds('мүлк', 'Al-Mulk')).toBe(true);
        expect(finds('кахф', 'Al-Kahf')).toBe(true);
        expect(finds('юсуф', 'Yusuf')).toBe(true);
    });
    it('finds a surah typed loosely in Latin', () => {
        expect(finds('baqara', 'Al-Baqarah')).toBe(true);
        expect(finds('yasin', 'Ya-Sin')).toBe(true);
        expect(finds('ikhlas', 'Al-Ikhlas')).toBe(true);
    });
    it('does not match everything', () => {
        expect(finds('бакара', 'Yusuf')).toBe(false);
        expect(searchKey('123')).toBe('');
    });
});
