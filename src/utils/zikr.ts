// The zikr counter: what can be counted, and the counts kept on this device.
// Nothing here is sent anywhere — it is a personal helper, separate from the
// houses' results.
import { t } from '../i18n';

export interface Zikr {
    id: string;
    arabic: string;
    /** How it is read, in Kyrgyz letters. */
    reading: string;
    meaning: string;
    /** The usual number of repetitions (0 = no limit). */
    target: number;
}

export const ZIKRS: Zikr[] = [
    { id: 'subhanallah', arabic: 'سُبْحَانَ ٱللَّٰهِ', reading: 'Субханаллах', meaning: t('Аллах бардык кемчиликтен аруу'), target: 33 },
    { id: 'alhamdulillah', arabic: 'ٱلْحَمْدُ لِلَّٰهِ', reading: 'Алхамдулиллах', meaning: t('Бардык мактоо Аллахка'), target: 33 },
    { id: 'allahuakbar', arabic: 'ٱللَّٰهُ أَكْبَرُ', reading: 'Аллаху акбар', meaning: t('Аллах улук'), target: 34 },
    { id: 'tahlil', arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ', reading: 'Лаа илааха иллаллах', meaning: t('Аллахтан башка кудай жок'), target: 100 },
    { id: 'istighfar', arabic: 'أَسْتَغْفِرُ ٱللَّٰهَ', reading: 'Астагфируллах', meaning: t('Аллахтан кечирим сураймын'), target: 100 },
    { id: 'salawat', arabic: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ', reading: 'Аллахумма солли ъалаа Мухаммадин ва ъалаа аали Мухаммад', meaning: t('Салават: Мухаммадга жана анын үй-бүлөсүнө салават'), target: 100 },
    { id: 'bihamdihi', arabic: 'سُبْحَانَ ٱللَّٰهِ وَبِحَمْدِهِ', reading: 'Субханаллахи ва бихамдихи', meaning: t('Аллах аруу, Ага мактоо'), target: 100 },
    { id: 'azim', arabic: 'سُبْحَانَ ٱللَّٰهِ ٱلْعَظِيمِ', reading: 'Субханаллахил-ъазим', meaning: t('Улуу Аллах аруу'), target: 100 },
    { id: 'hawqala', arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّٰهِ', reading: 'Лаа хавла ва лаа куввата иллаа биллах', meaning: t('Күч-кубат Аллахтан гана'), target: 100 },
    { id: 'hasbunallah', arabic: 'حَسْبُنَا ٱللَّٰهُ وَنِعْمَ ٱلْوَكِيلُ', reading: 'Хасбуналлаху ва ниъмал-вакил', meaning: t('Бизге Аллах жетиштүү, Ал кандай жакшы коргоочу'), target: 100 }
];

/** After-prayer tasbih: 33 + 33 + 34. */
export const AFTER_PRAYER: Array<{ id: string; count: number }> = [
    { id: 'subhanallah', count: 33 }, { id: 'alhamdulillah', count: 33 }, { id: 'allahuakbar', count: 34 }
];

// ---------------------------------------------------------------------------
// Counts on the device: per day, per zikr.
// ---------------------------------------------------------------------------
export interface ZikrStore {
    /** "2026-11-12" → zikr id → count */
    days: Record<string, Record<string, number>>;
    /** The count on the counter right now, per zikr (survives closing the page). */
    current: Record<string, number>;
    /** Chosen target per zikr (overrides the default). */
    targets: Record<string, number>;
}

const KEY = 'tdjamaat-zikr-v1';
const KEEP_DAYS = 400;
export const emptyStore = (): ZikrStore => ({ days: {}, current: {}, targets: {} });

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const loadZikr = (): ZikrStore => {
    try {
        const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<ZikrStore> | null;
        return { days: s?.days ?? {}, current: s?.current ?? {}, targets: s?.targets ?? {} };
    } catch { return emptyStore(); }
};
export const saveZikr = (s: ZikrStore) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked: counts live for this visit only */ } };

/** Add `by` (may be negative: undo) to a zikr today. Never goes below zero.
 *  `slot` is the running counter it belongs to: the zikr's own, or one of the
 *  after-prayer set's (so that set never disturbs a count in progress). */
export const addCount = (s: ZikrStore, id: string, by: number, now = new Date(), slot = id): ZikrStore => {
    const key = dayKey(now);
    const cur = s.current[slot] ?? 0, today = s.days[key]?.[id] ?? 0;
    const step = by < 0 ? -Math.min(-by, cur, today) : by;
    if (step === 0) return s;
    const days = { ...s.days, [key]: { ...s.days[key], [id]: today + step } };
    // old days are dropped so the store never grows without end
    const keys = Object.keys(days).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete days[k];
    return { ...s, days, current: { ...s.current, [slot]: cur + step } };
};

/** Start the counter again (what was counted today stays counted). */
export const resetCurrent = (s: ZikrStore, id: string): ZikrStore => ({ ...s, current: { ...s.current, [id]: 0 } });
export const setTarget = (s: ZikrStore, id: string, target: number): ZikrStore => ({ ...s, targets: { ...s.targets, [id]: Math.max(0, Math.round(target)) } });
export const targetOf = (s: ZikrStore, z: Zikr) => s.targets[z.id] ?? z.target;

export const todayTotal = (s: ZikrStore, now = new Date()) => Object.values(s.days[dayKey(now)] ?? {}).reduce((a, b) => a + b, 0);
export const todayOf = (s: ZikrStore, id: string, now = new Date()) => s.days[dayKey(now)]?.[id] ?? 0;
export const allTime = (s: ZikrStore, id?: string) => Object.values(s.days).reduce((a, d) => a + (id ? d[id] ?? 0 : Object.values(d).reduce((x, y) => x + y, 0)), 0);

/** The last `n` days, oldest first, with each day's total. */
export const lastDays = (s: ZikrStore, n: number, now = new Date()): Array<{ key: string; date: Date; total: number }> =>
    Array.from({ length: n }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i));
        const key = dayKey(date);
        return { key, date, total: Object.values(s.days[key] ?? {}).reduce((a, b) => a + b, 0) };
    });

/** Days in a row with at least one zikr, ending today (or yesterday, if today is still empty). */
export const streak = (s: ZikrStore, now = new Date()): number => {
    let n = 0;
    for (let i = 0; i < KEEP_DAYS; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const total = Object.values(s.days[dayKey(d)] ?? {}).reduce((a, b) => a + b, 0);
        if (total > 0) n++;
        else if (i > 0) break;
    }
    return n;
};
