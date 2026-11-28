// The house's own conversation (supabase/house-chat-2026-11.sql): read the
// latest messages, write under one's own name, answer with "Аамин", and hear
// new messages at once (Supabase Realtime) — or within seconds, by asking
// again, where Realtime is not available.
import { supabase } from '../lib/supabase';
import { selectWithReactions, setReaction, toReactions, type Reaction } from './reactions';
import { isMissingSchema } from './dataService';
import { selectWithEdits } from './editMessage';

export interface ChatMessage { id: number; houseId: string; /** Null for the admin, who is nobody's person. */ memberId: string | null; body: string; createdAt: string; editedAt: string | null; authorRole: string | null; reactions: Reaction[] }

type Row = { id: number; house_id: string; member_id: string | null; body: string; created_at: string; edited_at?: string | null; author_role: string | null; house_message_amins?: Array<{ member_id: string; emoji?: string }> };
const toMessage = (r: Row): ChatMessage => ({ id: r.id, houseId: r.house_id, memberId: r.member_id, body: r.body, createdAt: r.created_at, editedAt: r.edited_at ?? null, authorRole: r.author_role, reactions: toReactions(r.house_message_amins, 'member_id') });

/** The latest `limit` messages, oldest first (null: the chat is not set up yet). */
export const fetchMessages = async (houseId: string, limit = 150): Promise<ChatMessage[] | null> => {
    const { data, error } = await selectWithEdits(edits => selectWithReactions(withEmoji => supabase.from('house_messages')
        .select(`id, house_id, member_id, body, created_at${edits ? ', edited_at' : ''}, author_role, house_message_amins(member_id${withEmoji ? ', emoji' : ''})`)
        .eq('house_id', houseId).order('created_at', { ascending: false }).limit(limit)));
    if (error) { if (!isMissingSchema(error)) console.warn('[tdJamaat] chat:', error.message); return null; }
    return ((data ?? []) as unknown as Row[]).map(toMessage).reverse();
};

export const sendMessage = async (houseId: string, memberId: string | null, body: string) => {
    const { error } = await supabase.from('house_messages').insert({ house_id: houseId, member_id: memberId, body });
    if (error) throw error;
};

export const deleteMessage = async (id: number) => {
    const { error } = await supabase.from('house_messages').delete().eq('id', id);
    if (error) throw error;
};

export const reactHouse = (messageId: number, memberId: string, emoji: string | null) => setReaction('house_message_amins', messageId, 'member_id', memberId, emoji);

/** Calls `onChange` whenever the house's conversation changes. Returns the way to stop. */
export const watchHouse = (houseId: string, onChange: () => void): (() => void) => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
        channel = supabase.channel(`house-${houseId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'house_messages', filter: `house_id=eq.${houseId}` }, onChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'house_message_amins' }, onChange)
            .subscribe();
    } catch { channel = null; }
    // Asking again every few seconds as well: cheap, and it covers a phone
    // that woke from sleep or a network that blocks Realtime.
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') onChange(); }, 8000);
    return () => { window.clearInterval(timer); if (channel) supabase.removeChannel(channel).catch(() => undefined); };
};

// ---------------------------------------------------------------------------
// What has not been read yet (kept on this phone)
// ---------------------------------------------------------------------------
const SEEN = 'tdjamaat-chat-seen-v1';
const seenMap = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(SEEN) ?? '{}'); } catch { return {}; } };
export const markSeen = (houseId: string, at = new Date().toISOString()) => {
    try { localStorage.setItem(SEEN, JSON.stringify({ ...seenMap(), [houseId]: at })); } catch { /* not critical */ }
    window.dispatchEvent(new Event('tdjamaat-chat-seen'));
};
export const lastSeen = (houseId: string) => seenMap()[houseId] ?? null;

/** How many messages from others came after the last visit (memberId '' = the admin, whose own messages are the admin's). */
export const countUnread = async (houseId: string, memberId: string): Promise<number> => {
    const since = lastSeen(houseId) ?? new Date(0).toISOString();
    const { count, error } = await supabase.from('house_messages').select('id', { count: 'exact', head: true })
        .eq('house_id', houseId).gt('created_at', since).or(memberId ? `member_id.is.null,member_id.neq.${memberId},author_role.eq.admin` : 'author_role.neq.admin,author_role.is.null');
    return error ? 0 : count ?? 0;
};
