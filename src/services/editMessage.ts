// Editing one's own chat message (supabase/edit-messages-2026-11.sql): for
// 48 hours, in the house chat, the jamaat's chats and private messages. Until
// that file has run, the chats read and work as before, with no editing.
import { supabase } from '../lib/supabase';

export type MessageKind = 'house' | 'room' | 'dm';
export const EDIT_WINDOW_MS = 48 * 3600e3;

let hasEdits: boolean | null = null;
const missing = (e: { message?: string; code?: string } | null) => !!e && (e.code === '42703' || /edited_at/i.test(e.message ?? ''));

/** Runs a select with the edited_at column, or without it if the SQL has not run yet. */
export const selectWithEdits = async <R extends { error: { message?: string; code?: string } | null }>(run: (withEdits: boolean) => PromiseLike<R>): Promise<R> => {
    if (hasEdits !== false) {
        const res = await run(true);
        if (!missing(res.error)) { if (!res.error) hasEdits = true; return res; }
        hasEdits = false;
    }
    return run(false);
};

/** Whether this message can still be edited here (one's own is checked by the caller). */
export const canEditAt = (createdAt: string, now = Date.now()) => hasEdits === true && now - new Date(createdAt).getTime() < EDIT_WINDOW_MS;

export const editMessage = async (kind: MessageKind, id: number, body: string) => {
    const { error } = await supabase.rpc('edit_message', { kind, m: id, body: body.trim() });
    if (error) throw error;
};
