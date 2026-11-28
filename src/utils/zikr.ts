// The zikr counter: what can be counted, and the counts kept on this device.
// Nothing here is sent anywhere — it is a personal helper, separate from the
// houses' results.
import { getLang, t } from '../i18n';
import { localChanged } from './localEvent';

export interface Zikr {
    id: string;
    arabic: string;
    /** How it is read, in Kyrgyz letters. */
    reading: string;
    meaning: string;
    /** The usual number of repetitions (0 = no limit). */
    target: number;
    /** Why it is said: a short retelling of a hadith (never a quotation). */
    virtue?: string;
    /** Where that hadith is found. */
    source?: string;
}

// The virtues are retold briefly from well-known authentic hadiths; the
// references let anyone look them up (sunnah.com).
const V: Record<string, { virtue: string; source: string }> = {
    subhanallah: { virtue: t('Күнүнө жүз жолу тасбих айткан адамга миң сооп жазылат же миң күнөөсү өчүрүлөт.'), source: t('Муслим, 2698') },
    alhamdulillah: { virtue: t('«Алхамдулиллах» таразаны толтурат; «Субханаллах» менен «Алхамдулиллах» асман менен жердин ортосун толтурат.'), source: t('Муслим, 223') },
    allahuakbar: { virtue: t('Ар бир намаздан кийин 33 тасбих, 33 тахмид, 33 такбир айтып, жүзүнчүсүн тахлил менен бүтүргөндүн күнөөлөрү деңиздин көбүгүндөй болсо да кечирилет.'), source: t('Муслим, 597') },
    tahlil: { virtue: t('Зикирдин эң жакшысы — «Лаа илааха иллаллах».'), source: t('Тирмизи, 3383') },
    istighfar: { virtue: t('Пайгамбарыбыз (с.а.в.) күнүнө жүз жолу Аллахка тообо кылып, кечирим сураар эле.'), source: t('Муслим, 2702') },
    salawat: { virtue: t('Пайгамбарга (с.а.в.) бир жолу салават айткан адамга Аллах он жолу ырайым кылат.'), source: t('Муслим, 408') },
    bihamdihi: { virtue: t('Күнүнө жүз жолу айткан адамдын күнөөлөрү деңиздин көбүгүндөй болсо да кечирилет.'), source: t('Бухари, 6405; Муслим, 2691') },
    azim: { virtue: t('Тилге жеңил, таразада оор, Рахманга сүйүктүү эки сөз: «Субханаллахи ва бихамдихи, субханаллахил-ъазим».'), source: t('Бухари, 6406; Муслим, 2694') },
    hawqala: { virtue: t('Бейиштин казыналарынын бири.'), source: t('Бухари, 4205; Муслим, 2704') },
    hasbunallah: { virtue: t('Ибрахим (а.с.) отко ыргытылганда жана Пайгамбарыбыз (с.а.в.) коркутулганда ушул сөздү айтышкан.'), source: t('Бухари, 4563') }
};


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

for (const z of ZIKRS) Object.assign(z, V[z.id]);

// How each is spelled for readers of Russian and English (the usual
// spellings of these phrases; the Arabic above is the text itself).
const READING: Record<string, { ru: string; en: string }> = {
    subhanallah: { ru: 'Субханаллах', en: 'Subhanallah' },
    alhamdulillah: { ru: 'Альхамдулиллях', en: 'Alhamdulillah' },
    allahuakbar: { ru: 'Аллаху акбар', en: 'Allahu akbar' },
    tahlil: { ru: 'Ля иляха илляллах', en: 'La ilaha illallah' },
    istighfar: { ru: 'Астагфируллах', en: 'Astaghfirullah' },
    salawat: { ru: 'Аллахумма салли аля Мухаммадин ва аля али Мухаммад', en: 'Allahumma salli ala Muhammadin wa ala ali Muhammad' },
    bihamdihi: { ru: 'Субханаллахи ва бихамдихи', en: 'Subhanallahi wa bihamdihi' },
    azim: { ru: 'Субханаллахиль-азым', en: 'Subhanallahil-azim' },
    hawqala: { ru: 'Ля хауля ва ля куввата илля биллях', en: 'La hawla wa la quwwata illa billah' },
    hasbunallah: { ru: 'Хасбуналлаху ва ни‘маль-вакиль', en: 'Hasbunallahu wa ni‘mal-wakil' }
};
{
    const lang = getLang();
    if (lang !== 'ky') for (const z of ZIKRS) z.reading = READING[z.id]?.[lang] ?? z.reading;
}

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
    /** Zikrs marked as favourites, shown first. */
    favs?: string[];
    /** The person's own zikrs. */
    custom?: CustomZikr[];
    /** How many zikrs a jamaat week (Thursday → Wednesday) should hold; 0 or none: no goal. (Older; the plan below replaces it.) */
    weekGoal?: number;
    /** The weekly plan: zikr id → how many times in a jamaat week (Thursday → Wednesday). */
    weekPlan?: Record<string, number>;
}

