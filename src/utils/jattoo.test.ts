import { describe, expect, it } from 'vitest';
import { goalProgress, jattooBadges, quranAyahs, summarize } from './jattoo';
import type { JattooGoal, JattooRecord } from './jattoo';
import { surah, TOTAL_AYAHS } from './quranMeta';

let id = 0;
const q = (s: number, from: number, to: number, on = '2026-11-20', member = 'm1'): JattooRecord =>
    ({ id: ++id, memberId: member, houseId: 'H', category: 'quran', title: surah(s)!.name, surah: s, ayahFrom: from, ayahTo: to, amount: to - from + 1, recitedOn: on, note: null });
const other = (category: JattooRecord['category'], title: string, amount: number, member = 'm1'): JattooRecord =>
    ({ id: ++id, memberId: member, houseId: 'H', category, title, surah: null, ayahFrom: null, ayahTo: null, amount, recitedOn: '2026-11-21', note: null });

describe('Жаттоо', () => {
    it('knows the Quran: 114 surahs, 6236 ayahs', () => {
        expect(TOTAL_AYAHS).toBe(6236);
        expect(surah(67)).toMatchObject({ name: 'Al-Mulk', ayahs: 30 });
    });
    it('overlapping and repeated ranges count once', () => {
        const recs = [q(67, 1, 10), q(67, 5, 15), q(67, 1, 3)];
        expect(quranAyahs(recs, 67).size).toBe(15);
        expect(quranAyahs(recs, 67, 11, 30).size).toBe(5);
    });
    it('summarizes ayahs, complete surahs and the other categories', () => {
        const s = summarize([q(1, 1, 7), q(112, 1, 4), q(67, 1, 10), other('hadith', 'Нававий 1', 1), other('hadith', 'Нававий 2', 1), other('dua', 'Таңкы дуба', 2)]);
        expect(s.ayahs).toBe(21);
        expect(s.surahsComplete).toEqual([1, 112]);
        expect(s.counts).toMatchObject({ hadith: 2, dua: 2 });
        expect(s.lastDate).toBe('2026-11-21');
    });
    it('a Quran goal counts its own range; pace says on track or behind', () => {
        const goal: JattooGoal = { id: 1, memberId: 'm1', category: 'quran', title: 'Al-Mulk', surah: 67, ayahFrom: 1, ayahTo: 30, target: 30, dueDate: '2026-12-31', startDate: '2026-11-01' };
        const recs = [q(67, 1, 10), q(2, 1, 50)];
        const early = goalProgress(goal, recs, '2026-11-10');
        expect(early).toMatchObject({ done: 10, target: 30, pct: 33, status: 'ontrack' });
        expect(goalProgress(goal, recs, '2026-12-20').status).toBe('behind');
        expect(goalProgress(goal, recs, '2027-01-05').status).toBe('overdue');
        expect(goalProgress(goal, [...recs, q(67, 11, 30)], '2027-01-05').status).toBe('done');
        expect(early.perWeek).toBeGreaterThan(0);
    });
    it('another goal counts records with the same category and title; no deadline = open', () => {
        const goal: JattooGoal = { id: 2, memberId: 'm1', category: 'dua', title: 'Таңкы дуба', surah: null, ayahFrom: null, ayahTo: null, target: 5, dueDate: null, startDate: '2026-11-01' };
        const p = goalProgress(goal, [other('dua', ' таңкы  дуба ', 2), other('dua', 'Башка', 9), other('dua', 'Таңкы дуба', 1, 'm2')], '2026-11-30');
        expect(p).toMatchObject({ done: 2, status: 'open', perWeek: null });
    });
    it('badges come from the totals', () => {
        expect(jattooBadges(summarize([])).length).toBe(0);
        const ids = jattooBadges(summarize([q(1, 1, 7), ...Array.from({ length: 10 }, (_, i) => other('hadith', `h${i}`, 1))])).map(b => b.id);
        expect(ids).toEqual(['j-first', 'j-surah', 'j-hadith10']);
    });
});
