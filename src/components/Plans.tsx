// Пландар: what a person means to memorize or read, and how it is going.
// The same list serves the member (their own plans) and the captain or the
// admin (anyone's), who also confirm recitations they have listened to.
import React, { useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, Plus, X } from 'lucide-react';
import type { DataFile } from '../types';
import { t } from '../i18n';
import type { JattooCategory, PlanTrack } from '../utils/jattoo';
import { CATEGORY_LABEL, unitLabel } from '../utils/jattoo';
import type { PlanEvent, PlanState, PlanView } from '../utils/plans';
import { attention, planSummary, planView, suggestDue } from '../utils/plans';
import { SURAHS, surah as surahOf } from '../utils/quranMeta';
import { isoDay } from '../utils/weekDates';
import { Sheet } from './ui';
import { addJattooRecord, addPlan, addStudyEntry, updatePlan, verifyRecitation } from '../services/dataService';

const today = () => isoDay(new Date());
const KY_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const dateLabel = (iso: string) => { const [, m, d] = iso.slice(0, 10).split('-').map(Number); return `${d}-${KY_MONTHS[m - 1]}`; };

const TRACKS: Array<{ key: PlanTrack; label: () => string }> = [
    { key: 'hifz', label: () => t('Жаттоо') }, { key: 'reading', label: () => t('Куран окуу') }, { key: 'book', label: () => t('Китептер') }
];

const STATE: Record<PlanState, { label: () => string; tone: string }> = {
    done: { label: () => t('Бүттү'), tone: 'var(--success)' },
    ontrack: { label: () => t('Пландагыдай'), tone: 'var(--gold)' },
    behind: { label: () => t('Артта калды'), tone: 'var(--danger)' },
    overdue: { label: () => t('Мөөнөтү өттү'), tone: 'var(--danger)' },
    open: { label: () => t('Мөөнөтсүз'), tone: 'var(--text-muted)' },
    paused: { label: () => t('Тындырылган'), tone: 'var(--text-muted)' },
    dropped: { label: () => t('Ташталган'), tone: 'var(--text-muted)' },
    stalled: { label: () => t('Үч жумадан бери жылыш жок'), tone: 'var(--danger)' }
};
const EVENT: Record<PlanEvent['kind'], () => string> = {
    created: () => t('Пландалды'), extended: () => t('Мөөнөтү жылды'), paused: () => t('Тындырылды'), resumed: () => t('Уланды'),
    done: () => t('Бүттү'), dropped: () => t('Ташталды'), reopened: () => t('Кайра ачылды'), changed: () => t('Өзгөрдү')
};
const BY: Record<string, () => string> = { admin: () => t('админ'), leader: () => t('капитан'), member: () => t('өзү') };

const unit = (v: PlanView, n: number) => (v.track === 'hifz' ? unitLabel((v.plan.category as JattooCategory) ?? 'quran', n) : t('{0} бет', n));
const subtitle = (v: PlanView) => {
    const g = v.plan;
    if (v.track === 'hifz' && g.category === 'quran' && g.surah) return `${surahOf(g.surah)?.name ?? ''} ${g.ayahFrom}–${g.ayahTo}`;
    if (v.track === 'hifz') return CATEGORY_LABEL[g.category];
    if (v.track === 'reading' && g.pageFrom) return t('{0}–{1}-бет', g.pageFrom, g.pageTo ?? g.pageFrom);
    return g.author ?? '';
};

