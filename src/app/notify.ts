// Notifications while the app is open or in the background: a new message
// in my house's conversation or in a shared one (Жамааттын сөзү,
// Капитандар, the admin's own), a new announcement. They come from the same
// live connection (Supabase Realtime) the pages use. When the app is fully
// closed nothing arrives — that would need a push server (not set up).
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cachedLink } from '../services/memberService';
import { t } from '../i18n';

const KEY = 'tdjamaat-notify-v1';
export const notifySupported = () => typeof window !== 'undefined' && 'Notification' in window;
export const notifyOn = () => { try { return notifySupported() && Notification.permission === 'granted' && localStorage.getItem(KEY) === '1'; } catch { return false; } };

export const enableNotify = async (): Promise<boolean> => {
    if (!notifySupported()) return false;
    const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    const ok = p === 'granted';
    try { if (ok) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* not critical */ }
    window.dispatchEvent(new Event('tdjamaat-notify'));
    return ok;
};
export const disableNotify = () => { try { localStorage.removeItem(KEY); } catch { /* not critical */ } window.dispatchEvent(new Event('tdjamaat-notify')); };

export const useNotifyState = () => {
    const [on, setOn] = useState(notifyOn);
    useEffect(() => { const f = () => setOn(notifyOn()); window.addEventListener('tdjamaat-notify', f); return () => window.removeEventListener('tdjamaat-notify', f); }, []);
    return on;
};

const staffSelf = (): { memberId: string; houseId: string; houseName: string } | null => { try { return JSON.parse(localStorage.getItem('tdjamaat-self-v1') ?? 'null'); } catch { return null; } };

let badge = 0;
const setBadge = (n: number) => {
    badge = n;
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    (n > 0 ? nav.setAppBadge?.(n) : nav.clearAppBadge?.())?.catch(() => undefined);
};
export const clearBadge = () => setBadge(0);

const show = async (title: string, body: string, url: string, tag: string) => {
    try {
        const reg = await navigator.serviceWorker?.getRegistration();
        const options = { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url } };
        if (reg) await reg.showNotification(title, options);
        else new Notification(title, options);
    } catch { /* not allowed here */ }
};

/** Mounted once for the whole app. */
export const useNotifier = () => {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const f = () => setTick(n => n + 1);
        window.addEventListener('tdjamaat-notify', f);
        window.addEventListener('tdjamaat-self', f);
        window.addEventListener('tdjamaat-chat-seen', clearBadge);
        return () => { window.removeEventListener('tdjamaat-notify', f); window.removeEventListener('tdjamaat-self', f); window.removeEventListener('tdjamaat-chat-seen', clearBadge); };
    }, []);
    useEffect(() => {
        if (!notifyOn()) return;
        const self = cachedLink() ?? staffSelf();
        const channel = supabase.channel('tdjamaat-notify');
        if (self) {
            channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'house_messages', filter: `house_id=eq.${self.houseId}` }, payload => {
                const row = payload.new as { member_id?: string; body?: string; author_role?: string | null };
                if (!row) return;
                // My own message — but the admin's messages are the admin's, not the person's.
                const viaMember = !!cachedLink();
                if (row.member_id === self.memberId && !(viaMember && row.author_role === 'admin')) return;
                const reading = window.location.hash.startsWith('#/house/chat') && document.visibilityState === 'visible';
                if (reading) return;
                setBadge(badge + 1);
                show(t('Үйдүн сөзү · {0}', self.houseName), `${row.author_role === 'admin' ? `${t('Админ')}: ` : ''}${row.body ?? ''}`.slice(0, 160), '/#/house/chat', 'house-chat');
            });
        }
        // The shared conversations (Жамааттын сөзү, Капитандар, the admin's own):
        // the database sends only those this account may read.
        let me: string | null = null;
        const names = new Map<string, string>();
        supabase.auth.getSession().then(({ data }) => { me = data.session?.user.id ?? null; }).catch(() => undefined);
        Promise.resolve(supabase.from('chat_rooms').select('id, name')).then(({ data }) => { (data ?? []).forEach((r: { id: string; name: string }) => names.set(r.id, r.name)); }).catch(() => undefined);
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jamaat_messages' }, payload => {
            const row = payload.new as { room?: string; user_id?: string; body?: string; author_role?: string; author_name?: string | null; house_name?: string | null };
            if (!row?.room || !me || row.user_id === me) return;
            const reading = window.location.hash === `#/chat/${row.room}` && document.visibilityState === 'visible';
            if (reading) return;
            const who = row.author_role === 'admin' ? t('Админ') : row.author_role === 'inspector' ? 'CL' : row.author_name || row.house_name || '';
            const room = names.get(row.room) ?? (row.room === 'staff' ? t('Капитандар') : t('Жамааттын сөзү'));
            setBadge(badge + 1);
            show(room, `${who ? `${who}: ` : ''}${row.body ?? ''}`.slice(0, 160), `/#/chat/${row.room}`, `room-${row.room}`);
        });
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
            const row = payload.new as { title?: string | null; body?: string };
            if (!row) return;
            show(row.title || t('Жамааттан кабар'), (row.body ?? '').slice(0, 160), '/#/news', 'news');
        });
        channel.subscribe();
        return () => { supabase.removeChannel(channel).catch(() => undefined); };
    }, [tick]);
};
