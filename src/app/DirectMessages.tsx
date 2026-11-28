// Private messages: the list of conversations on #/chat, and one
// conversation at #/chat/dm/<account>. Text only; only the two people see
// it (supabase/polls-dm-2026-11.sql).
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Check, ChevronRight, Loader2, PenLine, Search, X } from 'lucide-react';
import { Acts, ComposerBar, EditedMark, MessageText, Quote, showMessage, type Editing, type Replying } from '../components/ChatEdit';
import { canEditAt, editMessage } from '../services/editMessage';

import type { Theme } from '../theme';
import { t, dateLocale } from '../i18n';
import { AppFrame, Waiting } from './AppFrame';
import { go } from './route';
import { Mark } from '../components/Ornament';
import type { Dm, DmPerson } from '../services/dmService';
import { deleteDm, fetchDmPeople, fetchDms, fetchThread, markDmRead, personLine, sendDm, watchDms } from '../services/dmService';
import { myUserId } from '../services/jamaatChatService';

const KY_MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const when = (iso: string) => {
    const d = new Date(iso), now = new Date();
    if (d.toDateString() === now.toDateString()) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return dateLocale() ? d.toLocaleDateString(dateLocale()!, { day: 'numeric', month: 'short' }) : `${d.getDate()} ${KY_MONTHS[d.getMonth()]}`;
};
const labels = () => ({ captain: t('Капитан'), admin: t('Жамааттын админи') });

const Face: React.FC<{ p?: DmPerson; name: string }> = ({ p, name }) =>
    p?.role === 'admin' ? <span className="chat-admin-seal" aria-hidden="true"><Mark size={20} /></span>
        : p?.role === 'inspector' ? <span className="chat-cl-seal" aria-hidden="true">CL</span>
            : <span className={`room-seal ${p?.role === 'leader' ? 'is-captain' : ''}`} aria-hidden="true"><span>{name.slice(0, 1)}</span></span>;

