// The member signed in with Google, if any: who they are (linked), or that
// no captain has written their address yet (unlinked). While linked, the
// app's counts are sent now and then, so the captain sees them.
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { MemberLink } from '../services/memberService';
import { cachedLink, googleSession, linkMember, syncPractice } from '../services/memberService';

export type MemberState =
    | { status: 'none' }
    | { status: 'checking' }
    | { status: 'linked'; link: MemberLink }
    | { status: 'unlinked'; email: string };

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
            setState(link ? { status: 'linked', link } : { status: 'unlinked', email: g.email });
            // The ?code=… of the Google return has done its job.
            if (new URLSearchParams(window.location.search).has('code')) window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
        };
        check();
        const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') check(); });
        return () => { alive = false; data.subscription.unsubscribe(); };
    }, []);

    usePracticeSync(state.status === 'linked' ? state.link.memberId : null);
    return state;
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
