// A personal Google account keeps the app's own data (zikr, tasbihat, Quran
// pages and bookmarks, city) in user_store, so it is the same on every device.
// See supabase/accounts-2026-11.sql.
//
// Sending: what this device has, when it changed. Receiving: when another
// device saved something newer than this one last saw, the two copies are
// merged (src/utils/cloudMerge.ts) before anything is sent back.
import { supabase } from '../lib/supabase';
import { isMissingSchema } from './dataService';
import { CLOUD_KEYS, MERGE } from '../utils/cloudMerge';
import type { CloudKey } from '../utils/cloudMerge';

const LOCAL: Record<CloudKey, string> = {
    zikr: 'tdjamaat-zikr-v1',
    practice: 'tdjamaat-practice-v1',
    quran: 'tdjamaat-quran-v1',
    tasbihat: 'tdjamaat-tasbihat-v1',
    city: 'tdjamaat-city'
};
// The city is kept as a bare id, everything else as JSON.
const RAW = new Set<CloudKey>(['city']);

const readLocal = (k: CloudKey): unknown => {
    try {
        const v = localStorage.getItem(LOCAL[k]);
        if (v == null) return null;
        return RAW.has(k) ? v : JSON.parse(v);
    } catch { return null; }
};
const writeLocal = (k: CloudKey, v: unknown) => {
    try { localStorage.setItem(LOCAL[k], RAW.has(k) ? String(v) : JSON.stringify(v)); } catch { /* storage blocked */ }
};

// What this device last sent and saw, per key.
const STATE_KEY = 'tdjamaat-cloud-v1';
interface State { user: string; seen: Partial<Record<CloudKey, string>>; sent: Partial<Record<CloudKey, string>>; at: string | null }
const loadState = (user: string): State => {
    try {
        const s = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null') as State | null;
        if (s && s.user === user) return s;
    } catch { /* start over */ }
    return { user, seen: {}, sent: {}, at: null };
};
const saveState = (s: State) => { try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* not critical */ } };
export const forgetCloud = () => { try { localStorage.removeItem(STATE_KEY); } catch { /* not critical */ } };

// ---------------------------------------------------------------- status
export type CloudStatus = { state: 'idle' | 'saving' | 'saved' | 'offline' | 'off'; at: string | null };
let status: CloudStatus = { state: 'idle', at: null };
const listeners = new Set<() => void>();
const setStatus = (s: CloudStatus) => { status = s; listeners.forEach(f => f()); };
export const cloudStatus = () => status;
export const onCloudStatus = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };


let running: Promise<void> | null = null;

/** One round: receive what is newer, merge, send what changed. */
export const syncCloud = (): Promise<void> => {
    running ??= (async () => {
        const { data: auth } = await supabase.auth.getSession();
        const user = auth.session?.user;
        if (!user) { setStatus({ state: 'idle', at: null }); return; }
        const state = loadState(user.id);
        setStatus({ state: 'saving', at: state.at });
        const { data, error } = await supabase.from('user_store').select('key, value, updated_at');
        if (error) {
            if (isMissingSchema(error)) setStatus({ state: 'off', at: null });
            else { console.warn('[tdJamaat] cloud:', error.message); setStatus({ state: 'offline', at: state.at }); }
            return;
        }
        const saved = new Map((data ?? []).map(r => [r.key as CloudKey, r as { value: unknown; updated_at: string }]));
        const rows: Array<{ key: CloudKey; value: unknown }> = [];
        let changedHere = false;
        for (const k of CLOUD_KEYS) {
            const local = readLocal(k);
            const remote = saved.get(k);
            let next = local;
            if (remote && remote.updated_at !== state.seen[k]) {
                next = local == null ? remote.value : MERGE[k](local, remote.value);
                // Taken as it was saved: nothing to send back.
                if (local == null) state.sent[k] = JSON.stringify(next);
                if (JSON.stringify(next) !== JSON.stringify(local)) { writeLocal(k, next); changedHere = true; }
                state.seen[k] = remote.updated_at;
            }
            if (next == null) continue;
            const text = JSON.stringify(next);
            if (text !== state.sent[k] || !remote) rows.push({ key: k, value: next });
            state.sent[k] = text;
        }
        if (rows.length) {
            const { data: back, error: sendError } = await supabase.from('user_store').upsert(rows, { onConflict: 'user_id,key' }).select('key, updated_at');
            if (sendError) {
                for (const r of rows) delete state.sent[r.key];
                saveState(state);
                console.warn('[tdJamaat] cloud send:', sendError.message);
                setStatus({ state: 'offline', at: state.at });
                return;
            }
            for (const r of back ?? []) state.seen[r.key as CloudKey] = r.updated_at as string;
        }
        state.at = new Date().toISOString();
        saveState(state);
        setStatus({ state: 'saved', at: state.at });
        if (changedHere) {
            window.dispatchEvent(new Event('tdjamaat-practice'));
            window.dispatchEvent(new Event('tdjamaat-cloud'));
        }
    })().catch(e => { console.warn('[tdJamaat] cloud:', e); setStatus({ state: 'offline', at: status.at }); }).finally(() => { running = null; });
    return running;
};

/** Delete this Google account and what it saved; this device keeps its own copy. */
export const deleteMyAccount = async () => {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
    forgetCloud();
    try { localStorage.removeItem('tdjamaat-member-v1'); } catch { /* not critical */ }
    await supabase.auth.signOut().catch(() => undefined);
};
