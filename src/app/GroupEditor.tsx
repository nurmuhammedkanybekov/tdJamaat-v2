// A group of chosen people (supabase/group-chats-2026-11.sql): the admin or
// a captain names it and picks its people from everyone in the jamaat with an
// account; later renames it, changes who is in it, or closes it.
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, Trash2, X } from 'lucide-react';
import { t } from '../i18n';
import type { ChatRoom } from '../services/jamaatChatService';
import { createGroup, deleteRoom, fetchGroupPeople, setGroupPeople, updateRoom } from '../services/jamaatChatService';
import type { DmPerson } from '../services/dmService';
import { fetchDmPeople } from '../services/dmService';

const ORDER: Record<DmPerson['role'], number> = { admin: 0, inspector: 1, leader: 2, member: 3 };
const line = (p: DmPerson) => (p.role === 'admin' ? t('Жамааттын админи') : p.role === 'inspector' ? 'CL' : p.role === 'leader' ? `${t('Капитан')}${p.houseName ? ` · ${p.houseName}` : ''}` : p.houseName ?? '');

export const GroupEditor: React.FC<{ room?: ChatRoom; me: string | null; onDone: (opened?: string) => void }> = ({ room, me, onDone }) => {
    const [name, setName] = useState(room?.name ?? '');
    const [about, setAbout] = useState(room?.about ?? '');
    const [people, setPeople] = useState<DmPerson[] | null>(null);
    const [chosen, setChosen] = useState<Set<string>>(new Set());
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { fetchDmPeople().then(p => setPeople(p ?? [])).catch(() => setPeople([])); }, []);
    useEffect(() => { if (room) fetchGroupPeople(room.id).then(ids => setChosen(new Set(ids.filter(id => id !== me)))).catch(() => undefined); }, [room, me]);

    const byId = useMemo(() => new Map((people ?? []).map(p => [p.userId, p])), [people]);
    const sorted = useMemo(() => [...(people ?? [])].sort((a, b) => ORDER[a.role] - ORDER[b.role] || (a.houseName ?? '').localeCompare(b.houseName ?? '') || a.name.localeCompare(b.name)), [people]);
    const needle = q.trim().toLowerCase();
    const shown = needle ? sorted.filter(p => `${p.name} ${line(p)}`.toLowerCase().includes(needle)) : sorted;
    const toggle = (id: string) => setChosen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

    const save = async () => {
        if (!name.trim() || chosen.size === 0) return;
        setBusy(true); setError('');
        try {
            if (room) {
                await updateRoom(room.id, { name: name.trim(), about: about.trim() || null, audience: 'custom' });
                await setGroupPeople(room.id, [...chosen]);
                onDone();
            } else onDone(await createGroup(name, about, [...chosen]));
        } catch (e) {
            const msg = String((e as Error)?.message ?? '');
            setError(/create_group|function|schema cache|does not exist/i.test(msg) ? t('Топ ачуу үчүн админ supabase/group-chats-2026-11.sql файлын иштетиши керек.') : msg);
        } finally { setBusy(false); }
    };
    const close = async () => {
        if (!room || !window.confirm(t('«{0}» жана анын бардык билдирүүлөрү өчөт. Улантасызбы?', room.name))) return;
        setBusy(true);
        try { await deleteRoom(room.id); onDone(); } catch (e) { setError((e as Error)?.message ?? ''); setBusy(false); }
    };

    return (
        <div className="room-editor pop-in">
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>{room ? t('Топту өзгөртүү') : t('Жаңы топ')}</div>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder={t('Аталышы, мисалы: Ифтар уюштуруучулары')} aria-label={t('Аталышы')} className="room-editor-input font-display text-[1.3rem]" />
            <input value={about} onChange={e => setAbout(e.target.value)} maxLength={200} placeholder={t('Кыскача: эмне жөнүндө (милдеттүү эмес)')} aria-label={t('Кыскача')} className="room-editor-input text-[0.95rem]" />

            <div className="group-h">
                <span className="eyebrow">{t('Адамдар')}</span>
                <span className="text-[0.82rem] tabular" style={{ color: 'var(--gold)' }}>{t('{0} тандалды', chosen.size)}</span>
            </div>
            {chosen.size > 0 && (
                <div className="group-chosen">
                    {[...chosen].map(id => {
                        const p = byId.get(id);
                        return <button key={id} onClick={() => toggle(id)} aria-label={t('Алып салуу: {0}', p?.name ?? '')}>{p?.name ?? '…'}<X className="w-3 h-3" /></button>;
                    })}
                </div>
            )}
            <label className="group-search">
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Аты же үйү боюнча издөө')} aria-label={t('Издөө')} />
            </label>
            <ul className="group-people">
                {people === null && <li className="py-3 text-[0.88rem]" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-4 h-4 animate-spin inline" /></li>}
                {people && shown.length === 0 && <li className="py-3 text-[0.88rem] italic" style={{ color: 'var(--text-muted)' }}>{t('Эч ким табылган жок')}</li>}
                {shown.map(p => {
                    const on = chosen.has(p.userId);
                    return (
                        <li key={p.userId}>
                            <button className="group-person" data-on={on || undefined} onClick={() => toggle(p.userId)} aria-pressed={on}>
                                <i aria-hidden="true">{on && <Check className="w-3 h-3" strokeWidth={3} />}</i>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                                    <span className="block text-[0.78rem] truncate" style={{ color: 'var(--text-muted)' }}>{line(p)}</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            {error && <p className="text-[0.82rem] mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
            <div className="flex flex-wrap items-center gap-3 mt-4">
                <button className="btn btn-primary" disabled={busy || !name.trim() || chosen.size === 0} onClick={save}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{room ? t('Сактоо') : t('Топту ачуу')}</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => onDone()}>{t('Жокко чыгаруу')}</button>
                {room && <button className="ml-auto text-[0.75rem] tracking-[0.14em] uppercase inline-flex items-center gap-1.5" disabled={busy} onClick={close} style={{ color: 'var(--danger)' }}><Trash2 className="w-3.5 h-3.5" />{t('Топту жабуу')}</button>}
            </div>
        </div>
    );
};
