// Жамааттан кабар (announcements) and Аптанын максаты (a house's goal for
// the week), and the switch for notifications.
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Bell, BellOff, Check, Pencil, Pin, Trash2, X } from 'lucide-react';
import type { Theme } from '../theme';
import { isEnglish, t } from '../i18n';
import { AppFrame, Waiting } from './AppFrame';
import { AppContext } from './context';
import { go } from './route';
import type { Announcement, HouseGoal } from '../services/communityService';
import { deleteAnnouncement, fetchAnnouncements, fetchGoal, markNewsSeen, newsSeenAt, postAnnouncement, saveGoal, setPinned } from '../services/communityService';
import { disableNotify, enableNotify, notifySupported, useNotifyState } from './notify';
import { supabase } from '../lib/supabase';

const KY_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const dateOf = (iso: string) => { const d = new Date(iso); return isEnglish() ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : `${d.getDate()}-${KY_MONTHS[d.getMonth()]}`; };

/** Notifications on or off (where the phone allows them). */
export const NotifyToggle: React.FC = () => {
    const on = useNotifyState();
    const [msg, setMsg] = useState('');
    if (!notifySupported()) return null;
    return (
        <div className="inline-flex flex-col items-center">
            <button onClick={async () => { if (on) disableNotify(); else { const ok = await enableNotify(); if (!ok) setMsg(t('Телефон уруксат берген жок. iPhone\'до: сайтты Safari\'ден «Башкы экранга» кошуп, ошол жерден ачыңыз.')); } }}
                className="inline-flex items-center gap-2 py-2 text-[0.72rem] tracking-[0.16em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: on ? 'var(--gold)' : 'var(--text-muted)' }} aria-pressed={on}>
                {on ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}{on ? t('Билдирмелер күйүк') : t('Билдирмелерди күйгүзүү')}
            </button>
            {msg && <span className="text-[0.75rem] max-w-[22rem] text-center" style={{ color: 'var(--text-muted)' }}>{msg}</span>}
        </div>
    );
};

const useAnnouncements = () => {
    const [list, setList] = useState<Announcement[] | null | undefined>(undefined);
    const load = useCallback(() => { fetchAnnouncements().then(setList).catch(() => setList(null)); }, []);
    useEffect(() => {
        load();
        const ch = supabase.channel('announcements-page').on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, load).subscribe();
        return () => { supabase.removeChannel(ch).catch(() => undefined); };
    }, [load]);
    return { list, load };
};

/** On Менин күнүм: the latest word to the jamaat. */
export const NewsTeaser: React.FC = () => {
    const { list } = useAnnouncements();
    if (!list || list.length === 0) return null;
    const first = list[0];
    const seen = newsSeenAt();
    const fresh = list.filter(a => !seen || a.createdAt > seen).length;
    return (
        <button onClick={() => go('#/news')} className="row-link w-full text-left block pt-5 pb-4">
            <div className="flex items-baseline gap-3">
                <span className="eyebrow" style={{ color: 'var(--gold)' }}>{first.pinned ? t('Бекитилген') : dateOf(first.createdAt)}</span>
                {fresh > 0 && <span className="text-[0.7rem] px-1.5" style={{ border: '1px solid var(--gold)', color: 'var(--gold)' }}>{t('{0} жаңы', fresh)}</span>}
            </div>
            {first.title && <div className="font-display text-[1.6rem] leading-tight mt-2" style={{ color: 'var(--text-primary)' }}>{first.title}</div>}
            <p className="news-clamp text-[1rem] leading-relaxed mt-1.5" style={{ color: 'var(--text-secondary)' }}>{first.body}</p>
            <span className="inline-block mt-2 text-[0.72rem] tracking-[0.16em] uppercase" style={{ color: 'var(--gold)' }}>{list.length > 1 ? t('Бардык кабарлар · {0}', list.length) : t('Окуу')}</span>
        </button>
    );
};

