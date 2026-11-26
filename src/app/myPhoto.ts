// The signed-in person's own photo, for the menu button and the drawer.
import { useEffect, useState } from 'react';
import type { Self } from './self';

export const PHOTO_KEY = 'tdjamaat-photo-v1';
/** The person's photo, if they set one: read once, kept for the session. */
export const useMyPhoto = (self: Self | null): string | null => {
    const id = self?.memberId ?? null;
    const [url, setUrl] = useState<string | null>(() => {
        try { const c = JSON.parse(sessionStorage.getItem(PHOTO_KEY) ?? 'null'); return c && c.id === id ? c.url : null; } catch { return null; }
    });
    useEffect(() => {
        if (!id) { setUrl(null); return; }
        let alive = true;
        const load = () => import('../lib/supabase').then(({ supabase }) => supabase.from('members').select('photo_url').eq('id', id).maybeSingle())
            .then(({ data }) => {
                if (!alive) return;
                const u = (data as { photo_url?: string | null } | null)?.photo_url ?? null;
                setUrl(u);
                try { sessionStorage.setItem(PHOTO_KEY, JSON.stringify({ id, url: u })); } catch { /* not critical */ }
            }, () => undefined);
        load();
        window.addEventListener('tdjamaat-photo', load);
        return () => { alive = false; window.removeEventListener('tdjamaat-photo', load); };
    }, [id]);
    return url;
};