const field: React.CSSProperties = { backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' };
const Err: React.FC<{ e: string }> = ({ e }) => (e ? <p role="alert" className="text-[0.85rem] px-3 py-2 mt-2" style={{ borderLeft: '2px solid var(--danger)', color: 'var(--danger)' }}>{/row-level|policy|does not exist|schema cache|column/i.test(e) ? t('Бул үчүн админ supabase/plans-2026-11.sql файлын иштетиши керек.') : e}</p> : null);

// ---------------------------------------------------------------- one plan
const PlanCard: React.FC<{ v: PlanView; events: PlanEvent[]; staff: boolean; onChanged: () => void }> = ({ v, events, staff, onChanged }) => {
    const [open, setOpen] = useState<null | 'log' | 'extend' | 'history'>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const g = v.plan;
    const st = STATE[v.state];
    const live = v.state !== 'done' && v.state !== 'dropped';
    const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(''); try { await fn(); setOpen(null); onChanged(); } catch (e) { setErr((e as Error)?.message ?? String(e)); } finally { setBusy(false); } };
    const s = g.surah ? surahOf(g.surah) : null;

    return (
        <li className={`plan ${v.state === 'done' ? 'is-done' : ''} ${!live ? 'is-closed' : ''}`}>
            <div className="plan-head">
                <span className="plan-glyph" aria-hidden="true">
                    {v.track === 'hifz' && s ? <span className="quran-text">{s.ar}</span> : v.track === 'reading' ? <span className="quran-text">۞</span> : <BookOpen className="w-5 h-5" strokeWidth={1.3} />}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="plan-title font-display">{g.title}</span>
                    <span className="plan-sub">{subtitle(v)}</span>
                </span>
                <span className="plan-state" style={{ color: st.tone }}>{st.label()}</span>
            </div>

            {/* Progress: the line, the diamond where they are, and what still waits to be heard. */}
            <div className="plan-line" aria-label={`${v.done} / ${v.target}`}>
                <i style={{ width: `${v.pct}%` }} />
                {v.pending > 0 && <u style={{ left: `${v.pct}%`, width: `${Math.min(100 - v.pct, (v.pending / v.target) * 100)}%` }} />}
                <b style={{ left: `${v.pct}%` }} />
            </div>
            <div className="plan-facts">
                <span className="tabular"><strong>{v.done}</strong> / {unit(v, v.target)}</span>
                {v.pending > 0 && <span style={{ color: 'var(--gold)' }}>{t('+{0} угула элек', v.pending)}</span>}
                {g.dueDate && live && <span>{t('{0} чейин', dateLabel(g.dueDate))}</span>}
                {v.perWeek && live && v.state !== 'paused' && <span>{t('жумасына ~{0}', unit(v, v.perWeek))}</span>}
                {v.lastDay && live && <span>{t('акыркы жолу {0}', dateLabel(v.lastDay))}</span>}
            </div>

            <div className="plan-acts">
                {live && v.state !== 'paused' && <button onClick={() => setOpen(open === 'log' ? null : 'log')} className={open === 'log' ? 'is-on' : ''}><Plus className="w-3.5 h-3.5" />{v.track === 'hifz' ? (staff ? t('Угулду') : t('Жаттадым')) : t('Окудум')}</button>}
                {live && <button onClick={() => setOpen(open === 'extend' ? null : 'extend')} className={open === 'extend' ? 'is-on' : ''}>{g.dueDate ? t('Мөөнөт') : t('Мөөнөт коюу')}</button>}
                {live && <button disabled={busy} onClick={() => run(() => updatePlan(g.id, { status: v.state === 'paused' ? 'active' : 'paused' }))}>{v.state === 'paused' ? t('Улантуу') : t('Тындыруу')}</button>}
                {live && <button disabled={busy} onClick={() => run(() => updatePlan(g.id, { status: 'done' }))}>{t('Бүттү')}</button>}
                {!live && <button disabled={busy} onClick={() => run(() => updatePlan(g.id, { status: 'active' }))}>{t('Кайра ачуу')}</button>}
                {live && <button disabled={busy} onClick={() => { if (window.confirm(t('Бул планды таштайсызбы? Тарыхы сакталат.'))) run(() => updatePlan(g.id, { status: 'dropped' })); }}>{t('Таштоо')}</button>}
                <button onClick={() => setOpen(open === 'history' ? null : 'history')} className={`ml-auto ${open === 'history' ? 'is-on' : ''}`} aria-expanded={open === 'history'}>{t('Тарых')}<ChevronDown className="w-3.5 h-3.5" /></button>
            </div>

            {open === 'log' && <LogForm v={v} staff={staff} busy={busy} onSave={fn => run(fn)} />}
            {open === 'extend' && <ExtendForm v={v} busy={busy} onSave={(due, note) => run(() => updatePlan(g.id, { dueDate: due, note }))} />}
            {open === 'history' && (
                <ol className="plan-history">
                    {events.length === 0 && <li className="italic" style={{ color: 'var(--text-muted)' }}>{t('Тарых азырынча жок.')}</li>}
                    {events.map(e => (
                        <li key={e.id}>
                            <span className="tabular" style={{ color: 'var(--text-muted)' }}>{dateLabel(e.at)}</span>
                            <span><strong>{EVENT[e.kind]()}</strong>{e.kind === 'extended' && e.newDue ? ` · ${e.oldDue ? `${dateLabel(e.oldDue)} → ` : ''}${dateLabel(e.newDue)}` : ''}{e.note ? ` · «${e.note}»` : ''}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{e.byRole ? BY[e.byRole]?.() ?? '' : ''}</span>
                        </li>
                    ))}
                </ol>
            )}
            <Err e={err} />
        </li>
    );
};

