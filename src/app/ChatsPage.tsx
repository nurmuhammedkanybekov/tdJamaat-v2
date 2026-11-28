// #/chat — the conversations open to whoever is here:
//   #/chat/all   — Жамааттын сөзү: every member, captain, CL and the admin;
//   #/chat/staff — Капитандар: the captains, CL and the admin;
// and each house's own conversation (Үйдүн сөзү, under Үйүм).
// The database says who wrote what (supabase/jamaat-chat-2026-11.sql).
import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChartNoAxesColumn, ChevronRight, Loader2, LogOut, MessageCircle, MessagesSquare, Pencil, Plus, Shield, Trash2, Users } from 'lucide-react';
import type { Theme } from '../theme';
import { t, dateLocale } from '../i18n';
import { AppFrame, Waiting } from './AppFrame';
import { AppContext } from './context';
import { useSelf } from './self';
import { go } from './route';
import { Reactions } from './Reactions';
import { Acts, ComposerBar, EditedMark, MessageText, Quote, type Editing, type Replying } from '../components/ChatEdit';
import { showMessage } from '../components/chatScroll';
import { canEditAt, editMessage } from '../services/editMessage';

import { DEFAULT_REACTION } from '../services/reactions';
import { Avatar } from '../components/Avatar';
import { Mark } from '../components/Ornament';
import type { Audience, ChatRoom, RoomMessage } from '../services/jamaatChatService';
import { fetchRoomLast, fetchGroupPeople, groupsReady, leaveGroup, closePoll, countRoomUnread, createRoom, deleteRoom, deleteRoomMessage, fetchRoom, fetchRooms, markRoomSeen, myUserId, pollsReady, sendPoll, sendToRoom, reactRoom, updateRoom, votePoll, watchRoom } from '../services/jamaatChatService';
import { PollCard, PollForm } from './PollCard';
import { GroupEditor } from './GroupEditor';
import { DmChat, DmSection } from './DirectMessages';
import { NotifyToggle } from './Community';
import { countUnread, fetchHouseLast } from '../services/chatService';
import { signInWithGoogle } from '../services/memberService';

