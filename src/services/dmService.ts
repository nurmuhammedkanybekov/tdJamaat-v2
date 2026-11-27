// Private messages between two accounts (supabase/polls-dm-2026-11.sql).
// The database decides who may write to whom (dm_people) and lets only the
// two people read a conversation.
import { supabase } from '../lib/supabase';
import { isMissingSchema } from './dataService';

export interface DmPerson { userId: string; name: string; houseName: string | null; role: 'member' | 'leader' | 'inspector' | 'admin' }
export interface Dm { id: number; sender: string; recipient: string; body: string; createdAt: string; readAt: string | null }

const toDm = (r: { id: number; sender: string; recipient: string; body: string; created_at: string; read_at: string | null }): Dm =>
    ({ id: r.id, sender: r.sender, recipient: r.recipient, body: r.body, createdAt: r.created_at, readAt: r.read_at });

/** Whom this account may write to (null: not set up yet). */
export const fetchDmPeople = async (): Promise<DmPerson[] | null> => {
    const { data, error } = await supabase.rpc('dm_people');
    if (error) { if (!isMissingSchema(error) && !/dm_people|function/i.test(error.message)) console.warn('[tdJamaat] dm people:', error.message); return null; }
    const seen = new Set<string>();
    return ((data ?? []) as Array<{ user_id: string; name: string; house_name: string | null; role: DmPerson['role'] }>)
        .filter(r => !seen.has(r.user_id) && seen.add(r.user_id))
        .map(r => ({ userId: r.user_id, name: r.name, houseName: r.house_name, role: r.role }));
};

/** The latest messages of every conversation of this account, newest first. */
export const fetchDms = async (limit = 400): Promise<Dm[] | null> => {
    const { data, error } = await supabase.from('direct_messages').select('id, sender, recipient, body, created_at, read_at').order('created_at', { ascending: false }).limit(limit);
    if (error) return null;
    return (data ?? []).map(toDm);
};

/** One conversation, oldest first. */
export const fetchThread = async (me: string, peer: string, limit = 300): Promise<Dm[] | null> => {
    const { data, error } = await supabase.from('direct_messages').select('id, sender, recipient, body, created_at, read_at')
        .or(`and(sender.eq.${me},recipient.eq.${peer}),and(sender.eq.${peer},recipient.eq.${me})`)
        .order('created_at', { ascending: false }).limit(limit);
    if (error) return null;
    return (data ?? []).map(toDm).reverse();
};

export const sendDm = async (recipient: string, body: string) => {
    const { error } = await supabase.from('direct_messages').insert({ recipient, body });
    if (error) throw error;
};
export const deleteDm = async (id: number) => {
    const { error } = await supabase.from('direct_messages').delete().eq('id', id);
    if (error) throw error;
};
export const markDmRead = async (peer: string) => { await supabase.rpc('mark_dm_read', { peer }); };

export const countDmUnread = async (me: string): Promise<number> => {
    const { count, error } = await supabase.from('direct_messages').select('id', { count: 'exact', head: true }).eq('recipient', me).is('read_at', null);
    return error ? 0 : count ?? 0;
};

/** Calls `onChange` when a message comes or goes. Returns the way to stop. */
export const watchDms = (onChange: () => void): (() => void) => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try { channel = supabase.channel('dm').on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, onChange).subscribe(); } catch { channel = null; }
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') onChange(); }, 10000);
    return () => { window.clearInterval(timer); if (channel) supabase.removeChannel(channel).catch(() => undefined); };
};

/** How a person is named in a list. */
export const personLine = (p: DmPerson | undefined, labels: { captain: string; admin: string }) =>
    !p ? '' : p.role === 'admin' ? labels.admin : p.role === 'inspector' ? 'CL' : p.role === 'leader' ? `${labels.captain}${p.houseName ? ` · ${p.houseName}` : ''}` : p.houseName ?? '';
