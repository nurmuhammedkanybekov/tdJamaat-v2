// Members: sign in with Google, get tied to a member by their Gmail address
// (the captain writes it), and send the app's daily counts so the captain
// can take a week's numbers with one tap. See supabase/members-2026-11.sql.
import { supabase } from '../lib/supabase';
import type { MetricValues } from '../types';
import { t } from '../i18n';
import { isMissingSchema } from './dataService';
import { dayKey, loadZikr } from '../utils/zikr';
import { SALAWAT_IDS, loadPractice } from '../app/practice';

export interface MemberLink { memberId: string; name: string; houseId: string; houseName: string }

const LINK_KEY = 'tdjamaat-member-v1';
export const cachedLink = (): MemberLink | null => { try { return JSON.parse(localStorage.getItem(LINK_KEY) ?? 'null') as MemberLink | null; } catch { return null; } };
const cacheLink = (link: MemberLink | null) => { try { if (link) localStorage.setItem(LINK_KEY, JSON.stringify(link)); else localStorage.removeItem(LINK_KEY); } catch { /* not critical */ } };

/** Why the last Google sign-in failed, in words a member understands (once). */
export const takeAuthError = (): { text: string; detail: string } | null => {
    let detail: string | null = null;
    try { detail = sessionStorage.getItem('tdjamaat-auth-error'); sessionStorage.removeItem('tdjamaat-auth-error'); } catch { /* not critical */ }
    if (!detail) return null;
    const text = /code verifier|flow state|both auth code and code verifier/i.test(detail)
        ? t('Кирүү башка браузерде аяктады. Сайтты Safari же Chrome\'до ачып, ошол жерден кайра «Google менен кирүү» басыңыз (Gmail, Telegram, Instagram ичиндеги браузерден эмес).')
        : /signups? not allowed|signup.*disabled/i.test(detail)
        ? t('Google менен кирүү азырынча жабык: админ Supabase\'те «Allow new users to sign up» күйгүзүшү керек.')
        : /provider is not enabled|unsupported provider/i.test(detail)
            ? t('Google менен кирүү азырынча күйгүзүлө элек (админ үчүн: SETUP.md, 4b).')
            : t('Google менен кирүү ишке ашкан жок.');
    return { text, detail };
};

