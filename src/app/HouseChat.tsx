// Үйдүн сөзү — the house's own conversation. Only the people of the house,
// its captain and the admin can read it (supabase/house-chat-2026-11.sql).
// Messages arrive at once; a message can be answered with "Аамин".
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Loader2, Trash2 } from 'lucide-react';
import type { Theme } from '../theme';
import { isEnglish, t } from '../i18n';
import { AppFrame, Waiting } from './AppFrame';
import { Avatar } from '../components/Avatar';
import { HornBand } from '../components/motion';
import { Mark } from '../components/Ornament';
import type { ChatMessage } from '../services/chatService';
import { deleteMessage, fetchMessages, markSeen, sendMessage, setAmin, watchHouse } from '../services/chatService';
import type { Self } from './self';
import { useMemberData } from './memberData';
import { GoalBanner, NotifyToggle } from './Community';

const KY_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const dayLabel = (d: Date, now = new Date()) => {
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (a === b) return t('Бүгүн');
    if (b - a === 86400000) return t('Кечээ');
    return isEnglish() ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : `${d.getDate()}-${KY_MONTHS[d.getMonth()]}`;
};
const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Ways to begin, for an empty conversation. */
const STARTERS = [
    () => t('Ассалому алейкум!'),
    () => t('Бүгүнкү тасбихатты окудум, алхамдулиллах.'),
    () => t('Дуба кылып коюңуздар.'),
    () => t('Ушул аптанын планын бирге аткаралы!')
];

