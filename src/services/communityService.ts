// Announcements to the whole jamaat (admin only) and each house's goal for
// the week (its captain). See supabase/community-2026-11.sql.
import { supabase } from '../lib/supabase';
import { isMissingSchema } from './dataService';

export interface Announcement { id: number; title: string | null; body: string; pinned: boolean; createdAt: string }

/** Pinned first, then the newest (null: the file has not run yet). */
export const fetchAnnouncements = async (limit = 30): Promise<Announcement[] | null> => {
    const { data, error } = await supabase.from('announcements').select('id, title, body, pinned, created_at')
        .order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
    if (error) { if (!isMissingSchema(error)) console.warn('[tdJamaat] announcements:', error.message); return null; }
    return (data ?? []).map(r => ({ id: r.id as number, title: (r.title as string | null) ?? null, body: r.body as string, pinned: !!r.pinned, createdAt: r.created_at as string }));
};
export const postAnnouncement = async (title: string, body: string, pinned: boolean) => {
    const { error } = await supabase.from('announcements').insert({ title: title.trim() || null, body: body.trim(), pinned });
    if (error) throw error;
};
export const setPinned = async (id: number, pinned: boolean) => {
    const { error } = await supabase.from('announcements').update({ pinned }).eq('id', id);
    if (error) throw error;
};
export const deleteAnnouncement = async (id: number) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
};

export interface HouseGoal { body: string; setByRole: string | null; updatedAt: string }
export const fetchGoal = async (houseId: string, week: number): Promise<HouseGoal | null> => {
    const { data, error } = await supabase.from('house_goals').select('body, set_by_role, updated_at').eq('house_id', houseId).eq('week_number', week).maybeSingle();
    if (error || !data) return null;
    return { body: data.body as string, setByRole: (data.set_by_role as string | null) ?? null, updatedAt: data.updated_at as string };
};
export const saveGoal = async (houseId: string, week: number, body: string) => {
    const clean = body.trim();
    const { error } = clean
        ? await supabase.from('house_goals').upsert({ house_id: houseId, week_number: week, body: clean }, { onConflict: 'house_id,week_number' })
        : await supabase.from('house_goals').delete().eq('house_id', houseId).eq('week_number', week);
    if (error) throw error;
};

// What has been read (on this phone).
const SEEN = 'tdjamaat-news-seen-v1';
export const newsSeenAt = () => { try { return localStorage.getItem(SEEN); } catch { return null; } };
export const markNewsSeen = () => { try { localStorage.setItem(SEEN, new Date().toISOString()); } catch { /* not critical */ } };
