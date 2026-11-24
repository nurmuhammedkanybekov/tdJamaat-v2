// Тазалык (cleanliness): a house-level part of the rating, agreed with the
// captains (Nov 2026). Each item of a short checklist (kitchen, bathroom, …)
// is rated 0–5; the house gets up to TAZALYK_MAX points:
//
//     points = (sum of the item ratings ÷ (5 × number of items)) × 25
//
// With the default five items the sum IS the points (5 × 5 = 25). The admin
// decides which weeks it counts in (weeks.tazalyk), so adding it a week late,
// or skipping a week, never makes the houses incomparable within a week.
//
// Who rates: the inspector (a login of its own), the house's captain, or the
// admin — whoever saved last is shown next to the score.

export const TAZALYK_MAX = 25;
export const ITEM_MAX = 5;

export const DEFAULT_TAZALYK_ITEMS = ['Ашкана', 'Ажаткана жана ванна', 'Бөлмөлөр', 'Коридор жана кире бериш', 'Жалпы тартип'];

export type TazalykScores = Record<string, number>;

export interface TazalykEntry {
    scores: TazalykScores;
    /** 0 … TAZALYK_MAX, one decimal. */
    total: number;
    note: string | null;
    /** Who saved it last: 'inspector' | 'leader' | 'admin' (null if unknown). */
    by: string | null;
}

const clamp = (n: number) => Math.min(Math.max(Number.isFinite(n) ? n : 0, 0), ITEM_MAX);

/** The house's points from its item ratings. Items not rated count as 0;
 *  ratings for items no longer on the list are ignored. */
export const tazalykPoints = (scores: TazalykScores, items: string[]): number => {
    if (items.length === 0) return 0;
    const sum = items.reduce((s, item) => s + clamp(Number(scores[item] ?? 0)), 0);
    return Math.round((sum / (ITEM_MAX * items.length)) * TAZALYK_MAX * 10) / 10;
};

/** A stored scores object made safe: only known items, each 0–5, whole numbers. */
export const normalizeScores = (value: unknown, items: string[]): TazalykScores => {
    const src = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    const out: TazalykScores = {};
    for (const item of items) {
        const n = Number(src[item]);
        if (src[item] !== undefined && src[item] !== null && Number.isFinite(n)) out[item] = Math.round(clamp(n));
    }
    return out;
};

/** Every item rated? (Only then is the score shown as final.) */
export const isComplete = (scores: TazalykScores, items: string[]) => items.every(i => scores[i] !== undefined);
