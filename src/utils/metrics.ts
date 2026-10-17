// Metric codes and their full names (from Nur). The stored keys stay the
// Kyrgyz codes (database, formulas); these are only what people see.
// In English mode the codes get English short labels as well.
import type { MetricValues, MiniCard } from '../types';
import { isEnglish } from '../i18n';

const METRIC_KY: Record<keyof MetricValues, string> = {
    'К-К': 'Курани-Карим окуу',
    'СВТ': 'Салават',
    'КТП': 'Китеп окуу',
    'ТХЖ': 'Тахажжуд намазы',
    'ДТА': 'Орозо',
    'ИСТГ': 'Истигфар, зикир',
    'НФ': 'Нафил намаздар',
    'ТСП': 'Тасбихат'
};

const METRIC_EN: Record<keyof MetricValues, { code: string; name: string }> = {
    'К-К': { code: 'QUR', name: 'Quran reading' },
    'СВТ': { code: 'SLW', name: 'Salawat' },
    'КТП': { code: 'BOOK', name: 'Book reading' },
    'ТХЖ': { code: 'THJ', name: 'Tahajjud prayer' },
    'ДТА': { code: 'FAST', name: 'Fasting' },
    'ИСТГ': { code: 'ISTG', name: 'Istighfar & dhikr' },
    'НФ': { code: 'NFL', name: 'Nafl prayers' },
    'ТСП': { code: 'TSB', name: 'Tasbihat' }
};

const CARD_KY: Record<keyof MiniCard, string> = {
    'БГМДТ': 'Багымдат намазы',
    'КПТ': 'Куптан намазы',
    'И-Н.2': '«Ислам негиздери» китеби',
    'КИТЕП': 'Китеп',
    'СПОРТ': 'Спорт',
    'ТСПХ': 'Тасбихат',
    'БАБХ': '«Бир аят, бир хадис»'
};

const CARD_EN: Record<keyof MiniCard, { code: string; name: string }> = {
    'БГМДТ': { code: 'FAJR', name: 'Fajr prayer' },
    'КПТ': { code: 'ISHA', name: 'Isha prayer' },
    'И-Н.2': { code: 'IN-2', name: '"Islam Negizderi" book' },
    'КИТЕП': { code: 'BOOK', name: 'Book' },
    'СПОРТ': { code: 'SPORT', name: 'Sport' },
    'ТСПХ': { code: 'TSB', name: 'Tasbihat' },
    'БАБХ': { code: '1A1H', name: '"One Ayah, One Hadith"' }
};

/** Short label of a metric code (К-К, or QUR in English). */
export const metricLabel = (k: keyof MetricValues): string => (isEnglish() ? METRIC_EN[k]?.code ?? k : k);
/** Full name of a metric (Курани-Карим окуу / Quran reading). */
export const metricName = (k: keyof MetricValues): string => (isEnglish() ? METRIC_EN[k]?.name : METRIC_KY[k]) ?? k;
/** Short label of a mini-card activity (БГМДТ, or FAJR in English). */
export const cardLabel = (k: keyof MiniCard): string => (isEnglish() ? CARD_EN[k]?.code ?? k : k);
/** Full name of a mini-card activity. */
export const cardName = (k: keyof MiniCard): string => (isEnglish() ? CARD_EN[k]?.name : CARD_KY[k]) ?? k;
