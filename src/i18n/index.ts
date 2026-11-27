// Language: Kyrgyz (default), Russian or English.
//
// The Kyrgyz text stays in the code as it is; t() looks up its English
// version (src/i18n/en.ts) or Russian one (src/i18n/ru.ts) when that
// language is on, and falls back to Kyrgyz for
// anything without a translation — a label can never come out empty.
// Placeholders: t('{0}-апта', n) → "6-апта" / "Week 6". An English text can
// write {0:ord} for an ordinal (t('{0}-орун', 3) → "3rd place") and
// {0|week|weeks} for a count with its noun (1 week, 3 weeks); a Russian text
// {0|неделя|недели|недель} (1 неделя, 3 недели, 5 недель).
//
// Switching reloads the page once (setLang), so every label — including the
// ones built when the code loads — comes out in the new language. The choice
// is remembered per device.
import { EN } from './en';
import { RU } from './ru';

export type Lang = 'ky' | 'en' | 'ru';
export const LANGS: Array<{ id: Lang; short: string; name: string }> = [
    { id: 'ky', short: 'КЫР', name: 'Кыргызча' }, { id: 'ru', short: 'РУС', name: 'Русский' }, { id: 'en', short: 'EN', name: 'English' }
];
const KEY = 'tdjamaat-lang';

const read = (): Lang => {
    try { const v = localStorage.getItem(KEY); return v === 'en' || v === 'ru' ? v : 'ky'; } catch { return 'ky'; }
};

let current: Lang = typeof window === 'undefined' ? 'ky' : read();
if (typeof document !== 'undefined') document.documentElement.lang = current;

export const getLang = (): Lang => current;
export const isEnglish = () => current === 'en';
export const isRussian = () => current === 'ru';
/** The locale for dates written by the browser (null: Kyrgyz, written by hand). */
export const dateLocale = (): string | null => (current === 'en' ? 'en-GB' : current === 'ru' ? 'ru-RU' : null);

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
    args.length ? s.replace(/\{(\d+)(:ord|(?:\|[^|}]*){2,3})?\}/g, (m, i, form: string | undefined) => {
        if (+i >= args.length) return m;
        const v = args[+i];
        if (form === ':ord' && typeof v === 'number') return `${v}${ordinalSuffix(v)}`;
        if (form?.startsWith('|')) {
            const forms = form.split('|').slice(1);
            const n = Math.abs(Number(v));
            if (forms.length === 3) {
                // Russian: 1 день, 2–4 дня, 5–20 дней, 21 день…
                const d = n % 10, h = n % 100;
                return `${v ?? ''} ${d === 1 && h !== 11 ? forms[0] : d >= 2 && d <= 4 && (h < 12 || h > 14) ? forms[1] : forms[2]}`;
            }
            return `${v ?? ''} ${n === 1 ? forms[0] : forms[1]}`;
        }
        return String(v ?? '');
    }) : s;

export const t = (ky: string, ...args: Arg[]): string =>
    fill(current === 'en' ? EN[ky] ?? ky : current === 'ru' ? RU[ky] ?? ky : ky, args);

/** What follows a big place number: "-орун" in Kyrgyz, "rd" (3rd) in English. */
export const placeSuffix = (n: number): string => (current === 'en' ? ordinalSuffix(n) : current === 'ru' ? '-е место' : '-орун');

/** For tests: switch without reloading. */
export const __setLangForTests = (lang: Lang) => { current = lang; };
