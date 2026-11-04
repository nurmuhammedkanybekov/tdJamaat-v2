// Unsaved typing in the data entry form, kept on the device per house and
// week until it is saved. Phones (iPhone especially) reload a page that was
// in the background, e.g. after checking WhatsApp for someone's numbers;
// without this, everything typed so far would be gone.
//
// Only numbers keyed by member id are stored (no names), and a draft expires
// after a week; expired ones are removed, not just ignored.
import type { MetricValues, MiniCard } from '../types';

export type MemberDraft = { actual: MetricValues; target: MetricValues; excused: boolean };
export type StoredDraft = { drafts: Record<string, MemberDraft>; miniCard: MiniCard; at: number };

export const DRAFT_TTL = 7 * 24 * 3600_000;
const PREFIX = 'tdjamaat-draft:';
const draftKey = (houseId: string, week: number) => `${PREFIX}${houseId}:${week}`;

export const readDraft = (houseId: string, week: number, now = Date.now()): StoredDraft | null => {
    try {
        const raw = localStorage.getItem(draftKey(houseId, week));
        if (!raw) return null;
        const d = JSON.parse(raw) as StoredDraft;
        return d && d.drafts && d.miniCard && now - d.at < DRAFT_TTL ? d : null;
    } catch { return null; }
};

export const writeDraft = (houseId: string, week: number, d: Omit<StoredDraft, 'at'>, now = Date.now()) => {
    try { localStorage.setItem(draftKey(houseId, week), JSON.stringify({ ...d, at: now })); } catch { /* storage full or blocked: not critical */ }
};

export const clearDraft = (houseId: string, week: number) => {
    try { localStorage.removeItem(draftKey(houseId, week)); } catch { /* not critical */ }
};

/** Remove expired or unreadable drafts. Returns how many were removed. */
export const pruneDrafts = (now = Date.now()): number => {
    try {
        const stale: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key?.startsWith(PREFIX)) continue;
            try {
                const d = JSON.parse(localStorage.getItem(key) ?? 'null') as StoredDraft | null;
                if (!d || typeof d.at !== 'number' || now - d.at >= DRAFT_TTL) stale.push(key);
            } catch { stale.push(key); }
        }
        stale.forEach(k => localStorage.removeItem(k));
        return stale.length;
    } catch { return 0; }
};