/** Off to Google; back on the site's start page, signed in. */
export const signInWithGoogle = async (after = '#/today') => {
    try { sessionStorage.setItem('tdjamaat-after-login', after); } catch { /* not critical */ }
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/`, queryParams: { prompt: 'select_account' } }
    });
    if (error) throw error;
};

export interface GoogleUser { email: string; name: string; photo: string | null }

/** Whether this session is a Google account (no captain/admin role), and who. */
export const googleSession = async (): Promise<GoogleUser | null> => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const role = (user.app_metadata as { role?: string } | undefined)?.role;
    if (role) return null;
    const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
    const email = user.email ?? '';
    const photo = meta.avatar_url ?? meta.picture ?? null;
    return { email, name: (meta.full_name ?? meta.name ?? email.split('@')[0]).trim(), photo: photo && /^https:\/\//.test(photo) ? photo : null };
};

/** Ties the signed-in Google account to its member (null: no member has this address). */
export const linkMember = async (): Promise<MemberLink | null> => {
    const { data, error } = await supabase.rpc('link_member_account');
    if (error) {
        if (!isMissingSchema(error)) console.warn('[tdJamaat] member link:', error.message);
        cacheLink(null);
        return null;
    }
    const row = data as { member_id: string; name: string; house_id: string; house_name: string } | null;
    const link = row ? { memberId: row.member_id, name: row.name, houseId: row.house_id, houseName: row.house_name } : null;
    cacheLink(link);
    return link;
};

export const signOutMember = async () => { cacheLink(null); try { localStorage.removeItem('tdjamaat-cloud-v1'); } catch { /* not critical */ } await supabase.auth.signOut(); };

/** The app's counts for the last `days` days, one row per day with anything in it. */
export const practiceRows = (memberId: string, days = 10, now = new Date()) => {
    const zikr = loadZikr(), practice = loadPractice();
    const rows: Array<{ member_id: string; day: string; salawat: number; zikr: number; tasbihat: number; pages: number }> = [];
    for (let i = 0; i < days; i++) {
        const key = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
        let salawat = 0, other = 0;
        for (const [id, n] of Object.entries(zikr.days[key] ?? {})) { if (SALAWAT_IDS.has(id)) salawat += n; else other += n; }
        const tasbihat = Math.min(5, (practice.tasbihat[key] ?? []).length), pages = Math.min(604, (practice.pages[key] ?? []).length);
        if (salawat || other || tasbihat || pages) rows.push({ member_id: memberId, day: key, salawat, zikr: other, tasbihat, pages });
    }
    return rows;
};

/** Sends the last days' counts (idempotent: a day is replaced, never added twice). */
export const syncPractice = async (memberId: string): Promise<boolean> => {
    const rows = practiceRows(memberId);
    if (!rows.length) return true;
    const { error } = await supabase.from('member_practice').upsert(rows, { onConflict: 'member_id,day' });
    if (error) { if (!isMissingSchema(error)) console.warn('[tdJamaat] sync:', error.message); return false; }
    try { localStorage.setItem('tdjamaat-synced-at', new Date().toISOString()); } catch { /* not critical */ }
    return true;
};

// ---------------------------------------------------------------------------
// Captains and the admin
// ---------------------------------------------------------------------------
export interface MemberAccount { memberId: string; email: string; linked: boolean }

/** Addresses written so far (null: members-2026-11.sql has not run). */
export const fetchMemberAccounts = async (): Promise<MemberAccount[] | null> => {
    const { data, error } = await supabase.from('member_accounts').select('member_id, email, user_id');
    if (error) { if (!isMissingSchema(error)) console.warn('[tdJamaat] member accounts:', error.message); return null; }
    return (data ?? []).map(r => ({ memberId: r.member_id as string, email: r.email as string, linked: !!r.user_id }));
};

export const saveMemberAccount = async (memberId: string, email: string) => {
    const clean = email.trim().toLowerCase();
    if (!clean) {
        const { error } = await supabase.from('member_accounts').delete().eq('member_id', memberId);
        if (error) throw error;
        return;
    }
    const { error } = await supabase.from('member_accounts').upsert({ member_id: memberId, email: clean }, { onConflict: 'member_id' });
    if (error) throw error;
};

export interface AppNumbers { salawat: number; zikr: number; tasbihat: number; pages: number; days: number }

/** The captain's form metric each app count goes to. */
export const APP_METRICS: Array<[keyof MetricValues, keyof Omit<AppNumbers, 'days'>]> = [['СВТ', 'salawat'], ['ИСТГ', 'zikr'], ['ТСП', 'tasbihat'], ['К-К', 'pages']];

/** What the app counted for these members between two days (inclusive). */
export const fetchAppNumbers = async (memberIds: string[], start: string, end: string): Promise<Map<string, AppNumbers> | null> => {
    if (!memberIds.length) return new Map();
    const { data, error } = await supabase.from('member_practice')
        .select('member_id, day, salawat, zikr, tasbihat, pages')
        .in('member_id', memberIds).gte('day', start).lte('day', end);
    if (error) { if (!isMissingSchema(error)) console.warn('[tdJamaat] app numbers:', error.message); return null; }
    const out = new Map<string, AppNumbers>();
    for (const r of data ?? []) {
        const id = r.member_id as string;
        const cur = out.get(id) ?? { salawat: 0, zikr: 0, tasbihat: 0, pages: 0, days: 0 };
        out.set(id, { salawat: cur.salawat + (r.salawat as number), zikr: cur.zikr + (r.zikr as number), tasbihat: cur.tasbihat + (r.tasbihat as number), pages: cur.pages + (r.pages as number), days: cur.days + 1 });
    }
    return out;
};
