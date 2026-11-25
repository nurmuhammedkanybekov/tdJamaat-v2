// Where the reader stopped, and the chosen text size — on this device only.
export interface LastRead { surah: number; ayah: number; name: string; page?: number }
const KEY = 'tdjamaat-quran-v1';
export interface Bookmark { surah: number; ayah: number; name: string; at: string }
export type ReadMode = 'mushaf' | 'translation' | 'pages';
interface Store { last?: LastRead; size?: number; mode?: ReadMode; marks?: Bookmark[] }
const read = (): Store => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store; } catch { return {}; } };
const write = (s: Store) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* not critical */ } };
export const loadLastRead = (): LastRead | null => read().last ?? null;
export const saveLastRead = (last: LastRead) => write({ ...read(), last });
export const loadSize = (): number => read().size ?? (window.innerWidth < 640 ? 1.6 : 2);
export const saveSize = (size: number) => write({ ...read(), size });
export const loadMode = (): ReadMode => read().mode ?? 'translation';
export const saveMode = (mode: ReadMode) => write({ ...read(), mode });
export const loadMarks = (): Bookmark[] => read().marks ?? [];
export const isMarked = (surah: number, ayah: number) => loadMarks().some(m => m.surah === surah && m.ayah === ayah);
/** Add or remove a saved ayah (newest first, at most 50). */
export const toggleMark = (mark: Omit<Bookmark, 'at'>): boolean => {
    const marks = loadMarks();
    const had = marks.some(m => m.surah === mark.surah && m.ayah === mark.ayah);
    const next = had ? marks.filter(m => !(m.surah === mark.surah && m.ayah === mark.ayah)) : [{ ...mark, at: new Date().toISOString() }, ...marks].slice(0, 50);
    write({ ...read(), marks: next });
    return !had;
};
/** "2:255", "2 255", "2.255" → a place in the Quran. */
export const parseRef = (text: string): { surah: number; ayah: number | null } | null => {
    const m = /^\s*(\d{1,3})(?:\s*[:.\s]\s*(\d{1,3}))?\s*$/.exec(text);
    if (!m) return null;
    const surah = Number(m[1]);
    if (surah < 1 || surah > 114) return null;
    return { surah, ayah: m[2] ? Number(m[2]) : null };
};

// Search: a surah can be typed in Latin or in Kyrgyz letters, loosely
// («бакара», «baqara», «Al-Baqarah» all find the same one).
const CYR: Record<string, string> = { а: 'a', б: 'b', в: 'w', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ү: 'u', ф: 'f', х: 'h', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh', ы: 'i', э: 'e', ю: 'yu', я: 'ya' };
export const searchKey = (text: string): string =>
    text.toLowerCase()
        .replace(/[а-яёңөү]/g, ch => CYR[ch] ?? '')
        .replace(/[^a-z]/g, '')
        .replace(/kh/g, 'h').replace(/q/g, 'k').replace(/v/g, 'w').replace(/dh/g, 'z').replace(/th/g, 's')
        .replace(/[eo]/g, m => (m === 'e' ? 'i' : 'u'))
        .replace(/(.)\1+/g, '$1')
        .replace(/h$/, '');
