// The Quran text and its translations, fetched on demand from /quran (see
// public/quran/README.md): the Arabic exactly as the King Fahd Complex
// publishes it, and the translations exactly as QuranEnc publishes them.
// Nothing here edits or generates a word.
import { isEnglish, t } from '../i18n';

export interface Surah { n: number; ar: string; name: string; ayahs: number; place: 'makkah' | 'madinah'; page: number; juz: number; basmala: boolean }
/** [text, page, juz, sajda] */
export type Ayah = [string, number, number, 0 | 1];
/** [translation, footnotes?] */
export type Rendering = [string, string?];

const json = async <T>(url: string): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return await res.json() as T;
};

let indexCache: Surah[] | null = null;
export const cachedIndex = () => indexCache;
export const loadIndex = async (): Promise<Surah[]> => indexCache ?? (indexCache = await json<Surah[]>('/quran/index.json'));

let juzCache: Array<[number, number]> | null = null;
/** Where each of the 30 juz begins: [surah, ayah]. */
export const loadJuz = async () => juzCache ?? (juzCache = await json<Array<[number, number]>>('/quran/juz.json'));

const surahCache = new Map<number, Ayah[]>();
export const cachedSurah = (n: number) => surahCache.get(n) ?? null;
export const loadSurah = async (n: number): Promise<Ayah[]> => {
    const hit = surahCache.get(n);
    if (hit) return hit;
    const rows = await json<Ayah[]>(`/quran/${n}.json`);
    surahCache.set(n, rows);
    return rows;
};

/** The translation in the site's language (Kyrgyz: Sh. Hakimov; English: Saheeh International). */
export const translationLang = (): 'ky' | 'en' => (isEnglish() ? 'en' : 'ky');
const trCache = new Map<string, Rendering[]>();
export const loadTranslation = async (n: number, lang = translationLang()): Promise<Rendering[]> => {
    const key = `${lang}/${n}`;
    const hit = trCache.get(key);
    if (hit) return hit;
    const rows = await json<Rendering[]>(`/quran/${lang}/${n}.json`);
    trCache.set(key, rows);
    return rows;
};

/** The basmala as it stands at the head of a surah: al-Fatihah 1:1 without its verse-number sign. */
export const basmalaOf = (fatiha: Ayah[]) => fatiha[0][0].replace(/[\s\u00a0]*[\u0660-\u0669]+\s*$/, '');

/** An ayah's Arabic without its end-of-verse number (for copying). */
export const withoutNumber = (text: string) => text.replace(/[\s\u00a0]*[\u0660-\u0669]+\s*$/, '');

/** Ayahs that stand well on their own: on remembrance, mercy, patience,
 *  trust, prayer and good character. Only references — the words come from
 *  the mushaf file. */
export const DAILY_AYAHS: Array<[number, number]> = [
    [2, 152], [2, 153], [2, 186], [2, 201], [2, 255], [2, 286], [3, 8], [3, 139], [3, 159], [3, 190],
    [3, 200], [7, 23], [9, 51], [13, 28], [14, 7], [16, 97], [16, 128], [17, 23], [18, 10], [20, 114],
    [21, 87], [23, 118], [25, 63], [29, 45], [29, 69], [33, 41], [39, 53], [40, 60], [49, 10], [49, 13],
    [50, 16], [51, 56], [59, 18], [64, 16], [65, 2], [65, 3], [67, 2], [93, 5], [94, 5], [94, 6]
];

/** The ayah of the day: the same for everyone on a given date. */
export const ayahOfDay = (date: Date): { surah: number; ayah: number } => {
    const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
    const [surah, ayah] = DAILY_AYAHS[day % DAILY_AYAHS.length];
    return { surah, ayah };
};

/** Where the text and its meaning come from (shown under the contents and each surah). */
export const sourceNote = () => `${t('Текст: Мадина мусхафы (Хафс риваяты), Падыша Фахд комплексинин басылышы.')} ${translationLang() === 'en'
    ? t('Мааниси: Saheeh International (QuranEnc.com).')
    : t('Мааниси: Шамсуддин Хакимов, «Руввад» котормо борборунун көзөмөлүндө (QuranEnc.com).')}`;
