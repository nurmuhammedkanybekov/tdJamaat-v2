// Language: Kyrgyz (default) or English.
//
// The Kyrgyz text stays in the code as it is; t() looks up its English
// version (src/i18n/en.ts) when English is on, and falls back to Kyrgyz for
// anything without a translation — a label can never come out empty.
// Placeholders: t('{0}-апта', n) → "6-апта" / "Week 6". An English text can
// write {0:ord} for an ordinal (t('{0}-орун', 3) → "3rd place") and
// {0|week|weeks} for a count with its noun (1 week, 3 weeks).
//
// Switching reloads the page once (setLang), so every label — including the
// ones built when the code loads — comes out in the new language. The choice
// is remembered per device.
import { EN } from './en';

export type Lang = 'ky' | 'en';
const KEY = 'tdjamaat-lang';

const read = (): Lang => {
    try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'ky'; } catch { return 'ky'; }
};

let current: Lang = typeof window === 'undefined' ? 'ky' : read();
if (typeof document !== 'undefined') document.documentElement.lang = current === 'en' ? 'en' : 'ky';

export const getLang = (): Lang => current;
export const isEnglish = () => current === 'en';

export const setLang = (lang: Lang) => {
    try { localStorage.setItem(KEY, lang); } catch { /* not critical */ }
    if (lang !== current) window.location.reload();
};

type Arg = string | number | null | undefined;

/** English ordinal suffix: 1 → "st", 2 → "nd", 11 → "th". */
export const ordinalSuffix = (n: number): string => {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) return 'th';
    return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
};

const fill = (s: string, args: Arg[]) =>
    args.length ? s.replace(/\{(\d+)(:ord|\|[^|}]*\|[^|}]*)?\}/g, (m, i, form: string | undefined) => {
        if (+i >= args.length) return m;
        const v = args[+i];
        if (form === ':ord' && typeof v === 'number') return `${v}${ordinalSuffix(v)}`;
        if (form?.startsWith('|')) {
            const [, one, many] = form.split('|');
            return `${v ?? ''} ${Number(v) === 1 ? one : many}`;
        }
        return String(v ?? '');
    }) : s;

export const t = (ky: string, ...args: Arg[]): string =>
    fill(current === 'en' ? EN[ky] ?? ky : ky, args);

/** What follows a big place number: "-орун" in Kyrgyz, "rd" (3rd) in English. */
export const placeSuffix = (n: number): string => (current === 'en' ? ordinalSuffix(n) : '-орун');

/** For tests: switch without reloading. */
export const __setLangForTests = (lang: Lang) => { current = lang; };
