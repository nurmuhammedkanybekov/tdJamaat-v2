// Member photos are private: the stored photo_url (kept in its original
// "public URL" form, so older versions of the site keep working) is turned
// into a signed link that only a logged-in captain or the admin can obtain
// (storage policy in supabase/private-photos-2026-11.sql). Links are reused
// for half their lifetime, so the live refresh doesn't re-download images.
import { supabase } from '../lib/supabase';

export const PHOTO_BUCKET = 'member-photos';
const LIFETIME = 24 * 3600;            // seconds a signed link is valid
const REUSE_FOR = 12 * 3600_000;       // ms we keep handing out the same link

// Kept in localStorage too: the same signed link on the next visit means the
// browser shows the photo from its own cache at once instead of downloading it.
const STORE = 'tdjamaat-photo-links-v1';
const cache = new Map<string, { url: string; until: number }>((() => {
    try { const raw = JSON.parse(localStorage.getItem(STORE) ?? '[]') as Array<[string, { url: string; until: number }]>; return raw.filter(([, v]) => v.until > Date.now()); } catch { return []; }
})());
const persist = () => { try { localStorage.setItem(STORE, JSON.stringify([...cache].slice(-400))); } catch { /* not critical */ } };

/** "<house>/<member>.<ext>" from a stored photo URL (null if it isn't one of ours). */
export const photoPath = (stored: string): string | null => {
    const marker = `/${PHOTO_BUCKET}/`;
    const i = stored.indexOf(marker);
    if (i < 0) return null;
    const path = stored.slice(i + marker.length).split('?')[0];
    return path ? decodeURIComponent(path) : null;
};

/** Stored URLs → links the browser can load. Unknown URLs and failures fall
 *  back to the stored URL (a missing photo shows the person's initial). */
export const signPhotoUrls = async (stored: Array<string | null>, now = Date.now()): Promise<Array<string | null>> => {
    const need = new Map<string, string>(); // stored → path
    for (const s of stored) {
        if (!s || need.has(s)) continue;
        const hit = cache.get(s);
        if (hit && hit.until > now) continue;
        const path = photoPath(s);
        if (path) need.set(s, path);
    }
    if (need.size > 0) {
        try {
            const paths = [...new Set(need.values())];
            const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, LIFETIME);
            const byPath = new Map((data ?? []).filter(d => d.signedUrl && d.path).map(d => [d.path as string, d.signedUrl]));
            for (const [s, path] of need) {
                const url = byPath.get(path);
                if (url) cache.set(s, { url, until: now + REUSE_FOR });
            }
            persist();
        } catch { /* offline or not allowed: fall back below */ }
    }
    return stored.map(s => (s ? cache.get(s)?.url ?? s : null));
};

/** For tests. */
export const __clearPhotoCache = () => { cache.clear(); try { localStorage.removeItem(STORE); } catch { /* none */ } };
