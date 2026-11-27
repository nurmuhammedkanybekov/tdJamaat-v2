// Жаттоо (memorization, hifz): what each person has learned by heart —
// Quran (surah and ayahs), hadith, duas, zikr / adhkar, the 99 Names, or
// anything else. Captains write it down after hearing it recited. It gives
// no points: it shows on profiles, the house page and the
// community page, and earns badges.
import { t } from '../i18n';
import { surah } from './quranMeta';

export type JattooCategory = 'quran' | 'hadith' | 'dua' | 'zikr' | 'names' | 'other';
export const CATEGORIES: JattooCategory[] = ['quran', 'hadith', 'dua', 'zikr', 'names', 'other'];

export const CATEGORY_LABEL: Record<JattooCategory, string> = {
    quran: t('Куран'), hadith: t('Хадис'), dua: t('Дуба'), zikr: t('Зикир, азкар'), names: t('Аллахтын 99 ысымы'), other: t('Башка')
};
/** The word for one unit of each category ("12 аят", "3 хадис"). */
export const unitLabel = (c: JattooCategory, n: number): string => ({
    quran: t('{0} аят', n), hadith: t('{0} хадис', n), dua: t('{0} дуба', n), zikr: t('{0} зикир', n), names: t('{0} ысым', n), other: t('{0} бөлүм', n)
})[c];

export interface JattooRecord {
    id: number;
    memberId: string;
    /** House at the time it was written down. */
    houseId: string | null;
    category: JattooCategory;
    /** What was memorized: a surah's name, "Нававинин 40 хадисинен 12-хадис", "Таң эртеңки дуба"… */
    title: string;
    /** Quran only: surah 1–114 and the ayahs (inclusive). */
    surah: number | null;
    ayahFrom: number | null;
    ayahTo: number | null;
    /** How many units (ayahs for the Quran: the size of the range). */
    amount: number;
    /** 'YYYY-MM-DD' — the day it was recited to the captain. */
    recitedOn: string;
    note: string | null;
    /** false: the person noted it themselves; a captain has not listened yet. */
    verified?: boolean;
}

export interface JattooGoal {
    id: number;
    memberId: string;
    category: JattooCategory;
    title: string;
    surah: number | null;
    ayahFrom: number | null;
    ayahTo: number | null;
    /** Units to reach (ayahs for a Quran goal: the size of its range). */
    target: number;
    /** 'YYYY-MM-DD' or null (no deadline). */
    dueDate: string | null;
    /** 'YYYY-MM-DD' the goal was set (for the pace). */
    startDate: string;
    /** supabase/plans-2026-11.sql: memorization, Quran reading or a book. */
    track?: PlanTrack;
    status?: PlanStatus;
    author?: string | null;
    /** Quran reading: the pages planned (1–604). */
    pageFrom?: number | null;
    pageTo?: number | null;
    createdByRole?: string | null;
}

export type PlanTrack = 'hifz' | 'reading' | 'book';
export type PlanStatus = 'active' | 'paused' | 'done' | 'dropped';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** The distinct ayahs of one surah memorized (overlapping or repeated ranges count once). */
export const quranAyahs = (records: JattooRecord[], surahN: number, from = 1, to = Infinity): Set<number> => {
    const set = new Set<number>();
    records.forEach(r => {
        if (r.category !== 'quran' || r.surah !== surahN || r.ayahFrom === null || r.ayahTo === null) return;
        for (let a = Math.max(r.ayahFrom, from); a <= Math.min(r.ayahTo, to); a++) set.add(a);
    });
    return set;
};

export interface JattooSummary {
    /** Distinct ayahs memorized, all surahs together. */
    ayahs: number;
    /** Surahs memorized in full. */
    surahsComplete: number[];
    /** Units per category other than the Quran. */
    counts: Record<Exclude<JattooCategory, 'quran'>, number>;
    records: number;
    lastDate: string | null;
}