/** A zikr the person adds: how it is read (Kyrgyz letters) and its English
 *  are required; the Arabic is optional and only ever what they typed. */
export interface CustomZikr { id: string; reading: string; english: string; meaning?: string; arabic?: string; target: number }

const KEY = 'tdjamaat-zikr-v1';
const KEEP_DAYS = 400;
export const emptyStore = (): ZikrStore => ({ days: {}, current: {}, targets: {} });

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const loadZikr = (): ZikrStore => {
    try {
        const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<ZikrStore> | null;
        return { days: s?.days ?? {}, current: s?.current ?? {}, targets: s?.targets ?? {}, favs: s?.favs ?? [], custom: s?.custom ?? [], weekGoal: s?.weekGoal ?? 0, weekPlan: s?.weekPlan ?? {} };
    } catch { return emptyStore(); }
};
export const saveZikr = (s: ZikrStore) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked: counts live for this visit only */ } localChanged(); };

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

// ---------------------------------------------------------------------------
// Favourites, own zikrs, the weekly goal.
// ---------------------------------------------------------------------------
export const isFav = (s: ZikrStore, id: string) => (s.favs ?? []).includes(id);
export const toggleFav = (s: ZikrStore, id: string): ZikrStore => ({ ...s, favs: isFav(s, id) ? (s.favs ?? []).filter(x => x !== id) : [...(s.favs ?? []), id] });

/** An own zikr shaped like the built-in ones (in English, its English). */
export const asZikr = (c: CustomZikr, english: boolean): Zikr => ({
    id: c.id, arabic: c.arabic ?? '', reading: english ? c.english : c.reading,
    meaning: english ? (c.meaning ? c.english : '') : (c.meaning ?? c.english), target: c.target
});

export const addCustom = (s: ZikrStore, c: Omit<CustomZikr, 'id'>): ZikrStore => {
    const clean = (v?: string, n = 160) => (v ?? '').trim().slice(0, n);
    const z: CustomZikr = { id: `c-${Date.now().toString(36)}`, reading: clean(c.reading), english: clean(c.english), meaning: clean(c.meaning, 240) || undefined, arabic: clean(c.arabic, 240) || undefined, target: Math.max(0, Math.min(100000, Math.round(c.target) || 0)) };
    if (!z.reading || !z.english) return s;
    return { ...s, custom: [...(s.custom ?? []), z], favs: [...(s.favs ?? []), z.id] };
};
export const removeCustom = (s: ZikrStore, id: string): ZikrStore => ({ ...s, custom: (s.custom ?? []).filter(c => c.id !== id), favs: (s.favs ?? []).filter(x => x !== id) });

/** Every zikr this person can count: the built-in ones, then their own. */
export const allZikrs = (s: ZikrStore, english: boolean): Zikr[] => [...ZIKRS, ...(s.custom ?? []).map(c => asZikr(c, english))];

/** The jamaat week's total (Thursday → today). */
export const weekTotal = (s: ZikrStore, now = new Date()) => {
    const back = (now.getDay() + 3) % 7;
    let n = 0;
    for (let i = 0; i <= back; i++) n += Object.values(s.days[dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))] ?? {}).reduce((a, b) => a + b, 0);
    return n;
};

// ---------------------------------------------------------------------------
// The weekly plan, per zikr.
// ---------------------------------------------------------------------------
/** The days of this jamaat week so far: Thursday … today. */
const weekDays = (now = new Date()) => {
    const back = (now.getDay() + 3) % 7;
    return Array.from({ length: back + 1 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - back + i));
};

/** How many of one zikr this jamaat week. */
export const weekCount = (s: ZikrStore, id: string, now = new Date()) => weekDays(now).reduce((n, d) => n + (s.days[dayKey(d)]?.[id] ?? 0), 0);

export interface PlanRow { id: string; target: number; done: number; today: number; /** to say today to stay on pace (0: on pace or done) */ todayPace: number; daysLeft: number }

/** Each planned zikr: how far this week, and today's share of what is left. */
export const planRows = (s: ZikrStore, now = new Date()): PlanRow[] => {
    const daysLeft = 7 - ((now.getDay() + 3) % 7); // today included
    return Object.entries(s.weekPlan ?? {}).filter(([, n]) => n > 0).map(([id, target]) => {
        const done = weekCount(s, id, now), today = todayOf(s, id, now);
        const beforeToday = done - today;
        const share = Math.ceil(Math.max(0, target - beforeToday) / Math.max(1, daysLeft));
        return { id, target, done, today, todayPace: Math.max(0, share - today), daysLeft };
    });
};

export const setPlan = (s: ZikrStore, id: string, n: number): ZikrStore => {
    const weekPlan = { ...(s.weekPlan ?? {}) };
    const v = Math.max(0, Math.min(1000000, Math.round(n) || 0));
    if (v) weekPlan[id] = v; else delete weekPlan[id];
    return { ...s, weekPlan };
};
