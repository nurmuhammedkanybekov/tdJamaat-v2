// Whoever signed in with Google, if anyone: a member of the jamaat (linked:
// a captain wrote their address) or a personal account (unlinked). Either
// way the app's own data is saved with the account (cloudStore); while
// linked, the counts also go to the captain.
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { GoogleUser, MemberLink } from '../services/memberService';
import { cachedLink, googleSession, linkMember, syncPractice } from '../services/memberService';
import { syncCloud } from '../services/cloudStore';
import { LOCAL_EVENT } from '../utils/localEvent';

export type MemberState =
    | { status: 'none' }
    | { status: 'checking' }
    | { status: 'linked'; link: MemberLink }
    | ({ status: 'unlinked' } & GoogleUser);

export const useMember = (): MemberState => {
    const [state, setState] = useState<MemberState>(() => { const c = cachedLink(); return c ? { status: 'linked', link: c } : { status: 'checking' }; });
    useEffect(() => {
        let alive = true;
        const check = async () => {
            const g = await googleSession().catch(() => null);
            if (!alive) return;
            if (!g) { setState({ status: 'none' }); return; }
            const link = await linkMember().catch(() => null);
            if (!alive) return;
            setState(link ? { status: 'linked', link } : { status: 'unlinked', ...g });
            // The ?code=… of the Google return has done its job.
            if (new URLSearchParams(window.location.search).has('code')) window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
        };
        check();
        const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') check(); });
        return () => { alive = false; data.subscription.unsubscribe(); };
    }, []);

    usePracticeSync(state.status === 'linked' ? state.link.memberId : null);
    useCloudSync(state.status === 'linked' || state.status === 'unlinked');
    return state;
};

/** Keep the personal account's copy current: at once, a little after each
 *  change, when the app comes back (another device may have saved), and
 *  when it is put away. */
export const useCloudSync = (on: boolean) => {
    const timer = useRef(0);
    useEffect(() => {
        if (!on) return;
        const now = () => { window.clearTimeout(timer.current); syncCloud().catch(() => undefined); };
        const soon = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(now, 8000); };
        const onShow = () => now();
        now();
        window.addEventListener(LOCAL_EVENT, soon);
        document.addEventListener('visibilitychange', onShow);
        return () => { window.clearTimeout(timer.current); window.removeEventListener(LOCAL_EVENT, soon); document.removeEventListener('visibilitychange', onShow); };
    }, [on]);
};

/** Send this person's app counts: now, a little after each change, and when the app is put away. */
export const usePracticeSync = (memberId: string | null) => {
    const timer = useRef(0);
    useEffect(() => {
        if (!memberId) return;
        const send = () => { window.clearTimeout(timer.current); syncPractice(memberId).catch(() => undefined); };
        const soon = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(send, 15000); };
        const onHide = () => { if (document.visibilityState === 'hidden') send(); };
        send();
        window.addEventListener('tdjamaat-practice', soon);
        document.addEventListener('visibilitychange', onHide);
        return () => { window.clearTimeout(timer.current); window.removeEventListener('tdjamaat-practice', soon); document.removeEventListener('visibilitychange', onHide); };
    }, [memberId]);
};
