// Who "I" am on the everyday pages: a member signed in with Google, or a
// captain / the admin who said once which person of a house they are.
import { useCallback, useContext, useEffect, useState } from 'react';
import { AppContext } from './context';

export interface Self { memberId: string; name: string; houseId: string; houseName: string; via: 'google' | 'staff'; /** Chosen by hand (not the admin's default). */ manual?: boolean }

/** The admin is Нур unless the admin chooses someone else by hand. */
export const ADMIN_DEFAULT_NAME = 'Нур';

const KEY = 'tdjamaat-self-v1';
export const readStaff = (): Omit<Self, 'via'> | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; } };
export const saveStaffSelf = (s: Omit<Self, 'via'> | null) => {
    try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* not critical */ }
    window.dispatchEvent(new Event('tdjamaat-self'));
};

export const useSelf = (): { self: Self | null; canChoose: boolean; choose: (s: Omit<Self, 'via'> | null) => void } => {
    const { member, signedIn, role, houseId } = useContext(AppContext);
    const [staff, setStaff] = useState(readStaff);
    useEffect(() => {
        const on = () => setStaff(readStaff());
        window.addEventListener('tdjamaat-self', on);
        return () => window.removeEventListener('tdjamaat-self', on);
    }, []);
    const choose = useCallback((s: Omit<Self, 'via'> | null) => saveStaffSelf(s), []);
    if (member?.status === 'linked') return { self: { ...member.link, via: 'google' }, canChoose: false, choose };
    const staffOk = signedIn && (role === 'admin' || role === 'leader');
    // A captain is a person of their own house only.
    const valid = staff && staffOk && (role === 'admin' || staff.houseId === houseId) ? staff : null;
    return { self: valid ? { ...valid, via: 'staff' } : null, canChoose: !!staffOk, choose };
};

/** New messages in my house's conversation since my last visit (checked each minute). */
export const useUnread = (self: Self | null): number => {
    const [n, setN] = useState(0);
    useEffect(() => {
        if (!self) return;
        let alive = true;
        const check = () => { import('../services/chatService').then(m => m.countUnread(self.houseId, self.memberId)).then(c => { if (alive) setN(c); }).catch(() => undefined); };
        check();
        const timer = window.setInterval(check, 60000);
        window.addEventListener('tdjamaat-chat-seen', check);
        return () => { alive = false; window.clearInterval(timer); window.removeEventListener('tdjamaat-chat-seen', check); };
    }, [self?.houseId, self?.memberId]); // eslint-disable-line react-hooks/exhaustive-deps
    return n;
};
