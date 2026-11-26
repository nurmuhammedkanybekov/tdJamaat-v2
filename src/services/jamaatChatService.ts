// The jamaat's two shared conversations (supabase/jamaat-chat-2026-11.sql):
// 'all' — everyone (members, captains, CL, the admin); 'staff' — captains, CL
// and the admin. The database fills in who wrote a message; the names travel
// with it, since a member can read only their own house's people.
import { supabase } from '../lib/supabase';
import { isMissingSchema } from './dataService';

export type Room = 'all' | 'staff';

export interface RoomMessage {
    id: number;
    room: Room;
    userId: string;
    authorRole: string;
    memberId: string | null;
    authorName: string | null;
    houseName: string | null;
    body: string;
    createdAt: string;
    /** Accounts that said "Аамин". */
    amins: string[];
}

type Row = { id: number; room: Room; user_id: string; author_role: string; member_id: string | null; author_name: string | null; house_name: string | null; body: string; created_at: string; jamaat_message_amins?: Array<{ user_id: string }> };
const toMessage = (r: Row): RoomMessage => ({
    id: r.id, room: r.room, userId: r.user_id, authorRole: r.author_role, memberId: r.member_id, authorName: r.author_name, houseName: r.house_name,
    body: r.body, createdAt: r.created_at, amins: (r.jamaat_message_amins ?? []).map(a => a.user_id)
});

/** The latest messages, oldest first (null: not set up yet, or no access). */
export const fetchRoom = async (room: Room, limit = 200): Promise<RoomMessage[] | null> => {
    const { data, error } = await supabase.from('jamaat_messages')
        .select('id, room, user_id, author_role, member_id, author_name, house_name, body, created_at, jamaat_message_amins(user_id)')
        .eq('room', room).order('created_at', { ascending: false }).limit(limit);
    if (error) { if (!isMissingSchema(error)) console.warn('[tdJamaat] room:', error.message); return null; }
    return ((data ?? []) as Row[]).map(toMessage).reverse();
};

/** `memberId`: a captain may sign as the person of their house they chose. */
export const sendToRoom = async (room: Room, body: string, memberId: string | null) => {
    const { error } = await supabase.from('jamaat_messages').insert({ room, body, member_id: memberId });
    if (error) throw error;
};

export const deleteRoomMessage = async (id: number) => {
    const { error } = await supabase.from('jamaat_messages').delete().eq('id', id);
    if (error) throw error;
};

export const setRoomAmin = async (messageId: number, userId: string, on: boolean) => {
    const { error } = on
        ? await supabase.from('jamaat_message_amins').insert({ message_id: messageId })
        : await supabase.from('jamaat_message_amins').delete().eq('message_id', messageId).eq('user_id', userId);
    if (error) throw error;
};

/** Calls `onChange` whenever the conversation changes. Returns the way to stop. */
export const watchRoom = (room: Room, onChange: () => void): (() => void) => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
        channel = supabase.channel(`room-${room}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jamaat_messages', filter: `room=eq.${room}` }, onChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jamaat_message_amins' }, onChange)
            .subscribe();
    } catch { channel = null; }
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') onChange(); }, 8000);
    return () => { window.clearInterval(timer); if (channel) supabase.removeChannel(channel).catch(() => undefined); };
};

/** The signed-in account's id (for "mine" and "Аамин"). */
export const myUserId = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
};

// What has not been read yet (kept on this phone).
const SEEN = 'tdjamaat-room-seen-v1';
const seenMap = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(SEEN) ?? '{}'); } catch { return {}; } };
export const markRoomSeen = (room: Room) => {
    try { localStorage.setItem(SEEN, JSON.stringify({ ...seenMap(), [room]: new Date().toISOString() })); } catch { /* not critical */ }
    window.dispatchEvent(new Event('tdjamaat-chat-seen'));
};
export const countRoomUnread = async (room: Room): Promise<number> => {
    const me = await myUserId();
    if (!me) return 0;
    const since = seenMap()[room] ?? new Date(0).toISOString();
    const { count, error } = await supabase.from('jamaat_messages').select('id', { count: 'exact', head: true })
        .eq('room', room).gt('created_at', since).neq('user_id', me);
    return error ? 0 : count ?? 0;
};
