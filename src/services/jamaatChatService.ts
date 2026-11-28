// The jamaat's shared conversations (supabase/jamaat-chat-2026-11.sql):
// 'all' — everyone (members, captains, CL, the admin); 'staff' — captains, CL
// and the admin; and any the admin opens, for one of those two audiences. The database fills in who wrote a message; the names travel
// with it, since a member can read only their own house's people.
import { supabase } from '../lib/supabase';
import { selectWithEdits } from './editMessage';
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
    editedAt: string | null;
    /** Accounts that said "Аамин". */
    reactions: Reaction[];
    /** A poll: the text is its question (supabase/polls-dm-2026-11.sql). */
    poll: Poll | null;
}

export interface Poll { options: string[]; multi: boolean; closed: boolean; votes: Array<{ who: string; option: number }> }

type Row = { id: number; room: Room; user_id: string; author_role: string; member_id: string | null; author_name: string | null; house_name: string | null; body: string; created_at: string; edited_at?: string | null; poll?: { options?: unknown; multi?: boolean; closed?: boolean } | null; jamaat_message_amins?: Array<{ user_id: string; emoji?: string }> };
const toPoll = (p: Row['poll']): Poll | null => (p && Array.isArray(p.options) ? { options: p.options.map(String), multi: !!p.multi, closed: !!p.closed, votes: [] } : null);
const toMessage = (r: Row): RoomMessage => ({
    id: r.id, room: r.room, userId: r.user_id, authorRole: r.author_role, memberId: r.member_id, authorName: r.author_name, houseName: r.house_name,
    body: r.body, createdAt: r.created_at, editedAt: r.edited_at ?? null, reactions: toReactions(r.jamaat_message_amins, 'user_id'), poll: toPoll(r.poll)
});

// Polls exist once supabase/polls-dm-2026-11.sql has run.
let hasPolls: boolean | null = null;

/** The latest messages, oldest first (null: not set up yet, or no access). */
export const fetchRoom = async (room: Room, limit = 200): Promise<RoomMessage[] | null> => {
    const run = (polls: boolean) => selectWithEdits(edits => selectWithReactions(withEmoji => supabase.from('jamaat_messages')
        .select(`id, room, user_id, author_role, member_id, author_name, house_name, body, created_at${edits ? ', edited_at' : ''}${polls ? ', poll' : ''}, jamaat_message_amins(user_id${withEmoji ? ', emoji' : ''})`)
        .eq('room', room).order('created_at', { ascending: false }).limit(limit)));
    let res = await run(hasPolls !== false);
    if (res.error && hasPolls !== false && (res.error.code === '42703' || /poll/i.test(res.error.message ?? ''))) { hasPolls = false; res = await run(false); }
    else if (!res.error && hasPolls === null) hasPolls = true;
    const { data, error } = res;
    if (error) { if (!isMissingSchema(error)) console.warn('[tdJamaat] room:', error.message); return null; }
    const list = ((data ?? []) as unknown as Row[]).map(toMessage).reverse();
    const polls = list.filter(m => m.poll);
    if (polls.length) {
        const { data: votes } = await supabase.from('jamaat_poll_votes').select('message_id, user_id, option').in('message_id', polls.map(m => m.id));
        for (const v of (votes ?? []) as Array<{ message_id: number; user_id: string; option: number }>) polls.find(m => m.id === v.message_id)?.poll?.votes.push({ who: v.user_id, option: v.option });
    }
    return list;
};

/** Whether polls can be made here (the SQL has run). */
export const pollsReady = () => hasPolls === true;

export const sendPoll = async (room: Room, question: string, options: string[], multi: boolean, memberId: string | null) => {
    const clean = options.map(o => o.trim().slice(0, 80)).filter(Boolean).slice(0, 8);
    const { error } = await supabase.from('jamaat_messages').insert({ room, body: question.trim(), member_id: memberId, poll: { options: clean, multi } });
    if (error) throw error;
};

/** Choose (or take back) an option. In a one-choice poll the database drops the earlier choice. */
export const votePoll = async (messageId: number, option: number, on: boolean, me: string) => {
    if (on) {
        const { error } = await supabase.from('jamaat_poll_votes').insert({ message_id: messageId, option });
        if (error && !/duplicate key/i.test(error.message)) throw error;
    } else {
        const { error } = await supabase.from('jamaat_poll_votes').delete().eq('message_id', messageId).eq('user_id', me).eq('option', option);
        if (error) throw error;
    }
};

export const closePoll = async (messageId: number) => {
    const { error } = await supabase.rpc('close_poll', { m: messageId });
    if (error) throw error;
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jamaat_poll_votes' }, onChange)
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