/** "I memorized / read this": the next part, prefilled. */
const LogForm: React.FC<{ v: PlanView; staff: boolean; busy: boolean; onSave: (fn: () => Promise<void>) => void }> = ({ v, staff, busy, onSave }) => {
    const g = v.plan;
    const s = g.surah ? surahOf(g.surah) : null;
    const startAyah = Math.min((g.ayahFrom ?? 1) + v.done + v.pending, g.ayahTo ?? 1);
    const [from, setFrom] = useState(v.track === 'reading' ? Math.min((g.pageFrom ?? 1) + v.done, g.pageTo ?? 604) : startAyah);
    const [to, setTo] = useState(v.track === 'hifz' ? Math.min(from + 4, g.ayahTo ?? from) : v.track === 'reading' ? Math.min(from + 19, g.pageTo ?? 604) : from);
    const [amount, setAmount] = useState(v.track === 'book' ? 10 : 1);
    const [day, setDay] = useState(today());
    const save = () => onSave(async () => {
        if (v.track === 'hifz') {
            await addJattooRecord(g.category === 'quran' && s
                ? { memberId: g.memberId, category: 'quran', title: s.name, surah: s.n, ayahFrom: from, ayahTo: Math.max(from, to), recitedOn: day }
                : { memberId: g.memberId, category: g.category, title: g.title, amount, recitedOn: day });
        } else if (v.track === 'reading') {
            await addStudyEntry({ memberId: g.memberId, goalId: g.id, track: 'reading', amount: Math.max(1, to - from + 1), pageFrom: from, pageTo: Math.max(from, to), onDay: day });
        } else {
            await addStudyEntry({ memberId: g.memberId, goalId: g.id, track: 'book', title: g.title, amount, onDay: day });
        }
    });
    const num = (val: number, set: (n: number) => void, max?: number) => <input type="number" inputMode="numeric" min={1} max={max} value={val} onChange={e => set(Number(e.target.value))} className="w-[4.8rem] px-2.5 py-2 tabular" style={field} />;
    return (
        <div className="plan-form">
            {v.track === 'hifz' && g.category === 'quran' && s ? <label>{t('Аяттар')}{num(from, setFrom, s.ayahs)}–{num(to, setTo, s.ayahs)}</label>
                : v.track === 'reading' ? <label>{t('Беттер')}{num(from, setFrom, 604)}–{num(to, setTo, 604)}</label>
                    : <label>{v.track === 'book' ? t('Канча бет') : t('Канча')}{num(amount, setAmount)}</label>}
            <label>{t('Качан')}<input type="date" value={day} max={today()} onChange={e => setDay(e.target.value)} className="px-2.5 py-2" style={{ ...field, colorScheme: 'light dark' }} /></label>
            <button className="btn btn-primary" disabled={busy} onClick={save}><Check className="w-4 h-4" />{t('Сактоо')}</button>
            {v.track === 'hifz' && !staff && <p className="plan-hint">{t('Капитаныңызга окуп бергенде, ал «угулду» деп белгилейт.')}</p>}
        </div>
    );
};

const ExtendForm: React.FC<{ v: PlanView; busy: boolean; onSave: (due: string | null, note: string) => void }> = ({ v, busy, onSave }) => {
    const [due, setDue] = useState(v.plan.dueDate && v.plan.dueDate > today() ? v.plan.dueDate : suggestDue(v, today()));
    const [note, setNote] = useState('');
    return (
        <div className="plan-form">
            <label>{t('Жаңы мөөнөт')}<input type="date" value={due} min={today()} onChange={e => setDue(e.target.value)} className="px-2.5 py-2" style={{ ...field, colorScheme: 'light dark' }} /></label>
            <label className="flex-1 min-w-[12rem]">{t('Себеби (милдеттүү эмес)')}<input value={note} onChange={e => setNote(e.target.value)} maxLength={300} className="w-full px-3 py-2" style={field} placeholder={t('мис. сессия, сапар, кайталоо керек')} /></label>
            <button className="btn btn-primary" disabled={busy || !due} onClick={() => onSave(due, note)}><Check className="w-4 h-4" />{t('Сактоо')}</button>
            {v.plan.dueDate && <button className="text-[0.8rem] underline underline-offset-4" style={{ color: 'var(--text-muted)' }} disabled={busy} onClick={() => onSave(null, note)}>{t('Мөөнөтсүз калтыруу')}</button>}
        </div>
    );
};

