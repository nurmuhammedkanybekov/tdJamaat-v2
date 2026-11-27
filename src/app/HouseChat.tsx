// Үйдүн сөзү — the house's own conversation. Only the people of the house,
// its captain and the admin can read it (supabase/house-chat-2026-11.sql).
// Messages arrive at once; a message can be answered with "Аамин".
import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Trash2 } from 'lucide-react';
import type { Theme } from '../theme';
import { t, dateLocale } from '../i18n';
import { AppFrame, Waiting } from './AppFrame';
import { Avatar } from '../components/Avatar';
import { HornBand } from '../components/motion';
import { Mark } from '../components/Ornament';
import type { ChatMessage } from '../services/chatService';
import { deleteMessage, fetchMessages, markSeen, reactHouse, sendMessage, watchHouse } from '../services/chatService';
import { Reactions } from './Reactions';
import { DEFAULT_REACTION } from '../services/reactions';
import type { Self } from './self';
import { useMemberData } from './memberData';
import { GoalBanner, NotifyToggle } from './Community';
import { AppContext } from './context';

const KY_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const dayLabel = (d: Date, now = new Date()) => {
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (a === b) return t('Бүгүн');
    if (b - a === 86400000) return t('Кечээ');
    return dateLocale() ? d.toLocaleDateString(dateLocale()!, { day: 'numeric', month: 'long' }) : `${d.getDate()}-${KY_MONTHS[d.getMonth()]}`;
};
const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Ways to begin, for an empty conversation. */
const STARTERS = [
    () => t('Ассалому алейкум!'),
    () => t('Бүгүнкү тасбихатты окудум, алхамдулиллах.'),
    () => t('Дуба кылып коюңуздар.'),
    () => t('Ушул аптанын планын бирге аткаралы!')
];

/** The admin's mark in the conversation: the jamaat's seal instead of a face. */
const AdminSeal: React.FC = () => (
    <span className="chat-admin-seal" aria-hidden="true"><Mark size={20} /></span>
);

