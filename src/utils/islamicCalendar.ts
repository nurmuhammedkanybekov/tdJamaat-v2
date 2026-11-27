// The Islamic year as the app shows it: the hijri date of any day (with the
// person's own one-day correction, since the local moon sighting can differ
// from the calculated Umm al-Qura calendar), the days that matter, the days
// on which fasting is sunnah, and the days on which it is not kept.
import { t } from '../i18n';
import { toHijri } from './hijri';
import type { HijriDate } from './hijri';

export type DayKind = 'eid' | 'night' | 'fast' | 'month' | 'day';
export interface HolyDay { key: string; month: number; day: number; name: () => string; kind: DayKind; note?: () => string }

/** The dates of the year, by hijri month and day. A "night" is the night
 *  before that day (it begins at the previous Maghrib). */
export const HOLY_DAYS: HolyDay[] = [
    { key: 'newyear', month: 1, day: 1, name: () => t('Хижрий жаңы жыл'), kind: 'day' },
    { key: 'ashura', month: 1, day: 10, name: () => t('Ашура'), kind: 'fast', note: () => t('Орозо кармоо сүннөт; 9 же 11-күнү менен кошо') },
    { key: 'mawlid', month: 3, day: 12, name: () => t('Мавлид'), kind: 'day', note: () => t('Пайгамбарыбыздын ﷺ туулган күнү') },
    { key: 'miraj', month: 7, day: 27, name: () => t('Мираж түнү'), kind: 'night', note: () => t('26-дан 27-ге караган түнү') },
    { key: 'baraat', month: 8, day: 15, name: () => t('Бараат түнү'), kind: 'night', note: () => t('14-төн 15-ке караган түнү') },
    { key: 'ramadan', month: 9, day: 1, name: () => t('Рамазан башталат'), kind: 'month', note: () => t('Биринчи орозо; таравих мурунку кечте башталат') },
    { key: 'qadr', month: 9, day: 27, name: () => t('Кадыр түнү'), kind: 'night', note: () => t('26-дан 27-ге караган түнү') },
    { key: 'fitr', month: 10, day: 1, name: () => t('Орозо айт'), kind: 'eid' },
    { key: 'arafah', month: 12, day: 9, name: () => t('Арафа күнү'), kind: 'fast', note: () => t('Ажыда болбогондор үчүн орозо сүннөт') },
    { key: 'adha', month: 12, day: 10, name: () => t('Курман айт'), kind: 'eid' }
];

const DAY = 86400000;
export const shift = (d: Date, days: number) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };

/** The hijri date of a day, moved by the person's correction (−1, 0, +1). */
export const hijriOf = (date: Date, offset = 0): HijriDate | null => toHijri(shift(date, offset));

export const holyDaysOf = (h: HijriDate | null) => (h ? HOLY_DAYS.filter(x => x.month === h.month && x.day === h.day) : []);

/** Fasting is not kept on the two Eids and the three days after Kurman ait. */
export const noFast = (h: HijriDate | null) => !!h && ((h.month === 10 && h.day === 1) || (h.month === 12 && h.day >= 10 && h.day <= 13));

/** Why fasting is sunnah on this day, if it is (Ramadan itself is fard). */
export const sunnahFast = (date: Date, h: HijriDate | null): string | null => {
    if (!h || noFast(h) || h.month === 9) return null;
    if (h.month === 12 && h.day === 9) return t('Арафа күнү');
    if (h.month === 1 && (h.day === 9 || h.day === 10 || h.day === 11)) return t('Ашура');
    if (h.month === 10 && h.day >= 2 && h.day <= 7) return t('Шаввалдын алты күнү');
    if (h.day >= 13 && h.day <= 15) return t('Ак күндөр (13, 14, 15)');
    const wd = date.getDay();
    if (wd === 1) return t('Дүйшөмбү');
    if (wd === 4) return t('Бейшемби');
    return null;
};

/** The next dates of the year from today, each with the day it falls on. */
export const upcoming = (from: Date, offset = 0, count = 6) => {
    const out: Array<{ date: Date; day: HolyDay; inDays: number }> = [];
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12);
    for (let i = 0; i < 400 && out.length < count; i++) {
        const d = shift(start, i);
        for (const x of holyDaysOf(hijriOf(d, offset))) out.push({ date: d, day: x, inDays: i });
    }
    return out;
};

/** The Gregorian days of Ramadan in the hijri year that is running (or the next one). */
export const ramadanDays = (from: Date, offset = 0): Date[] => {
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12);
    const h = hijriOf(start, offset);
    // walk back to its first day when inside Ramadan, else forward to it
    let d = start;
    if (h?.month === 9) d = shift(start, -(h.day - 1));
    else for (let i = 0; i < 360; i++) { const x = shift(start, i); if (hijriOf(x, offset)?.month === 9) { d = x; break; } }
    const days: Date[] = [];
    for (let i = 0; i < 31; i++) { const x = shift(d, i); if (hijriOf(x, offset)?.month !== 9) break; days.push(x); }
    return days;
};

export const daysBetween = (a: Date, b: Date) => Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime() - new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()) / DAY);
