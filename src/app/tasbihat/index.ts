// Тасбихат: what is read after each of the five prayers. The words come from
// the community's «Санарип таспихат» (addua.vercel.app) and are kept exactly
// as they stand there — see README.md in this folder. Each prayer's text
// arrives on demand.
import type { City, PrayerKey } from '../../utils/prayer';
import { prayerTimes } from '../../utils/prayer';

/** 0 = the words read · 1 = a direction (what to do, how many times) · 2 = a heading inside the text · 3 = words the source sets apart */
export type Part = [0 | 1 | 2 | 3, string];
export interface Block {
    t: 'h' | 'p';
    /** heading text */
    v?: string;
    parts?: Part[];
    /** centred */
    c?: 1;
    /** a lead-in line */
    b?: 1;
    /** the meaning, in Kyrgyz */
    m?: string[];
    /** the Arabic, where the source gives it */
    ar?: string[];
}
export interface Tasbihat { id: string; title: string; blocks: Block[] }

export type TasbihatId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const TASBIHAT_ORDER: TasbihatId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const NAARIA = 'naaria';

const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
    fajr: () => import('./fajr.json'),
    dhuhr: () => import('./dhuhr.json'),
    asr: () => import('./asr.json'),
    maghrib: () => import('./maghrib.json'),
    isha: () => import('./isha.json'),
    naaria: () => import('./naaria.json')
};
export const isTasbihat = (id: string | null): id is string => !!id && id in LOADERS;
export const loadTasbihat = async (id: string): Promise<Tasbihat> => (await LOADERS[id]()).default as Tasbihat;

/** The prayer whose time it is now: the latest one that has begun (before
 *  Fajr it is still last night's Isha). */
export const currentPrayer = (city: City, now: Date): TasbihatId => {
    const times = prayerTimes(city, now);
    let current: TasbihatId = 'isha';
    for (const key of TASBIHAT_ORDER) if (times[key as PrayerKey] <= now) current = key;
    return current;
};

/** How many times a direction asks for («(33 жолу)» → 33). Nothing when it
 *  is once, or when it offers a choice («3, 5 же 7 жолу»). */
export const repeatOf = (direction: string): number | null => {
    const m = /(\d+) жолу/.exec(direction);
    if (!m) return null;
    if (/(же|,)\s*$/.test(direction.slice(0, m.index))) return null;
    const n = Number(m[1]);
    return n > 1 ? n : null;
};

export interface Line { parts: Part[]; repeat: number | null }
/** A paragraph as its lines; each line knows how many times it is read. */
export const linesOf = (parts: Part[]): Line[] => {
    const lines: Part[][] = [[]];
    for (const [kind, text] of parts) {
        text.split('\n').forEach((piece, i) => {
            if (i > 0) lines.push([]);
            if (piece) lines[lines.length - 1].push([kind, piece]);
        });
    }
    const out: Line[] = lines.filter(l => l.some(([, v]) => v.trim())).map(l => ({ parts: l, repeat: null }));
    out.forEach((line, i) => {
        const direction = line.parts.filter(([k]) => k === 1).map(([, v]) => v).join(' ');
        const n = repeatOf(direction);
        if (n === null) return;
        // A line that holds only the direction counts for the line above it.
        const target = line.parts.every(([k]) => k === 1) && i > 0 ? out[i - 1] : line;
        target.repeat = n;
    });
    return out;
};