export const HouseChat: React.FC<{ self: Self; canModerate: boolean; theme: Theme; onToggleTheme: () => void; back?: string }> = ({ self, canModerate, theme, onToggleTheme, back = '#/house' }) => {
    const { data } = useMemberData();
    // The admin's account speaks as "Админ", its own voice, not as the person
    // the admin is on the site (the database marks every admin message).
    const ctx = useContext(AppContext);
    const asAdmin = ctx.signedIn && ctx.role === 'admin';
    const week = data?.weeks.length ? data.weeks[data.weeks.length - 1].globalWeek : null;
    const [messages, setMessages] = useState<ChatMessage[] | null | undefined>(undefined);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const list = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    const stick = useRef(true);

    // Names and photos of the house's people (and anyone who wrote before moving).
    // The last known list is kept on the phone, so faces show at once on the
    // next visit instead of after the whole results file has loaded.
    type Person = { name: string; photoUrl: string | null; role: 'imam' | 'zam' | 'member' };
    const peopleKey = `tdjamaat-chat-people-${self.houseId}`;
    const people = useMemo(() => {
        const map = new Map<string, Person>();
        if (!data) {
            try { for (const [id, p] of JSON.parse(localStorage.getItem(peopleKey) ?? '[]') as Array<[string, Person]>) map.set(id, p); } catch { /* none kept */ }
            return map;
        }
        for (const w of data.weeks) for (const tm of w.teams) for (const m of tm.members) map.set(m.id, { name: m.name, photoUrl: m.photoUrl, role: m.role });
        try { localStorage.setItem(peopleKey, JSON.stringify([...map])); } catch { /* not critical */ }
        return map;
    }, [data, peopleKey]);

    const load = useCallback(() => {
        fetchMessages(self.houseId).then(m => { setMessages(m); markSeen(self.houseId); }).catch(() => setMessages(null));
    }, [self.houseId]);
    const pending = useRef(0);
    useEffect(() => { load(); return watchHouse(self.houseId, () => { if (!pending.current) load(); }); }, [load, self.houseId]);

    // Follow the newest message — unless the reader has scrolled up to read.
    // Scrolled up, a button brings the reader back down and counts what came meanwhile.
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
    const toNewest = () => { setFresh(0); window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); };

    const send = async (body = text) => {
        const clean = body.trim();
        if (!clean || sending) return;
        setSending(true); setError('');
        try { await sendMessage(self.houseId, asAdmin ? null : self.memberId, clean); setText(''); stick.current = true; load(); input.current?.focus(); }
        catch (e) { const msg = (e as Error)?.message ?? ''; setError(asAdmin && /row-level security|violates|null value/i.test(msg) ? t('«Админ» катары жазуу үчүн supabase/admin-chat-2026-11.sql файлын иштетүү керек.') : msg || t('Жөнөтүлгөн жок')); }
        finally { setSending(false); }
    };
    // One reaction per person: at once on screen, the database a moment later.
    const react = async (m: ChatMessage, emoji: string | null) => {
        if (asAdmin) return;
        setMessages(cur => cur?.map(x => (x.id === m.id ? { ...x, reactions: [...x.reactions.filter(r => r.who !== self.memberId), ...(emoji ? [{ who: self.memberId, emoji }] : [])] } : x)));
        pending.current++;
        try { await reactHouse(m.id, self.memberId, emoji); } catch { /* the reload below shows what is stored */ }
        finally { pending.current--; if (!pending.current) load(); }
    };
    const remove = async (m: ChatMessage) => {
        if (!window.confirm(t('Бул билдирүүнү өчүрөсүзбү?'))) return;
        setMessages(cur => cur?.filter(x => x.id !== m.id));
        try { await deleteMessage(m.id); } catch { load(); }
    };

    // Grow the box with the text, up to a few lines.
    useLayoutEffect(() => {
        const el = input.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, [text]);

    return (
        <AppFrame page="house" title={self.memberId ? t('Үйдүн чаты') : self.houseName} back={back} theme={theme} onToggleTheme={onToggleTheme} ownBar>
            <div ref={list} className="max-w-[42rem] mx-auto pt-2 pb-6">
                <header className="text-center pt-4 pb-2">
                    <Mark size={44} className="mx-auto" style={{ color: 'var(--gold)' }} />
                    <div className="eyebrow mt-3" style={{ color: 'var(--gold)' }}>{t('Үйдүн чаты')}</div>
                    <h1 className="font-display text-[2rem] leading-tight mt-1" style={{ color: 'var(--text-primary)' }}>{self.houseName}</h1>
                    <p className="text-[0.8rem] mt-1" style={{ color: 'var(--text-muted)' }}>{asAdmin ? t('Бул жерде «Админ» болуп жазасыз. Билдирүүлөрдү өчүрө аласыз.') : t('Үйдүн адамдары, капитан жана админ гана көрөт.')}</p>
                    <div className="mt-2"><NotifyToggle /></div>
                    <HornBand className="mt-3" />
                </header>
                <GoalBanner houseId={self.houseId} week={week} canEdit={canModerate} />

                {messages === undefined && <Waiting />}
                {messages === null && (
                    <p className="mt-8 px-4 py-3 text-[0.9rem]" style={{ borderLeft: '2px solid var(--gold)', color: 'var(--text-secondary)' }}>{t('Үйдүн чаты азырынча ачыла элек. Админ supabase/house-chat-2026-11.sql файлын иштетиши керек.')}</p>
                )}
                {messages && messages.length === 0 && (
                    <div className="text-center pt-10">
                        <p className="font-display text-[1.4rem]" style={{ color: 'var(--text-primary)' }}>{t('Биринчи билдирүү сизден болсун')}</p>
                        <div className="flex flex-wrap justify-center gap-2 mt-5">
                            {STARTERS.map((s, i) => <button key={i} onClick={() => send(s())} className="px-3 py-2 text-[0.88rem] transition-colors hover:text-[var(--gold)]" style={{ border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}>{s()}</button>)}
                        </div>
                    </div>
                )}

                {messages && messages.map((m, i) => {
                    const at = new Date(m.createdAt);
                    const prev = messages[i - 1];
                    const newDay = !prev || new Date(prev.createdAt).toDateString() !== at.toDateString();
                    // Messages close together from one person read as one.
                    const byAdmin = m.authorRole === 'admin';
                    const sameRun = !newDay && prev && prev.memberId === m.memberId && (prev.authorRole === 'admin') === byAdmin && at.getTime() - new Date(prev.createdAt).getTime() < 5 * 60000;
                    const mine = asAdmin ? byAdmin : m.memberId === self.memberId && !byAdmin;
                    const who = byAdmin || !m.memberId ? null : people.get(m.memberId);
                    return (
                        <React.Fragment key={m.id}>
                            {newDay && <div className="chat-day"><span>{dayLabel(at)}</span></div>}
                            <div className={`chat-row ${mine ? 'is-mine' : ''} ${sameRun ? 'is-run' : ''} ${byAdmin ? 'is-admin' : ''}`}>
                                {!mine && <div className="w-9 flex-shrink-0">{!sameRun && (byAdmin ? <AdminSeal /> : <Avatar name={who?.name ?? '?'} role={who?.role ?? 'member'} photoUrl={who?.photoUrl ?? null} size="sm" />)}</div>}
                                <div className="chat-body">
                                    {!mine && !sameRun && (
                                        byAdmin
                                            ? <div className="chat-name is-admin">{t('Админ')}<span className="chat-tag">{t('жамааттын админи')}</span></div>
                                            : <div className="chat-name">{who?.name ?? t('Мүчө')}{m.authorRole === 'leader' && <span className="chat-tag">{t('капитан')}</span>}</div>
                                    )}
                                    {mine && byAdmin && !sameRun && <div className="chat-name is-admin justify-end">{t('Админ')}</div>}
                                    <div className="chat-bubble" onDoubleClick={() => { if (!asAdmin && !m.reactions.some(r => r.who === self.memberId && r.emoji === DEFAULT_REACTION)) react(m, DEFAULT_REACTION); }}>{m.body}</div>
                                    <Reactions list={m.reactions} me={asAdmin ? null : self.memberId} disabled={asAdmin} onPick={e => react(m, e)} align={mine ? 'end' : 'start'} />
                                    <div className="chat-meta">
                                        <span className="tabular">{hm(at)}</span>
                                        {(mine || canModerate) && <button onClick={() => remove(m)} aria-label={t('Өчүрүү')} className="chat-delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Writing, at the bottom within thumb reach. */}
            {messages !== null && (
                <div className="fixed left-0 right-0 bottom-0 z-30 page-gutter" style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))', paddingTop: '0.6rem', backgroundColor: 'color-mix(in oklab, var(--page-plane) 94%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}>
                    {away && (
                        <button onClick={toNewest} aria-label={t('Акыркы билдирүүлөргө')} className="absolute right-4 sm:right-8 -top-14 h-10 min-w-10 px-3 inline-flex items-center justify-center gap-1.5 rounded-full pop-in"
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
                            placeholder={asAdmin ? t('Админ катары жазуу…') : t('{0} үйүнө жазуу…', self.houseName)} aria-label={t('Билдирүү')}
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
