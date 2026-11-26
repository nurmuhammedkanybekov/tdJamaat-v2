// The jamaat week runs Thursday → Wednesday. Week dates are
// stored on each week (weeks.start_date / end_date); the admin sets the
// Thursday the season's first week began and every week follows from it.
import { isEnglish } from '../i18n';

const DAY = 86400000;
const pad = (n: number) => String(n).padStart(2, '0');
/** 'YYYY-MM-DD' of a date, by its calendar day (no time zone shifts). */
export const isoDay = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };

/** Start and end of the week `offset` weeks after the anchor Thursday. */
export const weekRange = (anchorThursday: string, offset: number) => {
    const start = new Date(parse(anchorThursday).getTime() + offset * 7 * DAY);
    return { start: isoDay(start), end: isoDay(new Date(start.getTime() + 6 * DAY)) };
};

/** Is this date a Thursday? */
export const isThursday = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && parse(iso).getUTCDay() === 4;

/** The Thursday on or before a day (the start of the jamaat week it falls in). */
export const thursdayOf = (d: Date) => {
    const day = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const back = (new Date(day).getUTCDay() - 4 + 7) % 7;
    return isoDay(new Date(day - back * DAY));
};

const KY_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "20–26 ноябрь" / "27 ноябрь – 3 декабрь" (English: "20–26 Nov"). Empty if unknown. */
export const formatWeekRange = (start: string | null, end: string | null): string => {
    if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return start || end || '';
    const a = parse(start), b = parse(end);
    const months = isEnglish() ? EN_MONTHS : KY_MONTHS;
    const m = (d: Date) => months[d.getUTCMonth()];
    if (a.getUTCMonth() === b.getUTCMonth()) {
        return isEnglish() ? `${a.getUTCDate()}–${b.getUTCDate()} ${m(b)}` : `${a.getUTCDate()}–${b.getUTCDate()} ${m(b)}`;
    }
    return `${a.getUTCDate()} ${m(a)} – ${b.getUTCDate()} ${m(b)}`;
};
