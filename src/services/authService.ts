import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { t } from '../i18n';

// Leaders and the admin never see or type an email — the app builds a fixed,
// non-deliverable email internally just because Supabase Auth requires one.
// What actually gates access is the password + the RLS policies in
// supabase/private-site-2026-11.sql, which read the role from app_metadata
// (only the server key can set it; user_metadata can be edited by the user
// themselves, so it is never trusted for access).
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
        throw new Error(t('Кирүү мөөнөтү бүттү — чыгып, кайра кириңиз.'));
    }
    return data.session;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

type RoleMeta = { role?: SessionRole; house_id?: string };
const hasRole = (m: RoleMeta | undefined) => m?.role === 'admin' || m?.role === 'leader';

// app_metadata is what the database trusts. Accounts created before it was
// filled in only have user_metadata; the database then lets them see nothing
// until their session is refreshed (see getInitialAuthUser), so using it here
// only decides what the interface shows, never what anyone may read or write.
export const getAuthUserFromSession = (session: Session | null): AuthUser | null => {
    if (!session?.user) return null;
    const app = session.user.app_metadata as RoleMeta | undefined;
    const meta = hasRole(app) ? app! : (session.user.user_metadata as RoleMeta | undefined);
    if (!meta || !hasRole(meta)) return null;
    return { role: meta.role!, houseId: meta.house_id ?? null };
};

export const getInitialAuthUser = async (): Promise<AuthUser | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    let session = data.session;
    // A session from before the role moved to app_metadata: refresh once so
    // the token carries it (otherwise the database shows this captain nothing).
    if (session && !hasRole(session.user.app_metadata as RoleMeta) && hasRole(session.user.user_metadata as RoleMeta)) {
        const refreshed = await supabase.auth.refreshSession();
        if (!refreshed.error && refreshed.data.session) session = refreshed.data.session;
    }
    return getAuthUserFromSession(session);
};

// Returns an unsubscribe function — call it in a useEffect cleanup.
export const subscribeToAuthChanges = (callback: (user: AuthUser | null) => void) => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(getAuthUserFromSession(session));
    });
    return () => data.subscription.unsubscribe();
};
