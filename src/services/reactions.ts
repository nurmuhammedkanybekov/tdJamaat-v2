// Reactions on chat messages (house chat and the jamaat's chats). Stored in the
// old "amin" tables; supabase/reactions-2026-11.sql adds the emoji. Until that
// file has run, everything still works with one reaction, 🤲.
import { supabase } from '../lib/supabase';

export const REACTIONS = ['❤️', '🤲', '🤝', '👍', '🙏', '😊', '🔥', '😁', '😂'] as const;
export const DEFAULT_REACTION = '❤️';
export interface Reaction { who: string; emoji: string }

let hasEmoji: boolean | null = null;
const missing = (e: { message?: string; code?: string } | null) => !!e && (e.code === '42703' || /emoji/i.test(e.message ?? ''));

/** Runs a select with the emoji column, or without it if the SQL has not run yet. */
export const selectWithReactions = async <T,>(run: (withEmoji: boolean) => PromiseLike<{ data: T | null; error: { message?: string; code?: string } | null }>) => {
    if (hasEmoji !== false) {
        const res = await run(true);
        if (!missing(res.error)) { if (!res.error) hasEmoji = true; return res; }
        hasEmoji = false;
    }
    return run(false);
};

export const toReactions = (rows: Array<{ emoji?: string | null } & Record<string, unknown>> | undefined, whoKey: string): Reaction[] =>
    (rows ?? []).map(r => ({ who: String(r[whoKey]), emoji: r.emoji ?? '🤲' }));

/** Sets (or, with null, removes) one person's reaction. Delete-then-insert: safe to repeat. */
export const setReaction = async (table: 'house_message_amins' | 'jamaat_message_amins', messageId: number, whoKey: 'member_id' | 'user_id', who: string, emoji: string | null) => {
    const del = await supabase.from(table).delete().eq('message_id', messageId).eq(whoKey, who);
    if (del.error) throw del.error;
    if (!emoji) return;
    const row: Record<string, unknown> = { message_id: messageId };
    if (whoKey === 'member_id') row.member_id = who;
    if (hasEmoji !== false) row.emoji = emoji;
    let ins = await supabase.from(table).insert(row);
    if (ins.error && missing(ins.error)) { hasEmoji = false; delete row.emoji; ins = await supabase.from(table).insert(row); }
    if (ins.error && !/duplicate key/i.test(ins.error.message)) throw ins.error;
};