const KY_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const dayLabel = (d: Date, now = new Date()) => {
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (a === b) return t('Бүгүн');
    if (b - a === 86400000) return t('Кечээ');
    return dateLocale() ? d.toLocaleDateString(dateLocale()!, { day: 'numeric', month: 'long' }) : `${d.getDate()}-${KY_MONTHS[d.getMonth()]}`;
};
const whenShort = (iso: string) => {
    const d = new Date(iso), now = new Date();
    if (d.toDateString() === now.toDateString()) return hm(d);
    if (now.getTime() - d.getTime() < 6 * 86400000) return dateLocale() ? d.toLocaleDateString(dateLocale()!, { weekday: 'short' }) : [t('Жш'), t('Дш'), t('Шш'), t('Шр'), t('Бш'), t('Жм'), t('Иш')][d.getDay()];
    return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const AUDIENCE: Record<Audience, () => string> = {
    all: () => t('Бүт жамаат: мүчөлөр, капитандар, CL жана админ.'),
    staff: () => t('Капитандар, CL жана админ гана көрөт. Мүчөлөр көрбөйт.'),
    custom: () => t('Тандалган адамдар гана көрөт.')
};

/** Who may be here: everyone signed in and linked may read 'all'; the staff also 'staff'. */
const useAccess = () => {
    const ctx = useContext(AppContext);
    const staff = ctx.signedIn && (ctx.role === 'admin' || ctx.role === 'leader' || ctx.role === 'inspector');
    const member = !ctx.signedIn && ctx.member?.status === 'linked';
    return { staff, member, all: staff || member, role: ctx.signedIn ? ctx.role : 'member', isAdmin: ctx.signedIn && ctx.role === 'admin' };
};

/** How an author is shown: the admin and CL have their own seals. */
const authorOf = (m: RoomMessage): { name: string; tag: string; seal: 'admin' | 'cl' | null } => {
    if (m.authorRole === 'admin') return { name: t('Админ'), tag: t('жамааттын админи'), seal: 'admin' };
    if (m.authorRole === 'inspector') return { name: 'CL', tag: t('Тазалык'), seal: 'cl' };
    if (m.authorRole === 'leader') return { name: m.authorName ?? t('{0} капитаны', m.houseName ?? ''), tag: `${t('капитан')}${m.houseName ? ` · ${m.houseName}` : ''}`, seal: null };
    return { name: m.authorName ?? t('Мүчө'), tag: m.houseName ?? '', seal: null };
};

const Seal: React.FC<{ kind: 'admin' | 'cl' }> = ({ kind }) => (
    kind === 'admin'
        ? <span className="chat-admin-seal" aria-hidden="true"><Mark size={20} /></span>
        : <span className="chat-cl-seal" aria-hidden="true">CL</span>
);

export const ChatsPage: React.FC<{ arg?: string | null; sub?: string | null; theme: Theme; onToggleTheme: () => void }> = ({ arg, sub, theme, onToggleTheme }) => {
    const access = useAccess();
    const [rooms, setRooms] = useState<ChatRoom[] | null>(null);
    const reload = useCallback(() => { if (access.all) fetchRooms(access.staff).then(setRooms).catch(() => setRooms([])); }, [access.all, access.staff]);
    useEffect(() => { reload(); }, [reload]);
    const room = arg && rooms ? rooms.find(r => r.id === arg) : undefined;
    if (arg === 'dm' && sub && access.all) return <DmChat key={sub} peer={sub} theme={theme} onToggleTheme={onToggleTheme} />;
    if (room) return <RoomChat key={room.id} room={room} theme={theme} onToggleTheme={onToggleTheme} />;
    return (
        <AppFrame page="chat" title={t('Чаттар')} kicker={t('Чат')} theme={theme} onToggleTheme={onToggleTheme}>
            {!access.all ? (
                <div className="max-w-[36rem] mx-auto text-center pt-8">
                    <p className="text-[1rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('Жамааттын чатына кирүү үчүн Google аккаунтуңуз менен кириңиз. Капитаныңыз Gmail дарегиңизди жазып койгон болушу керек.')}</p>
                    <button className="btn btn-primary mt-6" onClick={() => { signInWithGoogle('#/chat').catch(() => undefined); }}>{t('Google менен кирүү')}</button>
                </div>
            ) : rooms ? <ChatList rooms={rooms} onChanged={reload} /> : <Waiting />}
        </AppFrame>
    );
};

/** Every conversation open to whoever is here, with what is new; the admin
 *  opens, renames and closes conversations here. */
const ChatList: React.FC<{ rooms: ChatRoom[]; onChanged: () => void }> = ({ rooms, onChanged }) => {
    const access = useAccess();
    const { self } = useSelf();
    const ctx = useContext(AppContext);
    const houses = useMemo(() => { const w = ctx.data?.weeks[ctx.data.weeks.length - 1]; return (w?.teams ?? []).map(tm => ({ id: tm.id, name: tm.name })); }, [ctx.data]);
    const [unread, setUnread] = useState<Record<string, number>>({});
    const [last, setLast] = useState<Record<string, { body: string; createdAt: string; who?: string }>>({});
    const [editing, setEditing] = useState<ChatRoom | 'new' | 'group' | null>(null);
    const [me, setMe] = useState<string | null>(null);
    useEffect(() => { myUserId().then(setMe).catch(() => undefined); }, []);
    const canGroup = (access.isAdmin || access.role === 'leader') && groupsReady();
    const mayEdit = (r: ChatRoom) => (r.audience === 'custom' ? access.isAdmin || (!!me && r.createdBy === me) : access.isAdmin);
    useEffect(() => {
        rooms.forEach(r => countRoomUnread(r.id).then(n => setUnread(u => ({ ...u, [r.id]: n }))).catch(() => undefined));
        if (self) countUnread(self.houseId, self.memberId).then(n => setUnread(u => ({ ...u, 'house:': n }))).catch(() => undefined);
        rooms.forEach(r => fetchRoomLast(r.id).then(l => { if (l) setLast(x => ({ ...x, [r.id]: l })); }).catch(() => undefined));
        if (self) fetchHouseLast(self.houseId).then(l => { if (l) setLast(x => ({ ...x, 'house:': l })); }).catch(() => undefined);
    }, [rooms, self]);
    const rows: Array<{ key: string; to: string; title: string; sub: string; icon: React.ReactNode; tag: string; room?: ChatRoom }> = [
        ...rooms.map(r => ({ key: r.id, to: `#/chat/${r.id}`, title: r.name, sub: r.about || (r.audience === 'staff' ? t('Капитандар, CL жана админ') : r.audience === 'custom' ? t('Тандалган адамдар') : t('Бүт жамаат бир жерде')), icon: r.audience === 'staff' ? <Shield className="w-5 h-5" strokeWidth={1.5} /> : r.audience === 'custom' ? <MessagesSquare className="w-5 h-5" strokeWidth={1.5} /> : <Users className="w-5 h-5" strokeWidth={1.5} />, tag: r.audience === 'staff' ? t('Капитандарга') : r.audience === 'custom' ? t('Топ') : t('Баарына'), room: r })),
        ...(self ? [{ key: 'house:', to: '#/house/chat', title: t('Үйдүн чаты'), sub: self.houseName, icon: <MessageCircle className="w-5 h-5" strokeWidth={1.5} />, tag: t('Үйгө') }] : []),
        // The admin: every house's chat right here, one tap each (written as «Админ»).
        ...(access.isAdmin ? houses.map(h => ({ key: `house:${h.id}`, to: `#/house/chat/${h.id}`, title: h.name, sub: t('Үйдүн чаты'), icon: <MessageCircle className="w-5 h-5" strokeWidth={1.5} />, tag: t('Үй') })) : [])
    ];
    return (
        <div className="max-w-[40rem] mx-auto mt-6">
            <div className="flex items-center justify-between gap-3 pb-3" style={{ borderBottom: '1px solid var(--gold-dim)' }}>
                <NotifyToggle />
                <span className="flex flex-wrap gap-2 justify-end">
                    {canGroup && <button className="btn btn-ghost" style={{ minHeight: '2.4rem' }} onClick={() => setEditing(editing === 'group' ? null : 'group')}><MessagesSquare className="w-4 h-4" />{t('Жаңы топ')}</button>}
                    {access.isAdmin && <button className="btn btn-ghost" style={{ minHeight: '2.4rem' }} onClick={() => setEditing(editing === 'new' ? null : 'new')}><Plus className="w-4 h-4" />{t('Жаңы чат')}</button>}
                </span>
            </div>
            {editing === 'new' && <RoomEditor onDone={() => { setEditing(null); onChanged(); }} />}
            {editing === 'group' && <GroupEditor me={me} onDone={id => { setEditing(null); onChanged(); if (id) go(`#/chat/${id}`); }} />}
            <ul>
                {rows.map(r => {
                    const n = unread[r.key] ?? 0;
                    const l = last[r.key];
                    return (
                        <li key={r.key} style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-1">
                                <button onClick={() => go(r.to)} className="room-row flex-1 min-w-0" data-new={n > 0 || undefined}>
                                    <span className="room-seal" aria-hidden="true"><span>{r.title.slice(0, 1)}</span></span>
                                    <span className="flex-1 min-w-0">
                                        <span className="room-tag">{r.tag}{l && <span className="room-when tabular">{whenShort(l.createdAt)}</span>}</span>
                                        <span className="block font-display text-[1.55rem] sm:text-[1.75rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{r.title}</span>
                                        <span className="block text-[0.86rem] truncate" style={{ color: n > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{l ? `${l.who ? `${l.who === 'Админ' ? t('Админ') : l.who}: ` : ''}${l.body}` : r.sub}</span>
                                    </span>
                                    {n > 0
                                        ? <span className="room-new" aria-label={t('{0} жаңы билдирүү', n)}><span className="font-display tabular">{n > 99 ? '99+' : n}</span>{t('жаңы')}</span>
                                        : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--gold)' }} />}
                                </button>
                                {r.room && mayEdit(r.room) && (
                                    <button onClick={() => setEditing(editing && typeof editing === 'object' && editing.id === r.room!.id ? null : r.room!)} aria-label={t('Өзгөртүү: {0}', r.title)} className="w-10 h-10 inline-flex items-center justify-center flex-shrink-0 transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}><Pencil className="w-4 h-4" /></button>
                                )}
                            </div>
                            {editing && typeof editing === 'object' && r.room && editing.id === r.room.id && (r.room.audience === 'custom'
                                ? <GroupEditor room={r.room} me={me} onDone={() => { setEditing(null); onChanged(); }} />
                                : <RoomEditor room={r.room} onDone={() => { setEditing(null); onChanged(); }} />)}
                        </li>
                    );
                })}
            </ul>
            <DmSection />
        </div>
    );
};

/** The admin's form: a new conversation, or a change to one. */
const RoomEditor: React.FC<{ room?: ChatRoom; onDone: () => void }> = ({ room, onDone }) => {
    const [name, setName] = useState(room?.name ?? '');
    const [about, setAbout] = useState(room?.about ?? '');
    const [audience, setAudience] = useState<Audience>(room?.audience === 'staff' ? 'staff' : 'all');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const fixed = room?.id === 'all' || room?.id === 'staff';
    const save = async () => {
        if (!name.trim()) return;
        setBusy(true); setError('');
        const patch = { name: name.trim(), about: about.trim() || null, audience };
        try { if (room) await updateRoom(room.id, patch); else await createRoom(patch); onDone(); }
        catch (e) { setError(/relation|schema cache|does not exist/i.test(String((e as Error)?.message)) ? t('Жаңы чат ачуу үчүн supabase/jamaat-chat-2026-11.sql файлын кайра иштетүү керек.') : (e as Error)?.message ?? ''); }
        finally { setBusy(false); }
    };
    const remove = async () => {
        if (!room || !window.confirm(t('«{0}» жана анын бардык билдирүүлөрү өчөт. Улантасызбы?', room.name))) return;
        setBusy(true);
        try { await deleteRoom(room.id); onDone(); } catch (e) { setError((e as Error)?.message ?? ''); setBusy(false); }
    };
    return (
        <div className="room-editor pop-in">
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>{room ? t('Чатты өзгөртүү') : t('Жаңы чат')}</div>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder={t('Аталышы, мисалы: Рамазан')} aria-label={t('Аталышы')} className="room-editor-input font-display text-[1.3rem]" />
            <input value={about} onChange={e => setAbout(e.target.value)} maxLength={200} placeholder={t('Кыскача: эмне жөнүндө (милдеттүү эмес)')} aria-label={t('Кыскача')} className="room-editor-input text-[0.95rem]" />
            <div className="chip-row mt-3" role="radiogroup" aria-label={t('Ким көрөт')}>
                {(['all', 'staff'] as const).map(a => (
                    <button key={a} role="radio" aria-checked={audience === a} disabled={fixed} onClick={() => setAudience(a)} className={`chip ${audience === a ? 'is-active' : ''}`} style={{ marginRight: '1.4rem' }}>{a === 'all' ? t('Бүт жамаат') : t('Капитандар, CL, админ')}</button>
                ))}
            </div>
            {error && <p className="text-[0.82rem] mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
            <div className="flex flex-wrap items-center gap-3 mt-4">
                <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={save}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{room ? t('Сактоо') : t('Ачуу')}</button>
                <button className="btn btn-ghost" disabled={busy} onClick={onDone}>{t('Жокко чыгаруу')}</button>
                {room && !fixed && <button className="ml-auto text-[0.75rem] tracking-[0.14em] uppercase inline-flex items-center gap-1.5" disabled={busy} onClick={remove} style={{ color: 'var(--danger)' }}><Trash2 className="w-3.5 h-3.5" />{t('Чатты жабуу')}</button>}
            </div>
        </div>
    );
};

/** One shared conversation. */
const RoomChat: React.FC<{ room: ChatRoom; theme: Theme; onToggleTheme: () => void }> = ({ room: info, theme, onToggleTheme }) => {
    const room = info.id;
    const access = useAccess();
    const { self } = useSelf();
    const [me, setMe] = useState<string | null>(null);
    const [messages, setMessages] = useState<RoomMessage[] | null | undefined>(undefined);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [polling, setPolling] = useState(false);
    const input = useRef<HTMLTextAreaElement>(null);
    const stick = useRef(true);
    useEffect(() => { myUserId().then(setMe).catch(() => undefined); }, []);

    const load = useCallback(() => {
        fetchRoom(room).then(m => { setMessages(m); markRoomSeen(room); }).catch(() => setMessages(null));
    }, [room]);
    const pending = useRef(0);
    useEffect(() => { load(); return watchRoom(room, () => { if (!pending.current) load(); }); }, [load, room]);

    // Follow the newest message unless the reader scrolled up; then a button
    // brings them back and counts what came meanwhile.
    const [away, setAway] = useState(false);
    const [fresh, setFresh] = useState(0);
    const seenCount = useRef(0);
    useEffect(() => {
        const onScroll = () => {
            stick.current = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 160;
            setAway(!stick.current);
            if (stick.current) setFresh(0);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    useLayoutEffect(() => {
        const n = messages?.length ?? 0;
        if (stick.current) window.scrollTo(0, document.documentElement.scrollHeight);
        else if (n > seenCount.current) setFresh(f => f + n - seenCount.current);
        seenCount.current = n;
    }, [messages]);
    useLayoutEffect(() => {
        const el = input.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, [text]);

    const [editing, setEditing] = useState<Editing | null>(null);
    const [replying, setReplying] = useState<Replying | null>(null);
    const [sel, setSel] = useState<number | null>(null);
    const startEdit = (m: RoomMessage) => { setPolling(false); setReplying(null); setSel(null); setEditing({ id: m.id, body: m.body }); setText(m.body); window.setTimeout(() => input.current?.focus(), 0); };
    const stopEdit = () => { if (editing) setText(''); setEditing(null); setReplying(null); };
    const whoName = (m: RoomMessage) => (me && m.userId === me ? t('Сиз') : authorOf(m).name);
    const startReply = (m: RoomMessage) => { setPolling(false); setEditing(null); setSel(null); setReplying({ id: m.id, who: whoName(m), body: m.body }); window.setTimeout(() => input.current?.focus(), 0); };
    const send = async () => {
        const clean = text.trim();
        if (!clean || sending) return;
        if (editing) {
            if (clean === editing.body) { stopEdit(); return; }
            setSending(true); setError('');
            const id = editing.id;
            setMessages(cur => cur?.map(x => (x.id === id ? { ...x, body: clean, editedAt: new Date().toISOString() } : x)));
            try { await editMessage('room', id, clean); stopEdit(); } catch (e) { setError((e as Error)?.message ?? ''); load(); }
            finally { setSending(false); }
            return;
        }
        setSending(true); setError('');
        // A captain signs as the person of their house they chose ("Мен").
        try { await sendToRoom(room, clean, access.role === 'leader' && self?.via === 'staff' ? self.memberId : null, replying?.id ?? null); setText(''); setReplying(null); stick.current = true; load(); input.current?.focus(); }
        catch (e) { const msg = (e as Error)?.message ?? ''; setError(/relation|does not exist|schema cache|row-level security/i.test(msg) ? t('Бул чат азырынча ачыла элек. Админ supabase/jamaat-chat-2026-11.sql файлын иштетиши керек.') : msg || t('Жөнөтүлгөн жок')); }
        finally { setSending(false); }
    };
    const react = async (m: RoomMessage, emoji: string | null) => {
        if (!me) return;
        setMessages(cur => cur?.map(x => (x.id === m.id ? { ...x, reactions: [...x.reactions.filter(r => r.who !== me), ...(emoji ? [{ who: me, emoji }] : [])] } : x)));
        pending.current++;
        try { await reactRoom(m.id, me, emoji); } catch { /* the reload shows what is stored */ }
        finally { pending.current--; if (!pending.current) load(); }
    };
    const vote = async (m: RoomMessage, option: number, on: boolean) => {
        if (!me || !m.poll) return;
        // At once on the screen; the database has the last word.
        setMessages(cur => cur?.map(x => {
            if (x.id !== m.id || !x.poll) return x;
            let votes = x.poll.votes.filter(v => !(v.who === me && (v.option === option || (!x.poll!.multi && on))));
            if (on) votes = [...votes, { who: me, option }];
            return { ...x, poll: { ...x.poll, votes } };
        }));
        pending.current++;
        try { await votePoll(m.id, option, on, me); } catch (e) { setError((e as Error)?.message ?? ''); }
        finally { pending.current--; if (!pending.current) load(); }
    };
    const sendAPoll = async (q: string, options: string[], multi: boolean) => {
        setError('');
        try { await sendPoll(room, q, options, multi, access.role === 'leader' && self?.via === 'staff' ? self.memberId : null); setPolling(false); stick.current = true; load(); }
        catch (e) { setError((e as Error)?.message ?? t('Жөнөтүлгөн жок')); }
    };
    const remove = async (m: RoomMessage) => {
        if (!window.confirm(t('Бул билдирүүнү өчүрөсүзбү?'))) return;
        try { await deleteRoomMessage(m.id); load(); } catch (e) { setError((e as Error)?.message ?? ''); }
    };

    return (
        <AppFrame page="chat" title={info.name} back="#/chat" theme={theme} onToggleTheme={onToggleTheme} ownBar>
            <div className="max-w-[42rem] mx-auto pt-2 pb-6">
                <header className="text-center pt-2 pb-1">
                    <Mark size={30} className="mx-auto" style={{ color: 'var(--gold)' }} />
                    <div className="eyebrow mt-2" style={{ color: 'var(--gold)' }}>{info.audience === 'staff' ? t('Жабык чат') : info.audience === 'custom' ? t('Топ') : t('Жалпы чат')}</div>
                    <h1 className="font-display text-[1.65rem] sm:text-[2rem] leading-tight mt-0.5" style={{ color: 'var(--text-primary)' }}>{info.name}</h1>
                    <p className="text-[0.8rem] mt-1" style={{ color: 'var(--text-muted)' }}>{info.about || AUDIENCE[info.audience]()}</p>
                    {info.audience === 'custom' && <GroupLine room={info} me={me} />}
                    <div className="mt-2"><NotifyToggle /></div>
                </header>

                {messages === undefined && <Waiting />}
                {messages === null && (
                    <p className="mt-8 px-4 py-3 text-[0.9rem]" style={{ borderLeft: '2px solid var(--gold)', color: 'var(--text-secondary)' }}>{t('Бул чат азырынча ачыла элек. Админ supabase/jamaat-chat-2026-11.sql файлын иштетиши керек.')}</p>
                )}
                {messages && messages.length === 0 && (
                    <p className="text-center font-display text-[1.4rem] pt-10" style={{ color: 'var(--text-primary)' }}>{t('Биринчи билдирүү сизден болсун')}</p>
                )}

                {messages && messages.map((m, i) => {
                    const at = new Date(m.createdAt);
                    const prev = messages[i - 1];
                    const newDay = !prev || new Date(prev.createdAt).toDateString() !== at.toDateString();
                    const sameRun = !newDay && prev && prev.userId === m.userId && prev.memberId === m.memberId && at.getTime() - new Date(prev.createdAt).getTime() < 5 * 60000;
                    const mine = !!me && m.userId === me;
                    const who = authorOf(m);
                    return (
                        <React.Fragment key={m.id}>
                            {newDay && <div className="chat-day"><span>{dayLabel(at)}</span></div>}
                            <div id={`m-${m.id}`} data-sel={sel === m.id || undefined} onClick={() => setSel(s => (s === m.id ? null : m.id))} className={`chat-row ${mine ? 'is-mine' : ''} ${sameRun ? 'is-run' : ''} ${who.seal === 'admin' ? 'is-admin' : ''}`}>
                                {!mine && <div className="w-9 flex-shrink-0">{!sameRun && (who.seal ? <Seal kind={who.seal} /> : <Avatar name={who.name} role={m.authorRole === 'leader' ? 'imam' : 'member'} photoUrl={null} size="sm" />)}</div>}
                                <div className="chat-body">
                                    {!sameRun && !mine && (
                                        <div className={`chat-name ${who.seal === 'admin' ? 'is-admin' : ''}`}>{who.name}{who.tag && <span className="chat-tag">{who.tag}</span>}</div>
                                    )}
                                    {m.poll
                                        ? <div className="chat-bubble is-poll"><PollCard question={m.body} poll={m.poll} me={me} canClose={mine || access.isAdmin} onVote={(o, on) => vote(m, o, on)} onClose={() => { closePoll(m.id).then(load).catch(e => setError((e as Error)?.message ?? '')); }} /></div>
                                        : <div className="chat-bubble" onDoubleClick={() => { if (me && !m.reactions.some(r => r.who === me && r.emoji === DEFAULT_REACTION)) react(m, DEFAULT_REACTION); }}>
                                            {m.replyTo && (() => { const q = messages.find(x => x.id === m.replyTo); return <Quote who={q ? whoName(q) : null} body={q?.body ?? null} onClick={q ? () => showMessage(q.id) : undefined} />; })()}
                                            <MessageText text={m.body} />
                                        <span className="chat-stamp"><EditedMark at={m.editedAt} /><span className="tabular">{hm(at)}</span></span>
                                        </div>}
                                    <Reactions list={m.reactions} me={me} disabled={!me} onPick={e => react(m, e)} align={mine ? 'end' : 'start'} />
                                    <div className="chat-meta">
                                        {m.poll && <span className="tabular">{hm(at)}</span>}
                                        <Acts text={m.body} onReply={() => startReply(m)} onEdit={mine && !m.poll && canEditAt(m.createdAt) ? () => startEdit(m) : undefined} onDelete={mine || access.isAdmin ? () => remove(m) : undefined} />
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {messages !== null && (
                <div className="fixed left-0 right-0 bottom-0 z-30 page-gutter" style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))', paddingTop: '0.6rem', backgroundColor: 'color-mix(in oklab, var(--page-plane) 94%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}>
                    {away && (
                        <button onClick={() => { setFresh(0); window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); }} aria-label={t('Акыркы билдирүүлөргө')} className="absolute right-4 sm:right-8 -top-14 h-10 min-w-10 px-3 inline-flex items-center justify-center gap-1.5 rounded-full pop-in"
                            style={{ backgroundColor: 'var(--page-plane)', border: `1px solid ${fresh ? 'var(--gold)' : 'var(--border-strong)'}`, color: fresh ? 'var(--gold)' : 'var(--text-secondary)', boxShadow: '0 6px 18px -10px rgba(0,0,0,0.35)' }}>
                            {fresh > 0 && <span className="text-[0.8rem] tabular">{t('{0} жаңы', fresh)}</span>}
                            <ArrowDown className="w-4 h-4" />
                        </button>
                    )}
                    {error && <p className="max-w-[42rem] mx-auto text-[0.82rem] mb-2" style={{ color: 'var(--danger)' }}>{error}</p>}
                    {!polling && <ComposerBar editing={editing} replying={replying} onCancel={stopEdit} />}
                    {polling ? <PollForm onSend={sendAPoll} onCancel={() => setPolling(false)} /> : (
                    <form className="chat-compose max-w-[42rem] mx-auto flex items-end gap-2" onSubmit={e => { e.preventDefault(); send(); }}>
                        {pollsReady() && !editing && <button type="button" onClick={() => setPolling(true)} aria-label={t('Сурамжылоо')} title={t('Сурамжылоо')} className="w-11 h-12 inline-flex items-center justify-center flex-shrink-0 transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}><ChartNoAxesColumn className="w-5 h-5" /></button>}
                        <textarea
                            ref={input} rows={1} value={text} maxLength={2000}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Escape' && (editing || replying)) stopEdit(); if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); send(); } }}
                            placeholder={access.isAdmin ? t('Админ катары жазуу…') : t('{0}: жазуу…', info.name)} aria-label={t('Билдирүү')}
                            className="login-field flex-1 min-w-0 resize-none px-3.5 py-3 text-base leading-snug"
                            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        />
                        <button type="submit" disabled={!text.trim() || sending} aria-label={editing ? t('Сактоо') : t('Жөнөтүү')} className="w-12 h-12 rounded-full inline-flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-35" style={{ backgroundColor: 'var(--gold)', color: 'var(--page-plane)' }}>
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : editing ? <Check className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
                        </button>
                    </form>
                    )}
                </div>
            )}
        </AppFrame>
    );
};

/** In a group: how many are in it, and the way out for those who did not make it. */
const GroupLine: React.FC<{ room: ChatRoom; me: string | null }> = ({ room, me }) => {
    const [n, setN] = useState<number | null>(null);
    useEffect(() => { fetchGroupPeople(room.id).then(l => setN(l.length)).catch(() => undefined); }, [room.id]);
    const leave = async () => {
        if (!window.confirm(t('«{0}» тобунан чыгасызбы? Кайра кошулуу үчүн аны ачкан адам кошушу керек.', room.name))) return;
        try { await leaveGroup(room.id); go('#/chat'); window.location.reload(); } catch { /* stays */ }
    };
    return (
        <div className="group-line">
            {n !== null && <span className="tabular">{t('{0} адам', n)}</span>}
            {me && room.createdBy !== me && <button onClick={leave}><LogOut className="w-3.5 h-3.5" />{t('Топтон чыгуу')}</button>}
        </div>
    );
};
