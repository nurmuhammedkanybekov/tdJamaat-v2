// Full names of the metric codes (from Nur). The codes stay the short labels
// everywhere; the full names explain them (community totals, tooltips).
import type { MetricValues, MiniCard } from '../types';

export const METRIC_NAME: Record<keyof MetricValues, string> = {
    'К-К': 'Курани-Карим окуу',
    'СВТ': 'Салават',
    'КТП': 'Китеп окуу',
    'ТХЖ': 'Тахажжуд намазы',
    'ДТА': 'Орозо',
    'ИСТГ': 'Истигфар, зикир',
    'НФ': 'Нафил намаздар',
    'ТСП': 'Тасбихат'
};

export const CARD_NAME: Record<keyof MiniCard, string> = {
    'БГМДТ': 'Багымдат намазы',
    'КПТ': 'Куптан намазы',
    'И-Н.2': '«Ислам негиздери» китеби',
    'КИТЕП': 'Китеп',
    'СПОРТ': 'Спорт',
    'ТСПХ': 'Тасбихат',
    'БАБХ': '«Бир аят, бир хадис»'
};