const Composer: React.FC<{ onPosted: () => void }> = ({ onPosted }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [pin, setPin] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const field: React.CSSProperties = { backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' };
    return (
        <form className="mt-8 p-5 sm:p-6" style={{ border: '1px solid var(--gold-dim)' }} onSubmit={async e => {
            e.preventDefault(); if (!body.trim()) return;
            setBusy(true); setError('');
            try { await postAnnouncement(title, body, pin); setTitle(''); setBody(''); setPin(false); onPosted(); }
            catch (err) { setError((err as Error)?.message ?? ''); } finally { setBusy(false); }
        }}>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Жамаатка кабар жазуу')}</div>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder={t('Аталышы (милдеттүү эмес)')} className="login-field w-full mt-3 px-3.5 py-2.5 font-display text-[1.2rem]" style={field} />
            <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={3000} rows={4} placeholder={t('Кабар…')} className="login-field w-full mt-2 px-3.5 py-2.5 text-base leading-relaxed resize-y" style={field} />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <label className="inline-flex items-center gap-2 text-[0.9rem]" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={pin} onChange={e => setPin(e.target.checked)} />{t('Бекитүү (баарынан жогору турат)')}
                </label>
                <button type="submit" className="btn btn-primary" disabled={busy || !body.trim()}>{t('Жарыялоо')}</button>
            </div>
            {error && <p className="text-[0.85rem] mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
        </form>
    );
};

export const NewsPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const { role, signedIn, member } = useContext(AppContext);
    const isAdmin = role === 'admin';
    const { list, load } = useAnnouncements();
    useEffect(() => { if (list) markNewsSeen(); }, [list]);
    const someone = signedIn || member?.status === 'linked';
    return (
        <AppFrame page="today" title={t('Жамааттан кабар')} kicker={t('Кабарлар')} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[42rem] mx-auto">
                <div className="text-center mt-4"><NotifyToggle /></div>
                {isAdmin && <Composer onPosted={load} />}
                {!someone && <p className="text-center pt-10" style={{ color: 'var(--text-muted)' }}>{t('Кабарларды окуу үчүн кириңиз.')}</p>}
                {someone && list === undefined && <Waiting />}
                {someone && list === null && <p className="mt-8 px-4 py-3 text-[0.9rem]" style={{ borderLeft: '2px solid var(--gold)', color: 'var(--text-secondary)' }}>{t('Кабарлар азырынча ачыла элек. Админ supabase/community-2026-11.sql файлын иштетиши керек.')}</p>}
                {someone && list && list.length === 0 && <p className="text-center pt-10 italic" style={{ color: 'var(--text-muted)' }}>{t('Азырынча кабар жок.')}</p>}
                {list && list.map(a => (
                    <article key={a.id} className="news-item">
                        <div className="flex items-center gap-3">
                            {a.pinned && <span className="inline-flex items-center gap-1 eyebrow" style={{ color: 'var(--gold)' }}><Pin className="w-3 h-3" />{t('Бекитилген')}</span>}
                            <span className="eyebrow">{dateOf(a.createdAt)}</span>
                            <span className="flex-1" />
                            {isAdmin && (
                                <>
                                    <button onClick={() => setPinned(a.id, !a.pinned).then(load)} aria-label={a.pinned ? t('Бекитпөө') : t('Бекитүү')} className="p-1.5 transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}><Pin className="w-4 h-4" /></button>
                                    <button onClick={() => { if (window.confirm(t('Бул кабарды өчүрөсүзбү?'))) deleteAnnouncement(a.id).then(load); }} aria-label={t('Өчүрүү')} className="p-1.5 transition-colors hover:text-[var(--danger)]" style={{ color: 'var(--text-muted)' }}><Trash2 className="w-4 h-4" /></button>
                                </>
                            )}
                        </div>
                        {a.title && <h2 className="font-display text-[1.8rem] sm:text-[2.1rem] leading-tight mt-2" style={{ color: 'var(--text-primary)' }}>{a.title}</h2>}
                        <p className="text-[1.05rem] leading-[1.75] mt-2 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{a.body}</p>
                    </article>
                ))}
            </div>
        </AppFrame>
    );
};

/** Аптанын максаты: one line for the house for the week; its captain (or the admin) writes it. */
export const GoalBanner: React.FC<{ houseId: string; week: number | null; canEdit: boolean }> = ({ houseId, week, canEdit }) => {
    const [goal, setGoal] = useState<HouseGoal | null | undefined>(undefined);
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState('');
    const load = useCallback(() => { if (week) fetchGoal(houseId, week).then(setGoal).catch(() => setGoal(null)); }, [houseId, week]);
    useEffect(() => { load(); }, [load]);
    if (!week || goal === undefined) return null;
    if (!goal && !canEdit) return null;
    return (
        <div className="goal-banner">
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Аптанын максаты')}</div>
            {editing ? (
                <form className="flex items-center gap-2 mt-2" onSubmit={async e => { e.preventDefault(); try { await saveGoal(houseId, week, text); setEditing(false); load(); } catch { /* the rules refused */ } }}>
                    <input autoFocus value={text} onChange={e => setText(e.target.value)} maxLength={280} placeholder={t('Мисалы: ар бирибиз 7 бет Куран окуйбуз')} className="login-field flex-1 min-w-0 px-3 py-2 text-base" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }} />
                    <button type="submit" className="btn btn-ghost btn-icon" aria-label={t('Сактоо')}><Check className="w-4 h-4" /></button>
                    <button type="button" className="btn btn-ghost btn-icon" aria-label={t('Жабуу')} onClick={() => setEditing(false)}><X className="w-4 h-4" /></button>
                </form>
            ) : (
                <div className="flex items-start gap-3 mt-1.5">
                    <p className="flex-1 font-display text-[1.35rem] leading-snug" style={{ color: goal ? 'var(--text-primary)' : 'var(--text-muted)' }}>{goal ? goal.body : t('Үйгө ушул аптанын максатын жазыңыз.')}</p>
                    {canEdit && <button onClick={() => { setText(goal?.body ?? ''); setEditing(true); }} aria-label={t('Максатты жазуу')} className="hit p-1.5 transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}><Pencil className="w-4 h-4" /></button>}
                </div>
            )}
        </div>
    );
};