// ---------------------------------------------------------------- a new plan
const NewPlan: React.FC<{ memberId: string; track: PlanTrack; onDone: () => void }> = ({ memberId, track, onDone }) => {
    const [surahN, setSurahN] = useState(67);
    const s = surahOf(surahN)!;
    const [from, setFrom] = useState(1);
    const [to, setTo] = useState(s.ayahs);
    const [category, setCategory] = useState<JattooCategory>('quran');
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [amount, setAmount] = useState(track === 'reading' ? 604 : 100);
    const [pFrom, setPFrom] = useState(1);
    const [due, setDue] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const save = async () => {
        setBusy(true); setErr('');
        try {
            if (track === 'hifz') await addPlan(category === 'quran'
                ? { memberId, track, category, title: s.name, surah: surahN, ayahFrom: from, ayahTo: Math.max(from, to), target: Math.max(from, to) - from + 1, dueDate: due || null }
                : { memberId, track, category, title, target: amount, dueDate: due || null });
            else if (track === 'reading') await addPlan({ memberId, track, title: title || (pFrom === 1 && amount === 604 ? t('Толук Куран (хатм)') : t('Куран окуу')), pageFrom: pFrom, pageTo: Math.min(604, pFrom + amount - 1), target: amount, dueDate: due || null });
            else await addPlan({ memberId, track, title, author, target: amount, dueDate: due || null });
            onDone();
        } catch (e) { setErr((e as Error)?.message ?? String(e)); } finally { setBusy(false); }
    };
    const ok = track === 'hifz' ? (category === 'quran' ? to >= from : title.trim().length > 0 && amount > 0) : track === 'book' ? title.trim().length > 0 && amount > 0 : amount > 0;
    return (
        <div className="plan-new pop-in">
            {track === 'hifz' && (
                <div className="jattoo-kinds" role="radiogroup">
                    {(['quran', 'hadith', 'dua', 'zikr', 'names', 'other'] as JattooCategory[]).map(c => <button key={c} type="button" role="radio" aria-checked={category === c} data-on={category === c || undefined} onClick={() => setCategory(c)}>{CATEGORY_LABEL[c]}</button>)}
                </div>
            )}
            <div className="plan-form">
                {track === 'hifz' && category === 'quran' ? <>
                    <label className="flex-1 min-w-[12rem]">{t('Сүрө')}<select value={surahN} onChange={e => { const n = Number(e.target.value); setSurahN(n); setFrom(1); setTo(surahOf(n)!.ayahs); }} className="w-full px-2.5 py-2" style={field}>{SURAHS.map(([name, , ayahs], i) => <option key={i} value={i + 1}>{`${i + 1}. ${name} (${ayahs})`}</option>)}</select></label>
                    <label>{t('Аяттан')}<input type="number" min={1} max={s.ayahs} value={from} onChange={e => setFrom(Number(e.target.value))} className="w-[4.8rem] px-2.5 py-2 tabular" style={field} /></label>
                    <label>{t('Аятка')}<input type="number" min={1} max={s.ayahs} value={to} onChange={e => setTo(Number(e.target.value))} className="w-[4.8rem] px-2.5 py-2 tabular" style={field} /></label>
                </> : track === 'reading' ? <>
                    <label>{t('Кайсы беттен')}<input type="number" min={1} max={604} value={pFrom} onChange={e => setPFrom(Number(e.target.value))} className="w-[5rem] px-2.5 py-2 tabular" style={field} /></label>
                    <label>{t('Канча бет')}<input type="number" min={1} max={604} value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-[5rem] px-2.5 py-2 tabular" style={field} /></label>
                    <span className="plan-quick">{[[604, t('Толук Куран')], [20, t('1 пара')], [100, t('5 пара')]].map(([n, l]) => <button key={String(n)} type="button" onClick={() => { setPFrom(1); setAmount(n as number); }}>{l}</button>)}</span>
                </> : <>
                    <label className="flex-1 min-w-[12rem]">{track === 'book' ? t('Китептин аты') : t('Эмнени жаттайт')}<input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} className="w-full px-3 py-2" style={field} placeholder={track === 'book' ? t('мис. Рияду-с-салихин') : t('мис. Нававинин 40 хадиси')} /></label>
                    {track === 'book' && <label className="min-w-[10rem]">{t('Автору')}<input value={author} onChange={e => setAuthor(e.target.value)} maxLength={120} className="w-full px-3 py-2" style={field} /></label>}
                    <label>{track === 'book' ? t('Канча бет') : t('Канча')}<input type="number" min={1} value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-[5rem] px-2.5 py-2 tabular" style={field} /></label>
                </>}
                <label>{t('Мөөнөтү (милдеттүү эмес)')}<input type="date" value={due} min={today()} onChange={e => setDue(e.target.value)} className="px-2.5 py-2" style={{ ...field, colorScheme: 'light dark' }} /></label>
                <button className="btn btn-primary" disabled={busy || !ok} onClick={save}><Plus className="w-4 h-4" />{t('План коюу')}</button>
            </div>
            <Err e={err} />
        </div>
    );
};