/** The conversations on #/chat, and the way to start one. Hidden until the SQL has run. */
export const DmSection: React.FC = () => {
    const [people, setPeople] = useState<DmPerson[] | null>(null);
    const [dms, setDms] = useState<Dm[] | null>(null);
    const [me, setMe] = useState<string | null>(null);
    const [picking, setPicking] = useState(false);
    const [q, setQ] = useState('');
    const load = useCallback(() => { fetchDms().then(setDms).catch(() => setDms(null)); }, []);
    useEffect(() => {
        myUserId().then(setMe).catch(() => undefined);
        fetchDmPeople().then(setPeople).catch(() => setPeople(null));
        load();
        return watchDms(load);
    }, [load]);
    const threads = useMemo(() => {
        if (!dms || !me) return [];
        const by = new Map<string, { peer: string; last: Dm; unread: number }>();
        for (const m of dms) {
            const peer = m.sender === me ? m.recipient : m.sender;
            const cur = by.get(peer) ?? { peer, last: m, unread: 0 };
            if (m.recipient === me && !m.readAt) cur.unread++;
            by.set(peer, cur);
        }
        return [...by.values()];
    }, [dms, me]);
    if (!people) return null;
    const find = (id: string) => people.find(p => p.userId === id);
    // The admin, CL and the captains first, then everyone by house; all matches while searching.
    const ORDER: Record<DmPerson['role'], number> = { admin: 0, inspector: 1, leader: 2, member: 3 };
    const sorted = [...people].sort((a, b) => ORDER[a.role] - ORDER[b.role] || (a.houseName ?? '').localeCompare(b.houseName ?? '') || a.name.localeCompare(b.name));
    const needle = q.trim().toLowerCase();
    const shown = needle ? sorted.filter(p => `${p.name} ${p.houseName ?? ''} ${p.role === 'leader' ? t('Капитан') : ''}`.toLowerCase().includes(needle)) : sorted.slice(0, 60);
    return (
        <section className="mt-10">
            <div className="flex items-center justify-between gap-3 pb-3" style={{ borderBottom: '1px solid var(--gold-dim)' }}>
                <h2 className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Жеке каттар')}</h2>
                {people.length > 0 && <button onClick={() => setPicking(v => !v)} className="dm-new" aria-expanded={picking}>{picking ? <X className="w-4 h-4" /> : <PenLine className="w-4 h-4" />}{t('Жаңы кат')}</button>}
            </div>
            {picking && (
                <div className="dm-pick pop-in">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-0 top-3.5" style={{ color: 'var(--text-muted)' }} />
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Кимге жазасыз?')} aria-label={t('Кимге жазасыз?')} className="z-input pl-6" autoFocus />
                    </div>
                    <ul className="mt-1 max-h-[22rem] overflow-y-auto">
                        {shown.map(p => (
                            <li key={p.userId}>
                                <button onClick={() => go(`#/chat/dm/${p.userId}`)} className="row-link w-full text-left py-2.5 flex items-center gap-3">
                                    <Face p={p} name={p.name} />
                                    <span className="flex-1 min-w-0"><span className="block font-display text-[1.15rem] truncate" style={{ color: 'var(--text-primary)' }}>{p.role === 'member' ? p.name : personLine(p, labels())}</span>{p.role === 'member' && <span className="block text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{p.houseName}</span>}</span>
                                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                                </button>
                            </li>
                        ))}
                        {shown.length === 0 && <li className="py-3 text-[0.9rem] italic" style={{ color: 'var(--text-muted)' }}>{t('Эч ким табылган жок.')}</li>}
                    </ul>
                </div>
            )}
            {threads.length === 0 && !picking && (
                <p className="py-5 text-[0.92rem] italic" style={{ color: 'var(--text-muted)' }}>{people.length ? t('Азырынча жеке кат жок. Жамааттагы каалаган адамга жаза аласыз: «Жаңы кат» басып, атын издеңиз.') : t('Жеке кат жазууга азырынча эч ким жок.')}</p>
            )}
            <ul>
                {threads.map(th => {
                    const p = find(th.peer);
                    const name = p ? (p.role === 'member' ? p.name : personLine(p, labels())) : t('Мурунку маек');
                    return (
                        <li key={th.peer} style={{ borderBottom: '1px solid var(--border)' }}>
                            <button onClick={() => go(`#/chat/dm/${th.peer}`)} className="room-row w-full" data-new={th.unread > 0 || undefined}>
                                <Face p={p} name={name} />
                                <span className="flex-1 min-w-0 text-left">
                                    <span className="flex items-baseline justify-between gap-3">
                                        <span className="font-display text-[1.3rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
                                        <span className="text-[0.75rem] tabular flex-shrink-0" style={{ color: th.unread ? 'var(--gold)' : 'var(--text-muted)' }}>{when(th.last.createdAt)}</span>
                                    </span>
                                    <span className="flex items-center justify-between gap-3">
                                        <span className="block text-[0.88rem] truncate" style={{ color: th.unread ? 'var(--text-primary)' : 'var(--text-muted)' }}>{th.last.sender === me ? `${t('Сиз')}: ` : ''}{th.last.body}</span>
                                        {th.unread > 0 && <span className="dm-unread tabular">{th.unread}</span>}
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

/** One private conversation. */
export const DmChat: React.FC<{ peer: string; theme: Theme; onToggleTheme: () => void }> = ({ peer, theme, onToggleTheme }) => {
    const [me, setMe] = useState<string | null>(null);
    const [person, setPerson] = useState<DmPerson | null | undefined>(undefined);
    const [list, setList] = useState<Dm[] | null | undefined>(undefined);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const input = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        myUserId().then(setMe).catch(() => undefined);
        fetchDmPeople().then(ps => setPerson(ps?.find(p => p.userId === peer) ?? null)).catch(() => setPerson(null));
    }, [peer]);
    const load = useCallback(() => {
        if (!me) return;
        fetchThread(me, peer).then(l => { setList(l); if (l?.some(m => m.recipient === me && !m.readAt)) markDmRead(peer).catch(() => undefined); }).catch(() => setList(null));
    }, [me, peer]);
    useEffect(() => { load(); return watchDms(load); }, [load]);
    useLayoutEffect(() => { window.scrollTo(0, document.documentElement.scrollHeight); }, [list]);
    useLayoutEffect(() => { const el = input.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; } }, [text]);

    const name = person ? (person.role === 'member' ? person.name : personLine(person, labels())) : t('Жеке кат');
    const [editing, setEditing] = useState<Editing | null>(null);
    const [replying, setReplying] = useState<Replying | null>(null);
    const [sel, setSel] = useState<number | null>(null);
    const startEdit = (m: Dm) => { setReplying(null); setSel(null); setEditing({ id: m.id, body: m.body }); setText(m.body); window.setTimeout(() => input.current?.focus(), 0); };
    const stopEdit = () => { if (editing) setText(''); setEditing(null); setReplying(null); };
    const startReply = (m: Dm) => { setEditing(null); setSel(null); setReplying({ id: m.id, who: m.sender === me ? t('Сиз') : name, body: m.body }); window.setTimeout(() => input.current?.focus(), 0); };
    const send = async () => {
        const clean = text.trim();
        if (!clean || sending) return;
        if (editing) {
            if (clean === editing.body) { stopEdit(); return; }
            setSending(true); setError('');
            const id = editing.id;
            setList(cur => cur?.map(x => (x.id === id ? { ...x, body: clean, editedAt: new Date().toISOString() } : x)));
            try { await editMessage('dm', id, clean); stopEdit(); } catch (e) { setError((e as Error)?.message ?? ''); load(); }
            finally { setSending(false); }
            return;
        }
        setSending(true); setError('');
        try { await sendDm(peer, clean, replying?.id ?? null); setText(''); setReplying(null); load(); input.current?.focus(); }
        catch (e) { const msg = (e as Error)?.message ?? ''; setError(/row-level security/i.test(msg) ? t('Бул адамга жеке кат жазууга болбойт.') : msg || t('Жөнөтүлгөн жок')); }
        finally { setSending(false); }
    };
    return (
        <AppFrame page="today" title={name} back="#/chat" theme={theme} onToggleTheme={onToggleTheme} ownBar>
            <div className="max-w-[42rem] mx-auto pt-2 pb-6">
                <header className="text-center pt-5 pb-3">
                    <div className="inline-flex justify-center"><Face p={person ?? undefined} name={name} /></div>
                    <h1 className="font-display text-[1.9rem] leading-tight mt-2" style={{ color: 'var(--text-primary)' }}>{name}</h1>
                    <p className="text-[0.8rem] mt-1" style={{ color: 'var(--text-muted)' }}>{person?.role === 'member' ? `${person.houseName ?? ''} · ` : ''}{t('Жеке кат: экөөңүз гана көрөсүз')}</p>
                </header>
                {list === undefined && <Waiting />}
                {list === null && <p className="mt-6 text-[0.9rem]" style={{ color: 'var(--text-muted)' }}>{t('Жеке каттар азырынча ачыла элек.')}</p>}
                {list && list.length === 0 && <p className="text-center font-display text-[1.3rem] pt-8" style={{ color: 'var(--text-primary)' }}>{t('Биринчи кат сизден болсун')}</p>}
                {list && list.map((m, i) => {
                    const mine = m.sender === me;
                    const prev = list[i - 1];
                    const run = prev && prev.sender === m.sender && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60000;
                    return (
                        <div key={m.id} id={`m-${m.id}`} data-sel={sel === m.id || undefined} onClick={() => setSel(s => (s === m.id ? null : m.id))} className={`chat-row ${mine ? 'is-mine' : ''} ${run ? 'is-run' : ''}`}>
                            <div className="chat-body">
                                <div className="chat-bubble">
                                    {m.replyTo && (() => { const q = list.find(x => x.id === m.replyTo); return <Quote who={q ? (q.sender === me ? t('Сиз') : name) : null} body={q?.body ?? null} onClick={q ? () => showMessage(q.id) : undefined} />; })()}
                                    <MessageText text={m.body} />
                                </div>
                                <div className="chat-meta">
                                    <span className="tabular">{when(m.createdAt)}</span>
                                    {mine && <span>{m.readAt ? t('окулду') : ''}</span>}
                                    <EditedMark at={m.editedAt} />
                                    <Acts text={m.body} onReply={() => startReply(m)} onEdit={mine && canEditAt(m.createdAt) ? () => startEdit(m) : undefined} onDelete={mine ? () => { if (window.confirm(t('Бул катты өчүрөсүзбү?'))) deleteDm(m.id).then(load).catch(e => setError((e as Error)?.message ?? '')); } : undefined} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {list !== null && person !== null && (
                <div className="fixed left-0 right-0 bottom-0 z-30 page-gutter" style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))', paddingTop: '0.6rem', backgroundColor: 'color-mix(in oklab, var(--page-plane) 94%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}>
                    {error && <p className="max-w-[42rem] mx-auto text-[0.82rem] mb-2" style={{ color: 'var(--danger)' }}>{error}</p>}
                    <ComposerBar editing={editing} replying={replying} onCancel={stopEdit} />
                    <form className="max-w-[42rem] mx-auto flex items-end gap-2" onSubmit={e => { e.preventDefault(); send(); }}>
                        <textarea ref={input} rows={1} value={text} maxLength={2000} onChange={e => setText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Escape' && (editing || replying)) stopEdit(); if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); send(); } }}
                            placeholder={t('{0}: жазуу…', name)} aria-label={t('Билдирүү')} className="login-field flex-1 min-w-0 resize-none px-3.5 py-3 text-base leading-snug"
                            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }} />
                        <button type="submit" disabled={!text.trim() || sending} aria-label={editing ? t('Сактоо') : t('Жөнөтүү')} className="w-12 h-12 rounded-full inline-flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-35" style={{ backgroundColor: 'var(--gold)', color: 'var(--page-plane)' }}>
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : editing ? <Check className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
                        </button>
                    </form>
                </div>
            )}
            {person === null && list !== undefined && <p className="max-w-[42rem] mx-auto text-[0.85rem] italic" style={{ color: 'var(--text-muted)' }}>{t('Бул адамга жеке кат жазууга болбойт.')}</p>}
        </AppFrame>
    );
};