export const HouseChat: React.FC<{ self: Self; canModerate: boolean; theme: Theme; onToggleTheme: () => void; /** The admin in another house: writes as the admin (needs supabase/admin-chat-2026-11.sql). */ readOnly?: boolean }> = ({ self, canModerate, theme, onToggleTheme, readOnly }) => {
    const { data } = useMemberData();
    const week = data?.weeks.length ? data.weeks[data.weeks.length - 1].globalWeek : null;
    const [messages, setMessages] = useState<ChatMessage[] | null | undefined>(undefined);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const list = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    const stick = useRef(true);

    // Names and photos of the house's people (and anyone who wrote before moving).
    const people = useMemo(() => {
        const map = new Map<string, { name: string; photoUrl: string | null; role: 'imam' | 'zam' | 'member' }>();
        for (const w of data?.weeks ?? []) for (const tm of w.teams) for (const m of tm.members) map.set(m.id, { name: m.name, photoUrl: m.photoUrl, role: m.role });
        return map;
    }, [data]);

    const load = useCallback(() => {
        fetchMessages(self.houseId).then(m => { setMessages(m); markSeen(self.houseId); }).catch(() => setMessages(null));
    }, [self.houseId]);
    useEffect(() => { load(); return watchHouse(self.houseId, load); }, [load, self.houseId]);
    const back = readOnly ? '#/house/chats' : '#/house';

    // Follow the newest message — unless the reader has scrolled up to read.
    useEffect(() => {
        const onScroll = () => { stick.current = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 160; };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    useLayoutEffect(() => { if (stick.current) window.scrollTo(0, document.documentElement.scrollHeight); }, [messages]);

    const send = async (body = text) => {
        const clean = body.trim();
        if (!clean || sending) return;
        setSending(true); setError('');
        try { await sendMessage(self.houseId, self.memberId, clean); setText(''); stick.current = true; load(); input.current?.focus(); }
        catch (e) { const msg = (e as Error)?.message ?? ''; setError(readOnly && /row-level security|violates/i.test(msg) ? t('Башка үйгө жазуу үчүн админ supabase/admin-chat-2026-11.sql файлын иштетиши керек.') : msg || t('Жөнөтүлгөн жок')); }
        finally { setSending(false); }
    };
    const amin = async (m: ChatMessage) => {
        const on = !m.amins.includes(self.memberId);
        // At once on screen; the database confirms a moment later.
        setMessages(cur => cur?.map(x => (x.id === m.id ? { ...x, amins: on ? [...x.amins, self.memberId] : x.amins.filter(a => a !== self.memberId) } : x)));
        try { await setAmin(m.id, self.memberId, on); } catch { load(); }
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
        <AppFrame page="house" title={t('Үйдүн сөзү')} back={back} theme={theme} onToggleTheme={onToggleTheme} ownBar>
            <div ref={list} className="max-w-[42rem] mx-auto pt-2 pb-6">
                <header className="text-center pt-4 pb-2">
                    <Mark size={44} className="mx-auto" style={{ color: 'var(--gold)' }} />
                    <div className="eyebrow mt-3" style={{ color: 'var(--gold)' }}>{t('Үйдүн сөзү')}</div>
                    <h1 className="font-display text-[2rem] leading-tight mt-1" style={{ color: 'var(--text-primary)' }}>{self.houseName}</h1>
                    <p className="text-[0.8rem] mt-1" style={{ color: 'var(--text-muted)' }}>{readOnly ? t('Сиз бул үйгө админ катары жазасыз; билдирүүлөрдү өчүрө аласыз.') : t('Үйдүн адамдары, капитан жана админ гана көрөт.')}</p>
                    <div className="mt-2"><NotifyToggle /></div>
                    <HornBand className="mt-3" />
                </header>
                <GoalBanner houseId={self.houseId} week={week} canEdit={canModerate} />

                {messages === undefined && <Waiting />}
                {messages === null && (
                    <p className="mt-8 px-4 py-3 text-[0.9rem]" style={{ borderLeft: '2px solid var(--gold)', color: 'var(--text-secondary)' }}>{t('Үйдүн сөзү азырынча ачыла элек — админ supabase/house-chat-2026-11.sql файлын иштетиши керек.')}</p>
                )}
                {messages && messages.length === 0 && (
                    <div className="text-center pt-10">
                        <p className="font-display text-[1.4rem]" style={{ color: 'var(--text-primary)' }}>{t('Биринчи сөз сизден болсун')}</p>
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
                    const sameRun = !newDay && prev && prev.memberId === m.memberId && at.getTime() - new Date(prev.createdAt).getTime() < 5 * 60000;
                    const mine = m.memberId === self.memberId;
                    const who = people.get(m.memberId);
                    const said = m.amins.includes(self.memberId);
                    return (
                        <React.Fragment key={m.id}>
                            {newDay && <div className="chat-day"><span>{dayLabel(at)}</span></div>}
                            <div className={`chat-row ${mine ? 'is-mine' : ''} ${sameRun ? 'is-run' : ''}`}>
                                {!mine && <div className="w-9 flex-shrink-0">{!sameRun && <Avatar name={who?.name ?? '?'} role={who?.role ?? 'member'} photoUrl={who?.photoUrl ?? null} size="sm" />}</div>}
                                <div className="chat-body">
                                    {!mine && !sameRun && (
                                        <div className="chat-name">{who?.name ?? (m.authorRole === 'admin' ? t('Админ') : t('Мүчө'))}{m.authorRole === 'leader' && <span className="chat-tag">{t('капитан')}</span>}{m.authorRole === 'admin' && <span className="chat-tag">{t('админ')}</span>}</div>
                                    )}
                                    <div className="chat-bubble">{m.body}</div>
                                    <div className="chat-meta">
                                        <span className="tabular">{hm(at)}</span>
                                        <button onClick={() => amin(m)} aria-pressed={said} className={`chat-amin ${said ? 'is-on' : ''}`} aria-label={t('Аамин')}>
                                            {t('Аамин')}{m.amins.length > 0 && <span className="tabular"> · {m.amins.length}</span>}
                                        </button>
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
                    {error && <p className="max-w-[42rem] mx-auto text-[0.82rem] mb-2" style={{ color: 'var(--danger)' }}>{error}</p>}
                    <form className="max-w-[42rem] mx-auto flex items-end gap-2" onSubmit={e => { e.preventDefault(); send(); }}>
                        <textarea
                            ref={input} rows={1} value={text} maxLength={2000}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); send(); } }}
                            placeholder={t('{0} үйүнө жазуу…', self.houseName)} aria-label={t('Билдирүү')}
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