// ---------------------------------------------------------------- one person's plans
export const PlanList: React.FC<{ data: DataFile; memberId: string; staff?: boolean; onChanged: () => void }> = ({ data, memberId, staff = false, onChanged }) => {
    const j = data.jattoo;
    const [track, setTrack] = useState<PlanTrack>('hifz');
    const [adding, setAdding] = useState(false);
    const [showClosed, setShowClosed] = useState(false);
    const views = useMemo(() => (j?.goals ?? []).filter(g => g.memberId === memberId).map(g => planView(g, j?.records ?? [], j?.log ?? [], today())), [j, memberId]);
    const pendingRecs = (j?.records ?? []).filter(r => r.memberId === memberId && r.verified === false);
    if (!j) return null;
    const mine = views.filter(v => v.track === track);
    const open = mine.filter(v => v.state !== 'done' && v.state !== 'dropped').sort((a, b) => attention(b) - attention(a));
    const closed = mine.filter(v => v.state === 'done' || v.state === 'dropped');
    const events = (id: number) => (j.events ?? []).filter(e => e.goalId === id);
    return (
        <div className="plans">
            <div className="plans-head">
                <div className="plans-tabs" role="tablist">
                    {TRACKS.map(tr => {
                        const n = views.filter(v => v.track === tr.key && v.state !== 'done' && v.state !== 'dropped').length;
                        return <button key={tr.key} role="tab" aria-selected={track === tr.key} data-on={track === tr.key || undefined} onClick={() => { setTrack(tr.key); setAdding(false); }}>{tr.label()}{n > 0 && <span className="tabular">{n}</span>}</button>;
                    })}
                </div>
                <button className="plans-add" onClick={() => setAdding(a => !a)} aria-expanded={adding}>{adding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{t('Жаңы план')}</button>
            </div>

            {/* Recitations the person noted that no one has heard yet. */}
            {staff && pendingRecs.length > 0 && track === 'hifz' && (
                <div className="plans-wait">
                    <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Угуп бериңиз')}</div>
                    {pendingRecs.map(r => (
                        <div key={r.id} className="flex items-center gap-3 py-2">
                            <span className="flex-1 min-w-0">{r.category === 'quran' ? `${r.title} ${r.ayahFrom}–${r.ayahTo}` : r.title} <span style={{ color: 'var(--text-muted)' }}>· {dateLabel(r.recitedOn)}</span></span>
                            <button className="btn btn-ghost" style={{ minHeight: '2.2rem' }} onClick={async () => { await verifyRecitation(r.id).catch(() => undefined); onChanged(); }}><Check className="w-4 h-4" />{t('Угулду')}</button>
                        </div>
                    ))}
                </div>
            )}

            {adding && <NewPlan memberId={memberId} track={track} onDone={() => { setAdding(false); onChanged(); }} />}
            {open.length === 0 && !adding && <p className="plans-empty">{track === 'hifz' ? t('Жаттоо планы жок. Кайсы сүрөнү же хадисти жаттайсыз?') : track === 'reading' ? t('Куран окуу планы жок. Мисалы, бир айда бир хатм же жумасына бир пара.') : t('Китеп планы жок. Азыр эмне окуп жатасыз?')}</p>}
            <ul>{open.map(v => <PlanCard key={v.plan.id} v={v} events={events(v.plan.id)} staff={staff} onChanged={onChanged} />)}</ul>
            {closed.length > 0 && (
                <>
                    <button className="plans-closed" onClick={() => setShowClosed(s => !s)} aria-expanded={showClosed}>{t('Бүткөн жана ташталган · {0}', closed.length)}<ChevronDown className="w-3.5 h-3.5" /></button>
                    {showClosed && <ul>{closed.map(v => <PlanCard key={v.plan.id} v={v} events={events(v.plan.id)} staff={staff} onChanged={onChanged} />)}</ul>}
                </>
            )}
        </div>
    );
};

// ---------------------------------------------------------------- the captain's and admin's overview
/** Everyone's plans at a glance, those who need attention first; a tap opens
 *  that person's plans. The admin switches houses; a captain sees their own. */
export const PlansBoard: React.FC<{ data: DataFile; houseId: string | null; onChanged: () => void; onRecord: () => void; onClose: () => void }> = ({ data, houseId, onChanged, onRecord, onClose }) => {
    const latest = data.weeks[data.weeks.length - 1];
    const houses = latest ? latest.teams.filter(tm => !houseId || tm.id === houseId) : [];
    const [house, setHouse] = useState(houses[0]?.id ?? '');
    const [openId, setOpenId] = useState<string | null>(null);
    const people = (houses.find(h => h.id === house)?.members ?? [])
        .map(m => ({ m, s: planSummary(data.jattoo, m.id, today()) }))
        .sort((a, b) => b.s.score - a.s.score || b.s.active - a.s.active || a.m.name.localeCompare(b.m.name));
    const totals = people.reduce((acc, p) => ({ active: acc.active + p.s.active, late: acc.late + p.s.late, waiting: acc.waiting + p.s.waiting, done: acc.done + p.s.done }), { active: 0, late: 0, waiting: 0, done: 0 });
    return (
        <Sheet title={t('Пландар')} onClose={onClose} width="50rem">
            <div className="px-5 sm:px-7 py-5">
                {houses.length > 1 && (
                    <div className="jattoo-kinds mb-5" role="tablist">
                        {houses.map(h => <button key={h.id} role="tab" aria-selected={house === h.id} data-on={house === h.id || undefined} onClick={() => { setHouse(h.id); setOpenId(null); }}>{h.name}</button>)}
                    </div>
                )}
                {/* The house in four numbers. */}
                <div className="figs" style={{ paddingTop: '.4rem' }}>
                    {([[totals.active, t('иштеп жаткан')], [totals.late, t('көңүл керек')], [totals.waiting, t('угула элек')], [totals.done, t('бүткөн')]] as const).map(([n, l], i) => (
                        <div key={l} className="fig" data-first={i === 0 || undefined}>
                            <div className="font-display tabular leading-none text-[2.2rem]" style={{ color: i === 1 && n ? 'var(--danger)' : i === 2 && n ? 'var(--gold)' : 'var(--text-primary)' }}>{n}</div>
                            <div className="text-[0.62rem] tracking-[0.14em] uppercase mt-2" style={{ color: 'var(--text-muted)' }}>{l}</div>
                        </div>
                    ))}
                </div>
                <ul className="board">
                    {people.map(({ m, s }) => {
                        const isOpen = openId === m.id;
                        return (
                            <li key={m.id}>
                                <button className="board-row" onClick={() => setOpenId(isOpen ? null : m.id)} aria-expanded={isOpen}>
                                    <span className="font-display text-[1.3rem] flex-1 min-w-0 truncate text-left" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                                    {s.waiting > 0 && <span className="board-tag" style={{ color: 'var(--gold)', borderColor: 'var(--gold)' }}>{t('{0} угула элек', s.waiting)}</span>}
                                    {s.late > 0 && <span className="board-tag" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>{t('{0} артта', s.late)}</span>}
                                    <span className="tabular text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>{s.active ? t('{0} план', s.active) : t('план жок')}</span>
                                    <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : undefined, color: 'var(--gold)' }} />
                                </button>
                                {isOpen && <div className="board-open"><PlanList data={data} memberId={m.id} staff onChanged={onChanged} /></div>}
                            </li>
                        );
                    })}
                </ul>
                <button className="mt-6 text-[0.8rem] underline underline-offset-4" style={{ color: 'var(--text-muted)' }} onClick={onRecord}>{t('Пландан тышкары жатка айтып бергенин жазуу')}</button>
            </div>
        </Sheet>
    );
};
