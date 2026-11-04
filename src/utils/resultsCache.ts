// The last results this device loaded, so the app opens instantly on them
// and refreshes in the background. Kept per login (a captain never sees what
// another login left behind) and removed on logout: the results are private.
import type { DataFile, House } from '../types';

const KEY = 'tdjamaat-results-v1';
/** Older than this, the copy isn't shown (a fresh load is better than a very old picture). */
export const CACHE_MAX_AGE = 14 * 24 * 3600_000;

export interface CachedResults { who: string; at: number; data: DataFile; houses: House[] }

export const readResults = (who: string, now = Date.now()): CachedResults | null => {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const c = JSON.parse(raw) as CachedResults;
        if (!c || c.who !== who || !c.data?.weeks || now - c.at > CACHE_MAX_AGE) return null;
        return c;
    } catch { return null; }
};

export const writeResults = (who: string, data: DataFile, houses: House[], now = Date.now()) => {
    try { localStorage.setItem(KEY, JSON.stringify({ who, at: now, data, houses })); } catch { /* storage full or blocked: not critical */ }
};

export const clearResults = () => {
    try { localStorage.removeItem(KEY); } catch { /* not critical */ }
};
