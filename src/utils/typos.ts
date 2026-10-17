// Typo warnings for the data-entry form. One extra zero (2100 → 21000) can
// win a whole week, so a suspicious number asks "are you sure?" before saving.
//
// A number is suspicious only when BOTH are true:
//   - it is at least 10× the plan, and
//   - it is at least 3× what this person usually enters for that metric
//     (median of their recent weeks; skipped when there's no history).
// So someone who really does a lot isn't nagged every week, while a slip of
// the finger — or 10 fasts in a 7-day week — is caught.
import type { MetricValues, MiniCard } from '../types';

export const TYPO_PLAN_FACTOR = 10;
export const TYPO_USUAL_FACTOR = 3;

export interface TypoWarning {
    /** Who or what: a member id, or 'card' for the mini-card. */
    owner: string;
    key: string;
    value: number;
    target: number;
    usual: number | null;
}

const median = (xs: number[]): number | null => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Usual value per metric from earlier weeks (most recent 8, ignoring zeros). */
export const usualValues = (history: MetricValues[]): Partial<Record<keyof MetricValues, number>> => {
    const recent = history.slice(-8);
    const out: Partial<Record<keyof MetricValues, number>> = {};
    if (!recent.length) return out;
    (Object.keys(recent[0]) as Array<keyof MetricValues>).forEach(k => {
        const m = median(recent.map(r => r[k] || 0).filter(v => v > 0));
        if (m !== null) out[k] = m;
    });
    return out;
};

export const isSuspicious = (value: number, target: number, usual: number | null | undefined): boolean => {
    if (value <= 0 || target <= 0) return false;
    if (value < TYPO_PLAN_FACTOR * target) return false;
    if (usual && usual > 0 && value < TYPO_USUAL_FACTOR * usual) return false;
    return true;
};

export const memberTypos = (owner: string, actual: MetricValues, target: MetricValues, usual: Partial<Record<keyof MetricValues, number>>): TypoWarning[] =>
    (Object.keys(actual) as Array<keyof MetricValues>)
        .filter(k => isSuspicious(actual[k] || 0, target[k] || 0, usual[k]))
        .map(k => ({ owner, key: k, value: actual[k], target: target[k], usual: usual[k] ?? null }));

export const miniCardTypos = (card: MiniCard): TypoWarning[] =>
    (Object.keys(card) as Array<keyof MiniCard>)
        .filter(k => isSuspicious(card[k].actual, card[k].target, null))
        .map(k => ({ owner: 'card', key: k, value: card[k].actual, target: card[k].target, usual: null }));
