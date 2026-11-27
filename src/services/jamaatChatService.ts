// The jamaat's shared conversations (supabase/jamaat-chat-2026-11.sql):
// 'all' — everyone (members, captains, CL, the admin); 'staff' — captains, CL
// and the admin; and any the admin opens, for one of those two audiences. The database fills in who wrote a message; the names travel
// with it, since a member can read only their own house's people.
import { supabase } from '../lib/supabase';
import { isMissingSchema } from './dataService';
import { selectWithReactions, setReaction, toReactions, type Reaction } from './reactions';

/** A conversation's id: 'all', 'staff', or one the admin opened. */
export type Room = string;
export type Audience = 'all' | 'staff';
export interface ChatRoom { id: string; name: string; about: string | null; audience: Audience; sort: number }

/** The first two, as they are before the admin changes anything. */
export const DEFAULT_ROOMS: ChatRoom[] = [
    { id: 'all', name: 'Жамааттын сөзү', about: 'Бүт жамаат: мүчөлөр, капитандар, CL жана админ.', audience: 'all', sort: 0 },
    { id: 'staff', name: 'Капитандар', about: 'Капитандар, CL жана админ гана көрөт.', audience: 'staff', sort: 1 }
];

/** The conversations this account may see (the database decides), in order.
 *  Without chat_rooms (an older database) the first two, by role. */
export const fetchRooms = async (staff: boolean): Promise<ChatRoom[]> => {
    const { data, error } = await supabase.from('chat_rooms').select('id, name, about, audience, sort').order('sort').order('created_at');
    if (error) return DEFAULT_ROOMS.filter(r => staff || r.audience === 'all');
    return (data ?? []) as ChatRoom[];
};
export const createRoom = async (room: { name: string; about: string | null; audience: Audience }) => {
    const { error } = await supabase.from('chat_rooms').insert({ ...room, sort: 100 });
    if (error) throw error;
};
export const updateRoom = async (id: string, patch: { name: string; about: string | null; audience: Audience }) => {
    const { error } = await supabase.from('chat_rooms').update(patch).eq('id', id);
    if (error) throw error;
};
export const deleteRoom = async (id: string) => {
    const { error } = await supabase.from('chat_rooms').delete().eq('id', id);
    if (error) throw error;
};

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
    reactions: Reaction[];
}

type Row = { id: number; room: Room; user_id: string; author_role: string; member_id: string | null; author_name: string | null; house_name: string | null; body: string; created_at: string; jamaat_message_amins?: Array<{ user_id: string; emoji?: string }> };
const toMessage = (r: Row): RoomMessage => ({
    id: r.id, room: r.room, userId: r.user_id, authorRole: r.author_role, memberId: r.member_id, authorName: r.author_name, houseName: r.house_name,
    body: r.body, createdAt: r.created_at, reactions: toReactions(r.jamaat_message_amins, 'user_id')
});

/** The latest messages, oldest first (null: not set up yet, or no access). */
export const fetchRoom = async (room: Room, limit = 200): Promise<RoomMessage[] | null> => {
    const { data, error } = await selectWithReactions(withEmoji => supabase.from('jamaat_messages')
        .select(`id, room, user_id, author_role, member_id, author_name, house_name, body, created_at, jamaat_message_amins(user_id${withEmoji ? ', emoji' : ''})`)
        .eq('room', room).order('created_at', { ascending: false }).limit(limit));
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

export const reactRoom = (messageId: number, userId: string, emoji: string | null) => setReaction('jamaat_message_amins', messageId, 'user_id', userId, emoji);

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