export const summarize = (records: JattooRecord[]): JattooSummary => {
    const surahs = [...new Set(records.filter(r => r.category === 'quran' && r.surah).map(r => r.surah!))];
    let ayahs = 0;
    const complete: number[] = [];
    surahs.forEach(n => {
        const got = quranAyahs(records, n).size;
        ayahs += got;
        const s = surah(n);
        if (s && got >= s.ayahs) complete.push(n);
    });
    const counts = { hadith: 0, dua: 0, zikr: 0, names: 0, other: 0 };
    records.forEach(r => { if (r.category !== 'quran') counts[r.category] += Math.max(0, r.amount); });
    const lastDate = records.reduce<string | null>((m, r) => (!m || r.recitedOn > m ? r.recitedOn : m), null);
    return { ayahs, surahsComplete: complete.sort((a, b) => a - b), counts, records: records.length, lastDate };
};

export type GoalStatus = 'done' | 'ontrack' | 'behind' | 'overdue' | 'open';

export interface GoalProgress {
    done: number;
    target: number;
    pct: number;
    status: GoalStatus;
    /** Units still to do per remaining week to meet the deadline (null without a deadline). */
    perWeek: number | null;
}

const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

/** How far a goal is: a Quran goal counts the ayahs of its range; another goal
 *  counts the person's records of the same category and title. */
export const goalProgress = (goal: JattooGoal, records: JattooRecord[], today: string): GoalProgress => {
    const mine = records.filter(r => r.memberId === goal.memberId);
    const done = goal.category === 'quran' && goal.surah
        ? quranAyahs(mine, goal.surah, goal.ayahFrom ?? 1, goal.ayahTo ?? Infinity).size
        : mine.filter(r => r.category === goal.category && norm(r.title) === norm(goal.title)).reduce((s, r) => s + Math.max(0, r.amount), 0);
    const target = Math.max(1, goal.target);
    const pct = Math.min(100, Math.round((done / target) * 100));
    let status: GoalStatus = 'open';
    let perWeek: number | null = null;
    if (done >= target) status = 'done';
    else if (goal.dueDate) {
        const left = days(today, goal.dueDate);
        if (left < 0) status = 'overdue';
        else {
            const total = Math.max(1, days(goal.startDate, goal.dueDate));
            const expected = target * Math.min(1, Math.max(0, days(goal.startDate, today) / total));
            status = done + 1e-9 >= expected ? 'ontrack' : 'behind';
            perWeek = Math.ceil((target - done) / Math.max(1, left / 7));
        }
    }
    return { done, target, pct, status, perWeek };
};

export interface JattooBadge { id: string; name: string; rule: string; tier: 'bronze' | 'silver' | 'gold' | 'seal' }

/** Badges for memorization (no points). */
export const jattooBadges = (s: JattooSummary): JattooBadge[] => {
    const out: JattooBadge[] = [];
    const hadith = s.counts.hadith, duas = s.counts.dua;
    if (s.records > 0) out.push({ id: 'j-first', name: t('Жаттоо жолунда'), rule: t('Биринчи жатталган нерсе жазылды'), tier: 'bronze' });
    if (s.surahsComplete.length >= 1) out.push({ id: 'j-surah', name: t('Сүрө жатталды'), rule: t('Бир сүрөнү толук жаттады'), tier: 'silver' });
    if (s.surahsComplete.length >= 10) out.push({ id: 'j-surah10', name: t('Он сүрө'), rule: t('10 сүрөнү толук жаттады'), tier: 'gold' });
    if (s.ayahs >= 100) out.push({ id: 'j-100', name: t('Жүз аят'), rule: t('100 аят жаттады'), tier: 'gold' });
    if (s.ayahs >= 1000) out.push({ id: 'j-1000', name: t('Миң аят'), rule: t('1000 аят жаттады'), tier: 'seal' });
    if (hadith >= 10) out.push({ id: 'j-hadith10', name: t('Хадис сактоочу'), rule: t('10 хадис жаттады'), tier: 'silver' });
    if (hadith >= 40) out.push({ id: 'j-hadith40', name: t('Кырк хадис'), rule: t('40 хадис жаттады'), tier: 'gold' });
    if (duas >= 10) out.push({ id: 'j-dua10', name: t('Дуба китеби'), rule: t('10 дуба жаттады'), tier: 'silver' });
    if (s.counts.names >= 99) out.push({ id: 'j-names', name: t('Асмаул Хусна'), rule: t('Аллахтын 99 ысымын жаттады'), tier: 'seal' });
    return out;
};
