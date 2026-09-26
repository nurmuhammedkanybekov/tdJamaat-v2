import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Leaders and the admin never see or type an email — the app builds a fixed,
// non-deliverable email internally just because Supabase Auth requires one.
// What actually gates access is the password + the RLS policies in
// supabase/schema.sql, which check user_metadata on the authenticated session.
const EMAIL_DOMAIN = 'tdjamaat.internal';

export type SessionRole = 'admin' | 'leader';

export interface AuthUser {
    role: SessionRole;
    houseId: string | null;
}

export const signInAsHouse = async (houseSlug: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: `${houseSlug}@${EMAIL_DOMAIN}`,
        password
    });
    if (error) throw error;
    return data;
};

export const signInAsAdmin = async (password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: `admin@${EMAIL_DOMAIN}`,
        password
    });
    if (error) throw error;
    return data;
};

// Call right before any write. getSession() refreshes an expired access
// token when it can; if the session is gone entirely (logged out in
// another tab, refresh token revoked), fail with a clear message instead of
// letting the write bounce off RLS with a cryptic error.
export const requireActiveSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
        throw new Error('Кирүү мөөнөтү бүттү — чыгып, кайра кириңиз.');
    }
    return data.session;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getAuthUserFromSession = (session: Session | null): AuthUser | null => {
    if (!session?.user) return null;
    const meta = session.user.user_metadata as { role?: SessionRole; house_id?: string };
    if (meta?.role !== 'admin' && meta?.role !== 'leader') return null;
    return { role: meta.role, houseId: meta.house_id ?? null };
};

export const getInitialAuthUser = async (): Promise<AuthUser | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return getAuthUserFromSession(data.session);
};

// Returns an unsubscribe function — call it in a useEffect cleanup.
export const subscribeToAuthChanges = (callback: (user: AuthUser | null) => void) => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(getAuthUserFromSession(session));
    });
    return () => data.subscription.unsubscribe();
};
