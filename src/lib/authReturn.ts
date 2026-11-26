// Back from Google with ?code=…: exchange it for a session here, so that a
// failure is kept and explained (Менин күнүм and #/kiruu show it), then take
// the code out of the address.
import { supabase } from './supabase';

export const isStandaloneApp = (): boolean => {
    try {
        return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    } catch { return false; }
};

export const finishGoogleReturn = async (): Promise<void> => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code) return;
    url.searchParams.delete('code');
    const clean = `${url.pathname}${url.search}${url.hash}`;
    try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
    } catch (e) {
        const msg = (e as Error)?.message ?? String(e);
        try {
            sessionStorage.setItem('tdjamaat-auth-error', msg);
            const back = JSON.parse(sessionStorage.getItem('tdjamaat-auth-return') ?? 'null') ?? {};
            sessionStorage.setItem('tdjamaat-auth-return', JSON.stringify({ ...back, exchangeError: msg }));
        } catch { /* not critical */ }
    }
    window.history.replaceState(null, '', clean);
};
