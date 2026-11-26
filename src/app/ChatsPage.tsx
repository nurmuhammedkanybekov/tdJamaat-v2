// #/chat — the conversations open to whoever is here:
//   #/chat/all   — Жамааттын сөзү: every member, captain, CL and the admin;
//   #/chat/staff — Капитандар: the captains, CL and the admin;
// and each house's own conversation (Үйдүн сөзү, under Үйүм).
// The database says who wrote what (supabase/jamaat-chat-2026-11.sql).
import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Loader2, MessageCircle, Shield, Trash2, Users } from 'lucide-react';
import type { Theme } from '../theme';
import { isEnglish, t } from '../i18n';
import { AppFrame, Waiting } from './AppFrame';
import { AppContext } from './context';
import { useSelf } from './self';
import { go } from './route';
import { Avatar } from '../components/Avatar';
import { HornBand } from '../components/motion';
import { Mark } from '../components/Ornament';
import type { Room, RoomMessage } from '../services/jamaatChatService';
import { countRoomUnread, deleteRoomMessage, fetchRoom, markRoomSeen, myUserId, sendToRoom, setRoomAmin, watchRoom } from '../services/jamaatChatService';
import { countUnread } from '../services/chatService';
import { signInWithGoogle } from '../services/memberService';

const KY_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const dayLabel = (d: Date, now = new Date()) => {
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (a === b) return t('Бүгүн');
    if (b - a === 86400000) return t('Кечээ');
    return isEnglish() ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : `${d.getDate()}-${KY_MONTHS[d.getMonth()]}`;
};
const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const ROOM: Record<Room, { title: () => string; about: () => string; placeholder: () => string }> = {
    all: { title: () => t('Жамааттын сөзү'), about: () => t('Бүт жамаат: мүчөлөр, капитандар, CL жана админ.'), placeholder: () => t('Жамаатка жазуу…') },
    staff: { title: () => t('Капитандар'), about: () => t('Капитандар, CL жана админ гана көрөт. Мүчөлөр көрбөйт.'), placeholder: () => t('Капитандарга жазуу…') }
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

export const ChatsPage: React.FC<{ arg?: string | null; theme: Theme; onToggleTheme: () => void }> = ({ arg, theme, onToggleTheme }) => {
    const access = useAccess();
    if (arg === 'all' && access.all) return <RoomChat room="all" theme={theme} onToggleTheme={onToggleTheme} />;
    if (arg === 'staff' && access.staff) return <RoomChat room="staff" theme={theme} onToggleTheme={onToggleTheme} />;
    return (
        <AppFrame page="today" title={t('Баарлашуу')} kicker={t('Сөз')} theme={theme} onToggleTheme={onToggleTheme}>
            {access.all ? <ChatList /> : (
                <div className="max-w-[36rem] mx-auto text-center pt-8">
                    <p className="text-[1rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('Жамааттын сөзүнө кирүү үчүн Google аккаунтуңуз менен кириңиз. Капитаныңыз Gmail дарегиңизди жазып койгон болушу керек.')}</p>
                    <button className="btn btn-primary mt-6" onClick={() => { signInWithGoogle('#/chat').catch(() => undefined); }}>{t('Google менен кирүү')}</button>
                </div>
            )}
        </AppFrame>
    );
};

/** Every conversation open to whoever is here, with what is new. */
const ChatList: React.FC = () => {
    const access = useAccess();
    const { self } = useSelf();
    const [unread, setUnread] = useState<Record<string, number>>({});
    useEffect(() => {
        countRoomUnread('all').then(n => setUnread(u => ({ ...u, all: n }))).catch(() => undefined);
        if (access.staff) countRoomUnread('staff').then(n => setUnread(u => ({ ...u, staff: n }))).catch(() => undefined);
        if (self) countUnread(self.houseId, self.memberId).then(n => setUnread(u => ({ ...u, house: n }))).catch(() => undefined);
    }, [access.staff, self]);
    const rows: Array<{ key: string; to: string; title: string; sub: string; icon: React.ReactNode }> = [
        { key: 'all', to: '#/chat/all', title: t('Жамааттын сөзү'), sub: t('Бүт жамаат бир жерде'), icon: <Users className="w-5 h-5" strokeWidth={1.5} /> },
        ...(access.staff ? [{ key: 'staff', to: '#/chat/staff', title: t('Капитандар'), sub: t('Капитандар, CL жана админ'), icon: <Shield className="w-5 h-5" strokeWidth={1.5} /> }] : []),
        ...(self ? [{ key: 'house', to: '#/house/chat', title: t('Үйдүн сөзү'), sub: self.houseName, icon: <MessageCircle className="w-5 h-5" strokeWidth={1.5} /> }] : []),
        ...(access.isAdmin ? [{ key: 'houses', to: '#/house', title: t('Үйлөрдүн сөзү'), sub: t('Ар бир үйгө «Админ» катары'), icon: <MessageCircle className="w-5 h-5" strokeWidth={1.5} /> }] : [])
    ];
    return (
        <ul className="max-w-[40rem] mx-auto mt-6" style={{ borderTop: '1px solid var(--gold-dim)' }}>
            {rows.map(r => {
                const n = unread[r.key] ?? 0;
                return (
                    <li key={r.key} style={{ borderBottom: '1px solid var(--border)' }}>
                        <button onClick={() => go(r.to)} className="row-link w-full text-left py-4 px-1 flex items-center gap-4">
                            <span className="w-11 h-11 rounded-full inline-flex items-center justify-center flex-shrink-0 relative" style={{ border: '1px solid var(--gold)', color: 'var(--gold)' }}>
                                {r.icon}
                                {n > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full text-[0.7rem] font-semibold inline-flex items-center justify-center" style={{ backgroundColor: 'var(--gold)', color: 'var(--page-plane)' }}>{n > 99 ? '99+' : n}</span>}
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="block font-display text-[1.4rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{r.title}</span>
                                <span className="block text-[0.85rem]" style={{ color: n ? 'var(--gold)' : 'var(--text-muted)' }}>{n ? t('{0} жаңы билдирүү', n) : r.sub}</span>
                            </span>
                            <ChevronRight className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};

/** One shared conversation. */
const RoomChat: React.FC<{ room: Room; theme: Theme; onToggleTheme: () => void }> = ({ room, theme, onToggleTheme }) => {
    const access = useAccess();
    const { self } = useSelf();
    const [me, setMe] = useState<string | null>(null);
    const [messages, setMessages] = useState<RoomMessage[] | null | undefined>(undefined);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const input = useRef<HTMLTextAreaElement>(null);
    const stick = useRef(true);
    useEffect(() => { myUserId().then(setMe).catch(() => undefined); }, []);

    const load = useCallback(() => {
        fetchRoom(room).then(m => { setMessages(m); markRoomSeen(room); }).catch(() => setMessages(null));
    }, [room]);
    useEffect(() => { load(); return watchRoom(room, load); }, [load, room]);

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

    const send = async () => {
        const clean = text.trim();
        if (!clean || sending) return;
        setSending(true); setError('');
        // A captain signs as the person of their house they chose ("Мен").
        try { await sendToRoom(room, clean, access.role === 'leader' && self?.via === 'staff' ? self.memberId : null); setText(''); stick.current = true; load(); input.current?.focus(); }
        catch (e) { const msg = (e as Error)?.message ?? ''; setError(/relation|does not exist|schema cache|row-level security/i.test(msg) ? t('Бул сөз азырынча ачыла элек — админ supabase/jamaat-chat-2026-11.sql файлын иштетиши керек.') : msg || t('Жөнөтүлгөн жок')); }
        finally { setSending(false); }
    };
    const amin = async (m: RoomMessage) => {
        if (!me) return;
        const on = !m.amins.includes(me);
        setMessages(cur => cur?.map(x => (x.id === m.id ? { ...x, amins: on ? [...x.amins, me] : x.amins.filter(a => a !== me) } : x)));
        try { await setRoomAmin(m.id, me, on); } catch { load(); }
    };
    const remove = async (m: RoomMessage) => {
        if (!window.confirm(t('Бул билдирүүнү өчүрөсүзбү?'))) return;
        try { await deleteRoomMessage(m.id); load(); } catch (e) { setError((e as Error)?.message ?? ''); }
    };

    const info = ROOM[room];
    return (
        <AppFrame page="today" title={info.title()} back="#/chat" theme={theme} onToggleTheme={onToggleTheme} ownBar>
            <div className="max-w-[42rem] mx-auto pt-2 pb-6">
                <header className="text-center pt-4 pb-2">
                    <Mark size={44} className="mx-auto" style={{ color: 'var(--gold)' }} />
                    <div className="eyebrow mt-3" style={{ color: 'var(--gold)' }}>{room === 'staff' ? t('Жабык сөз') : t('Жалпы сөз')}</div>
                    <h1 className="font-display text-[2rem] leading-tight mt-1" style={{ color: 'var(--text-primary)' }}>{info.title()}</h1>
                    <p className="text-[0.8rem] mt-1" style={{ color: 'var(--text-muted)' }}>{info.about()}</p>
                    <HornBand className="mt-3" />
                </header>

                {messages === undefined && <Waiting />}
                {messages === null && (
                    <p className="mt-8 px-4 py-3 text-[0.9rem]" style={{ borderLeft: '2px solid var(--gold)', color: 'var(--text-secondary)' }}>{t('Бул сөз азырынча ачыла элек — админ supabase/jamaat-chat-2026-11.sql файлын иштетиши керек.')}</p>
                )}
                {messages && messages.length === 0 && (
                    <p className="text-center font-display text-[1.4rem] pt-10" style={{ color: 'var(--text-primary)' }}>{t('Биринчи сөз сизден болсун')}</p>
                )}

                {messages && messages.map((m, i) => {
                    const at = new Date(m.createdAt);
                    const prev = messages[i - 1];
                    const newDay = !prev || new Date(prev.createdAt).toDateString() !== at.toDateString();
                    const sameRun = !newDay && prev && prev.userId === m.userId && prev.memberId === m.memberId && at.getTime() - new Date(prev.createdAt).getTime() < 5 * 60000;
                    const mine = !!me && m.userId === me;
                    const who = authorOf(m);
                    const said = !!me && m.amins.includes(me);
                    return (
                        <React.Fragment key={m.id}>
                            {newDay && <div className="chat-day"><span>{dayLabel(at)}</span></div>}
                            <div className={`chat-row ${mine ? 'is-mine' : ''} ${sameRun ? 'is-run' : ''} ${who.seal === 'admin' ? 'is-admin' : ''}`}>
                                {!mine && <div className="w-9 flex-shrink-0">{!sameRun && (who.seal ? <Seal kind={who.seal} /> : <Avatar name={who.name} role={m.authorRole === 'leader' ? 'imam' : 'member'} photoUrl={null} size="sm" />)}</div>}
                                <div className="chat-body">
                                    {!sameRun && (
                                        <div className={`chat-name ${who.seal === 'admin' ? 'is-admin' : ''} ${mine ? 'justify-end' : ''}`}>{mine ? t('Сиз') : who.name}{!mine && who.tag && <span className="chat-tag">{who.tag}</span>}</div>
                                    )}
                                    <div className="chat-bubble">{m.body}</div>
                                    <div className="chat-meta">
                                        <span className="tabular">{hm(at)}</span>
                                        <button onClick={() => amin(m)} aria-pressed={said} className={`chat-amin ${said ? 'is-on' : ''}`} aria-label={t('Аамин')}>
                                            {t('Аамин')}{m.amins.length > 0 && <span className="tabular"> · {m.amins.length}</span>}
                                        </button>
                                        {(mine || access.isAdmin) && <button onClick={() => remove(m)} aria-label={t('Өчүрүү')} className="chat-delete"><Trash2 className="w-3.5 h-3.5" /></button>}
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
                    <form className="max-w-[42rem] mx-auto flex items-end gap-2" onSubmit={e => { e.preventDefault(); send(); }}>
                        <textarea
                            ref={input} rows={1} value={text} maxLength={2000}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); send(); } }}
                            placeholder={access.isAdmin ? t('Админ катары жазуу…') : info.placeholder()} aria-label={t('Билдирүү')}
                            className="login-field flex-1 min-w-0 resize-none px-3.5 py-3 text-base leading-snug"
                            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        />
                        <button type="submit" disabled={!text.trim() || sending} aria-label={t('Жөнөтүү')} className="w-12 h-12 rounded-full inline-flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-35" style={{ backgroundColor: 'var(--gold)', color: 'var(--page-plane)' }}>
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
                        </button>
                    </form>
                </div>
            )}
        </AppFrame>
    );
};
