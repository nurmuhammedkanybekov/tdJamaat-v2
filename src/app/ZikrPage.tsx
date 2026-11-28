// Зикир: choose what to count, then count with the whole screen as the
// button. Each zikr says why it is said (a hadith, with where to find it).
// Counts stay on this device (src/utils/zikr.ts) and add up into the jamaat
// week for the captain (MyWeek).
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from './context';
import { useMemberData } from './memberData';
import { Check, ChevronDown, ChevronRight, Minus, Plus, RotateCcw, Star, Trash2, X } from 'lucide-react';
import type { Theme } from '../theme';
import type { Zikr, ZikrStore } from '../utils/zikr';
import { AFTER_PRAYER, ZIKRS, addCount, addCustom, allTime, allZikrs, dayKey, isFav, lastDays, loadZikr, planRows, removeCustom, resetCurrent, saveZikr, setPlan, setTarget, streak, targetOf, todayOf, todayTotal, toggleFav } from '../utils/zikr';
import { t, isEnglish } from '../i18n';
import { AppFrame, Section } from './AppFrame';
import { go } from './route';
import { useWakeLock } from './useWakeLock';
import { MyWeek } from './MyWeek';
import { useSelf } from './self';
import { useWeekTotals } from './useWeekTotals';

/** Why it is said — one tap away, so the counting screen stays calm. */
const Virtue: React.FC<{ zikr: Zikr }> = ({ zikr }) => {
    const [open, setOpen] = useState(false);
    if (!zikr.virtue) return null;
    return (
        <div className="text-center">
            <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="inline-flex items-center gap-1.5 py-1 text-[0.66rem] tracking-[0.18em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: open ? 'var(--gold)' : 'var(--text-muted)' }}>
                {t('Фазилети')}<ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <p className="mx-auto max-w-[30rem] mt-2 text-[0.92rem] leading-relaxed animate-fade-up" style={{ color: 'var(--text-secondary)' }}>
                    {zikr.virtue} <span className="whitespace-nowrap text-[0.8rem] italic" style={{ color: 'var(--text-muted)' }}>— {zikr.source}</span>
                </p>
            )}
        </div>
    );
};

const TARGETS = [33, 99, 100, 1000, 0];
const buzz = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch { /* no vibration on this device */ } };
const WEEKDAY = [t('Жш'), t('Дш'), t('Шш'), t('Шр'), t('Бш'), t('Жм'), t('Иш')];

// The ring fills as the count nears the target.
const Ring: React.FC<{ value: number; target: number; full?: boolean; children: React.ReactNode }> = ({ value, target, full, children }) => {
    const R = 138, C = 2 * Math.PI * R;
    const part = full ? 1 : target > 0 ? (value % target) / target : 0;
    return (
        <div className="relative mx-auto" style={{ width: 'min(19rem, 78vw)', aspectRatio: '1' }}>
            <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
                <circle cx="150" cy="150" r={R} fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />
                {/* 33 fine ticks, like the beads of a tasbih */}
                <circle cx="150" cy="150" r={R - 9} fill="none" stroke="var(--gold-dim)" strokeWidth="5" strokeDasharray={`1 ${(2 * Math.PI * (R - 9)) / 33 - 1}`} opacity="0.45" />
                {target > 0 && <circle cx="150" cy="150" r={R} fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - part)} style={{ transition: 'stroke-dashoffset 260ms cubic-bezier(0.2, 0.7, 0.2, 1)' }} />}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
        </div>
    );
};

const Counter: React.FC<{ zikr: Zikr; store: ZikrStore; update: (fn: (s: ZikrStore) => ZikrStore) => ZikrStore; sequence?: { index: number; onDone: () => void; onPick?: (i: number) => void } }> = ({ zikr, store, update, sequence }) => {
    const target = sequence ? AFTER_PRAYER[sequence.index].count : targetOf(store, zikr);
    // The after-prayer set counts in its own slot, so a count in progress on
    // the zikr's own page is left as it was.
    const slot = sequence ? `namaz:${sequence.index}` : zikr.id;
    const count = store.current[slot] ?? 0;
    // Set when the after-prayer step is complete: further taps wait for the next zikr.
    const finished = useRef(false);
    const rounds = target > 0 ? Math.floor(count / target) : 0;
    const inRound = target > 0 ? count % target : count;
    const [pulse, setPulse] = useState(0);
    const [done, setDone] = useState(false);

    useWakeLock();
    const doneTimer = useRef(0);
    useEffect(() => () => window.clearTimeout(doneTimer.current), []);

    const tap = useCallback(() => {
        if (finished.current) return;
        // Read the count from the store just written, not from the last
        // render: two quick taps must never see the same number.
        const next = update(s => addCount(s, zikr.id, 1, new Date(), slot)).current[slot] ?? 0;
        const reached = target > 0 && next % target === 0;
        setPulse(p => p + 1);
        window.clearTimeout(doneTimer.current);
        if (reached) {
            buzz([40, 60, 120]);
            setDone(true);
            if (sequence) { finished.current = true; doneTimer.current = window.setTimeout(sequence.onDone, 900); }
            else doneTimer.current = window.setTimeout(() => setDone(false), 1400);
        } else { setDone(false); buzz(12); }
    }, [target, update, zikr.id, slot, sequence]);

    // Space / Enter count too (a keyboard, or a Bluetooth clicker).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if ((e.key === ' ' || e.key === 'Enter') && !(e.target as HTMLElement)?.closest('button, select')) { e.preventDefault(); tap(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [tap]);

    return (
        <div className="flex flex-col lg:max-w-[40rem] lg:mx-auto zikr-stage">
            {/* The set's three steps: tap one to go straight to it. */}
            {sequence?.onPick && (
                <div className="grid grid-cols-3 gap-3 px-4 pt-2 w-full max-w-[26rem] mx-auto" role="tablist" aria-label={t('Намаздан кийинки тасбих')}>
                    {AFTER_PRAYER.map((x, i) => {
                        const zx = ZIKRS.find(y => y.id === x.id);
                        const on = i === sequence.index;
                        return (
                            <button key={i} role="tab" aria-selected={on} onClick={() => sequence.onPick?.(i)} className="min-w-0 pb-2 text-center transition-colors"
                                style={{ borderBottom: `${on ? 2 : 1}px solid ${on ? 'var(--gold)' : i < sequence.index ? 'var(--gold-dim)' : 'var(--border)'}`, color: on ? 'var(--gold)' : 'var(--text-muted)' }}>
                                <span className="block truncate text-[0.78rem]">{zx?.reading ?? i + 1}</span>
                                <span className="block font-display tabular text-[0.95rem]">{x.count}</span>
                            </button>
                        );
                    })}
                </div>
            )}
            {/* The whole upper area is the button. */}
            <button onClick={tap} className="zikr-tap flex-1 flex flex-col items-center justify-center text-center select-none py-6 w-full" aria-label={t('Саноо: {0}', zikr.reading)}>
                {sequence && <div className="eyebrow mb-3" style={{ color: 'var(--gold)' }}>{t('Намаздан кийин · {0} / 3', sequence.index + 1)}</div>}
                {zikr.arabic && <div dir="rtl" lang="ar" className="quran-text text-[2.4rem] sm:text-[2.9rem] leading-[1.8] px-2" style={{ color: 'var(--text-primary)' }}>{zikr.arabic}</div>}
                <div className={`font-display leading-tight mt-1 px-2 ${zikr.arabic ? 'text-[1.5rem] sm:text-[1.7rem]' : 'text-[2rem] sm:text-[2.4rem]'}`} style={{ color: 'var(--gold)' }}>{zikr.reading}</div>
                <div className="text-[0.85rem] italic mt-0.5 mb-6 max-w-[26rem]" style={{ color: 'var(--text-muted)' }}>{zikr.meaning}</div>
                <Ring value={count} target={target} full={done}>
                    <span key={pulse} className="zikr-number font-display tabular leading-none" style={{ fontSize: 'clamp(4.5rem, 24vw, 7rem)', color: done ? 'var(--gold)' : 'var(--text-primary)' }}>{target > 0 && !done ? inRound : target > 0 ? target : count}</span>
                    <span className="text-[0.9rem] mt-2 tabular" style={{ color: 'var(--text-muted)' }}>
                        {done ? <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--gold)' }}><Check className="w-4 h-4" />{t('Толду')}</span>
                            : target > 0 ? <>/ {target}{rounds > 0 && <span style={{ color: 'var(--gold)' }}> · ×{rounds}</span>}</> : t('чексиз')}
                    </span>
                </Ring>
                <div className="text-[0.82rem] mt-6 lg:hidden" style={{ color: 'var(--text-muted)' }}>{t('Саноо үчүн экрандын каалаган жерин басыңыз')}</div>
                <div className="text-[0.82rem] mt-6 hidden lg:block" style={{ color: 'var(--text-muted)' }}>{t('Санаш үчүн басыңыз же Боштук баскычын басыңыз')}</div>
            </button>

            {/* Controls: small, at the bottom, away from the counting thumb. */}
            <div className="pb-2">
                {!sequence && (
                    <div className="pb-3 flex items-center justify-center gap-6">
                        <Virtue zikr={zikr} />
                        <button type="button" onClick={() => update(s => toggleFav(s, zikr.id))} aria-pressed={isFav(store, zikr.id)} className="z-fav" data-on={isFav(store, zikr.id) || undefined}>
                            <Star className="w-3.5 h-3.5" fill={isFav(store, zikr.id) ? 'currentColor' : 'none'} />{isFav(store, zikr.id) ? t('Тандалган') : t('Тандалгандарга кошуу')}
                        </button>
                        {zikr.id.startsWith('c-') && <button type="button" onClick={() => { if (window.confirm(t('Бул зикирди өчүрөсүзбү? Саналгандары калат.'))) { update(s => removeCustom(s, zikr.id)); go('#/zikr'); } }} className="z-fav" style={{ color: 'var(--danger)' }}><Trash2 className="w-3.5 h-3.5" />{t('Өчүрүү')}</button>}
                    </div>
                )}
                <div className="grid grid-cols-3 text-center py-3" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    <div><div className="eyebrow">{t('Азыр')}</div><div className="font-display text-[1.4rem] tabular" style={{ color: 'var(--text-primary)' }}>{count}</div></div>
                    <div><div className="eyebrow">{t('Бүгүн')}</div><div className="font-display text-[1.4rem] tabular" style={{ color: 'var(--gold)' }}>{todayOf(store, zikr.id)}</div></div>
                    <div><div className="eyebrow">{t('Жалпы')}</div><div className="font-display text-[1.4rem] tabular" style={{ color: 'var(--text-primary)' }}>{allTime(store, zikr.id)}</div></div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-3">
                    <button onClick={() => { if (finished.current) return; setDone(false); update(s => addCount(s, zikr.id, -1, new Date(), slot)); buzz(8); }} disabled={count === 0} className="btn btn-ghost disabled:opacity-30" aria-label={t('Бирди артка')}><Minus className="w-4 h-4" />1</button>
                    {!sequence && (
                        <label className="flex items-center gap-2 text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>
                            {t('Максат')}
                            <select value={target} onChange={e => update(s => setTarget(s, zikr.id, Number(e.target.value)))} className="px-2 py-2 text-[0.95rem] tabular" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}>
                                {[...new Set([...TARGETS, zikr.target, target])].sort((a, b) => (a || 1e9) - (b || 1e9)).map(n => <option key={n} value={n}>{n === 0 ? '∞' : n}</option>)}
                            </select>
                        </label>
                    )}
                    <button onClick={() => { if (count === 0 || window.confirm(t('Эсепти нөлдөн баштайбы? Бүгүнкү жалпы сан сакталат.'))) { setDone(false); update(s => resetCurrent(s, slot)); } }} className="btn btn-ghost" aria-label={t('Кайра баштоо')}><RotateCcw className="w-4 h-4" /><span className="hidden min-[380px]:inline">{t('Кайра')}</span></button>
                </div>
            </div>
        </div>
    );
};

/** One zikr in the list: its bead fills as today's count nears its number. */
const BeadRow: React.FC<{ z: Zikr; store: ZikrStore; onFav?: () => void }> = ({ z, store, onFav }) => {
    const today = todayOf(store, z.id), target = targetOf(store, z);
    const part = target > 0 ? Math.min(1, today / target) : today > 0 ? 1 : 0;
    return (
        <li>
            <button onClick={() => go(`#/zikr/${z.id}`)} className="bead-row">
                <span className={`bead ${part >= 1 ? 'is-full' : ''}`} style={{ ['--p' as string]: `${part * 360}deg` }} aria-hidden="true"><i /></span>
                <span className="flex-1 min-w-0">
                    {z.arabic && <span dir="rtl" lang="ar" className="block quran-text text-[1.75rem] sm:text-[2rem] leading-[1.7] truncate" style={{ color: 'var(--text-primary)' }}>{z.arabic}</span>}
                    <span className="flex items-baseline justify-between gap-3 mt-1">
                        <span className="font-display text-[1.2rem] leading-tight min-w-0 truncate" style={{ color: 'var(--gold)' }}>{z.reading}</span>
                        <span className="tabular text-[0.85rem] flex-shrink-0" style={{ color: today > 0 ? 'var(--gold)' : 'var(--text-muted)' }} aria-label={t('Бүгүн: {0}', today)}>{today}<span style={{ color: 'var(--text-muted)' }}> / {target > 0 ? target : '∞'}</span></span>
                    </span>
                    {z.meaning && <span className="block text-[0.85rem] italic mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{z.meaning}</span>}
                </span>
            </button>
            {onFav && (
                <button type="button" onClick={onFav} className="bead-fav" aria-pressed={isFav(store, z.id)} data-on={isFav(store, z.id) || undefined}
                    aria-label={isFav(store, z.id) ? t('Тандалгандардан алып салуу') : t('Тандалгандарга кошуу')} title={isFav(store, z.id) ? t('Тандалгандардан алып салуу') : t('Тандалгандарга кошуу')}>
                    <Star className="w-4 h-4" fill={isFav(store, z.id) ? 'currentColor' : 'none'} strokeWidth={1.5} />
                </button>
            )}
        </li>
    );
};

/** Add an own zikr: how it is read and its English are required. */
const NewZikr: React.FC<{ onAdd: (c: { reading: string; english: string; meaning?: string; arabic?: string; target: number }) => void }> = ({ onAdd }) => {
    const [open, setOpen] = useState(false);
    const [f, setF] = useState({ reading: '', english: '', meaning: '', arabic: '', target: 33 });
    const ok = f.reading.trim().length > 1 && f.english.trim().length > 1;
    if (!open) return <button onClick={() => setOpen(true)} className="z-new"><Plus className="w-4 h-4" />{t('Жаңы зикир кошуу')}</button>;
    const field = (k: 'reading' | 'english' | 'meaning' | 'arabic', label: string, hint: string, req = false, rtl = false) => (
        <label className="block mt-4">
            <span className="eyebrow">{label}{req && <span style={{ color: 'var(--gold)' }}> *</span>}</span>
            <input value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} placeholder={hint} dir={rtl ? 'rtl' : undefined} lang={rtl ? 'ar' : undefined} maxLength={k === 'reading' || k === 'english' ? 160 : 240}
                className={`z-input ${rtl ? 'quran-text text-[1.5rem]' : ''}`} />
        </label>
    );
    return (
        <form className="z-form" onSubmit={e => { e.preventDefault(); if (!ok) return; onAdd({ ...f }); setF({ reading: '', english: '', meaning: '', arabic: '', target: 33 }); setOpen(false); }}>
            <div className="flex items-center justify-between">
                <span className="font-display text-[1.3rem]" style={{ color: 'var(--text-primary)' }}>{t('Жаңы зикир')}</span>
                <button type="button" onClick={() => setOpen(false)} aria-label={t('Жабуу')} className="w-9 h-9 inline-flex items-center justify-center" style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            {field('reading', t('Кантип окулат'), t('кириллица менен'), true)}
            {field('english', t('Англисче'), 'in English', true)}
            {field('meaning', t('Мааниси (кыргызча)'), '')}
            {field('arabic', t('Арабча (каалоо боюнча)'), '', false, true)}
            <div className="flex items-end justify-between gap-4 mt-5">
                <label className="flex items-center gap-2 text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>{t('Максат')}
                    <input type="number" inputMode="numeric" min={0} max={100000} value={f.target} onChange={e => setF({ ...f, target: Number(e.target.value) || 0 })} className="z-input w-24 tabular" />
                </label>
                <button type="submit" disabled={!ok} className="btn btn-primary"><Check className="w-4 h-4" />{t('Кошуу')}</button>
            </div>
            <p className="mt-3 text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{t('Англисчеси сайт англисче ачылганда көрүнөт. Арабча текстти өзүңүз текшерип жазыңыз.')}</p>
        </form>
    );
};

const PRESETS = [100, 300, 700, 1000, 3000];

/** The week's plan, per zikr: how far each has come since Thursday, and how
 *  many to say today to stay on pace. Members can take their jamaat plan for
 *  salawat and istighfar in one tap. */
const ZikrPlan: React.FC<{ store: ZikrStore; update: (fn: (s: ZikrStore) => ZikrStore) => ZikrStore; every: Zikr[]; jamaat: { salawat: number; zikr: number } | null }> = ({ store, update, every, jamaat }) => {
    const [editing, setEditing] = useState(false);
    const rows = planRows(store);
    const name = (id: string) => every.find(z => z.id === id)?.reading ?? id;
    const total = rows.reduce((n, r) => n + r.target, 0), done = rows.reduce((n, r) => n + Math.min(r.done, r.target), 0);
    const left = rows[0]?.daysLeft ?? 7 - ((new Date().getDay() + 3) % 7);
    const takeJamaat = () => jamaat && update(s => setPlan(setPlan(s, 'salawat', jamaat.salawat), 'istighfar', jamaat.zikr));
    const offerJamaat = jamaat && (jamaat.salawat > 0 || jamaat.zikr > 0) && ((store.weekPlan?.salawat ?? 0) !== jamaat.salawat || (store.weekPlan?.istighfar ?? 0) !== jamaat.zikr);
    // No plan yet: one quiet line that offers to make one.
    if (!rows.length && !editing) return (
        <section className="zplan-empty">
            <div className="min-w-0">
                <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Зикир планым')}</div>
                <div className="text-[0.88rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('Апталык сан коюңуз, сайт аны күндөргө бөлүп берет.')}</div>
                {offerJamaat && <button className="zplan-empty-j" onClick={takeJamaat}>{t('Жамааттагы планымды кошуу: салават {0}, истигфар {1}', jamaat!.salawat, jamaat!.zikr)}</button>}
            </div>
            <button className="zplan-empty-go" onClick={() => setEditing(true)}>{t('План түзүү')}<ChevronRight className="w-4 h-4" /></button>
        </section>
    );
    return (
        <section className="zplan">
            <div className="zplan-head">
                <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Бул аптанын планы')}</div>
                <h2 className="font-display">{t('Зикир планым')}</h2>
                <div className="zplan-sub">{rows.length ? t('Бейшембиден шаршембиге чейин · {0} күн калды', left) : t('Ар бир зикир үчүн апталык сан коюңуз. Сайт аны күндөргө бөлүп, бүгүн канча айтуу керектигин көрсөтөт.')}</div>
            </div>

            {rows.length > 0 && !editing && (
                <>
                    <div className="zplan-total">
                        <span className="font-display tabular">{done}</span><small> / {total}</small>
                        <i aria-hidden="true"><b style={{ width: `${Math.min(100, (done / Math.max(1, total)) * 100)}%` }} /></i>
                    </div>
                    <ul className="zplan-rows">
                        {rows.map(r => {
                            const met = r.done >= r.target;
                            return (
                                <li key={r.id}>
                                    <button onClick={() => go(`#/zikr/${r.id}`)} className="zplan-row" data-met={met || undefined}>
                                        <span className="zplan-name font-display">{name(r.id)}</span>
                                        <span className="zplan-n tabular">{r.done}<small> / {r.target}</small></span>
                                        <span className="zplan-line" aria-hidden="true"><i style={{ width: `${Math.min(100, (r.done / r.target) * 100)}%` }} /></span>
                                        <span className="zplan-today">{met ? t('Аптанын планы аткарылды') : r.todayPace > 0 ? t('Бүгүн дагы {0}', r.todayPace) : t('Бүгүнкү үлүшү аткарылды')}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

            {editing && (
                <ul className="zplan-edit">
                    {every.map(z => {
                        const v = store.weekPlan?.[z.id] ?? 0;
                        return (
                            <li key={z.id}>
                                <span className="zplan-name font-display">{z.reading}</span>
                                <span className="zplan-step">
                                    <select value={PRESETS.includes(v) || v === 0 ? v : 'x'} onChange={e => { if (e.target.value !== 'x') update(s => setPlan(s, z.id, Number(e.target.value))); }} aria-label={t('{0}: апталык сан', z.reading)}>
                                        <option value={0}>{t('планда жок')}</option>
                                        {PRESETS.map(n => <option key={n} value={n}>{n}</option>)}
                                        {v && !PRESETS.includes(v) ? <option value="x">{v}</option> : null}
                                    </select>
                                    <input type="number" inputMode="numeric" min={0} value={v || ''} placeholder="0" onChange={e => update(s => setPlan(s, z.id, Number(e.target.value)))} aria-label={t('{0}: апталык сан', z.reading)} className="tabular" />
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="cal-kinds zplan-acts">
                <button onClick={() => setEditing(v => !v)} data-on={editing || undefined}>{editing ? t('Даяр') : rows.length ? t('Планды өзгөртүү') : t('План түзүү')}</button>
                {offerJamaat && <button onClick={takeJamaat}>{t('Жамааттагы планымды кошуу: салават {0}, истигфар {1}', jamaat!.salawat, jamaat!.zikr)}</button>}
            </div>
        </section>
    );
};

export const ZikrPage: React.FC<{ arg: string | null; theme: Theme; onToggleTheme: () => void }> = ({ arg, theme, onToggleTheme }) => {
    const [store, setStore] = useState<ZikrStore>(loadZikr);
    const ref = useRef(store);
    const update = useCallback((fn: (s: ZikrStore) => ZikrStore) => {
        const next = fn(ref.current);
        ref.current = next; saveZikr(next); setStore(next);
        window.dispatchEvent(new Event('tdjamaat-practice'));
        return next;
    }, []);
    // This jamaat week, Thursday → Wednesday (days still ahead stay empty).
    const week = useMemo(() => { const now = new Date(); const back = (now.getDay() + 3) % 7; const wed = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back + 6); return lastDays(store, 7, wed); }, [store]);
    const totals = useWeekTotals();
    const { self } = useSelf();
    const synced = !!self;
    const weekMax = Math.max(1, ...week.map(d => d.total));
    const todayKey = dayKey(new Date());
    const every = allZikrs(store, isEnglish());
    const favs = every.filter(z => isFav(store, z.id));
    const rest = ZIKRS.filter(z => !isFav(store, z.id));
    const own = every.filter(z => z.id.startsWith('c-') && !isFav(store, z.id));
    // A member's jamaat plan for salawat (СВТ) and istighfar/zikr (ИСТГ), from the latest week.
    const ctx = useContext(AppContext);
    const { data: memberData } = useMemberData(!!self && !ctx.data);
    const jamaatPlan = useMemo(() => {
        const d = ctx.data ?? memberData;
        if (!self || !d) return null;
        for (const w of [...d.weeks].reverse()) {
            const m = w.teams.flatMap(tm => tm.members).find(x => x.id === self.memberId);
            if (m) return { salawat: m.target['СВТ'] ?? 0, zikr: m.target['ИСТГ'] ?? 0 };
        }
        return null;
    }, [ctx.data, memberData, self]);

    // The after-prayer set: three counters in a row.
    const [step, setStep] = useState(0);
    const startSet = useCallback(() => { update(s => AFTER_PRAYER.reduce((acc, _, i) => resetCurrent(acc, `namaz:${i}`), s)); setStep(0); }, [update]);
    // Every visit to the set starts it from the beginning.
    const inSet = arg === 'namaz';
    useEffect(() => { startSet(); }, [inSet, startSet]);
    if (arg === 'namaz') {
        if (step >= AFTER_PRAYER.length) {
            return (
                <AppFrame page="zikr" title={t('Намаздан кийинки тасбих')} back="#/zikr" theme={theme} onToggleTheme={onToggleTheme} ownBar>
                    <div className="text-center py-20">
                        <div className="mx-auto w-16 h-16 rounded-full inline-flex items-center justify-center pop-in" style={{ border: '1px solid var(--gold)', color: 'var(--gold)' }}><Check className="w-7 h-7" /></div>
                        <div className="font-display text-[2.2rem] mt-6" style={{ color: 'var(--text-primary)' }}>{t('Тасбих толду')}</div>
                        <div className="text-[0.95rem] mt-2 tabular" style={{ color: 'var(--text-muted)' }}>33 + 33 + 34 = 100</div>
                        <div className="flex flex-wrap justify-center gap-3 mt-8">
                            <button onClick={startSet} className="btn btn-ghost"><RotateCcw className="w-4 h-4" />{t('Кайра')}</button>
                            <button onClick={() => go('#/zikr')} className="btn btn-primary">{t('Даяр')}</button>
                        </div>
                    </div>
                </AppFrame>
            );
        }
        const z = ZIKRS.find(x => x.id === AFTER_PRAYER[step].id)!;
        return (
            <AppFrame page="zikr" title={t('Намаздан кийинки тасбих')} back="#/zikr" theme={theme} onToggleTheme={onToggleTheme} ownBar>
                <Counter key={z.id + step} zikr={z} store={store} update={update} sequence={{ index: step, onDone: () => setStep(n => n + 1), onPick: setStep }} />
            </AppFrame>
        );
    }

    const zikr = allZikrs(store, isEnglish()).find(z => z.id === arg);
    if (zikr) {
        return (
            <AppFrame page="zikr" title={zikr.reading} back="#/zikr" theme={theme} onToggleTheme={onToggleTheme} ownBar>
                <Counter key={zikr.id} zikr={zikr} store={store} update={update} />
            </AppFrame>
        );
    }

    return (
        <AppFrame page="zikr" title={t('Зикир')} kicker={t('Аллахты эскерүү')} sub={streak(store) > 1 ? t('Катары менен {0} күн', streak(store)) : t('Бүгүн: {0}', todayTotal(store))} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14 lg:items-start max-w-[64rem] mx-auto">
                <div>
                    <ZikrPlan store={store} update={update} every={every} jamaat={jamaatPlan} />
                    {/* After every prayer: the three phrases and their counts, side by side. */}
                    <button onClick={() => go('#/zikr/namaz')} className="z-after">
                        <span className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Ар бир намаздан кийин')}</span>
                        <span className="z-after-row">
                            {AFTER_PRAYER.map(x => {
                                const z = ZIKRS.find(k => k.id === x.id)!;
                                return (
                                    <span key={x.id} className="z-after-col">
                                        <span dir="rtl" lang="ar" className="quran-text z-after-ar">{z.arabic}</span>
                                        <span className="font-display tabular z-after-n">{x.count}</span>
                                        <span className="z-after-l">{z.reading}</span>
                                    </span>
                                );
                            })}
                        </span>
                        <span className="z-after-go">{t('Баштоо')}<ChevronRight className="w-3.5 h-3.5" /></span>
                    </button>
                    {favs.length > 0 && (
                        <Section eyebrow={t('Тандалгандар')}>
                            <ul className="bead-list">{favs.map(z => <BeadRow key={z.id} z={z} store={store} onFav={() => update(s => toggleFav(s, z.id))} />)}</ul>
                        </Section>
                    )}
                    <Section eyebrow={t('Зикирлер')}>
                        {/* The zikrs as beads on a thread: a bead fills as today's count nears its number. */}
                        <ul className="bead-list">{rest.map(z => <BeadRow key={z.id} z={z} store={store} onFav={() => update(s => toggleFav(s, z.id))} />)}</ul>
                    </Section>
                    <Section eyebrow={t('Өз зикирлерим')}>
                        {own.length > 0 && <ul className="bead-list">{own.map(z => <BeadRow key={z.id} z={z} store={store} onFav={() => update(s => toggleFav(s, z.id))} />)}</ul>}
                        <NewZikr onAdd={c => update(s => addCustom(s, c))} />
                    </Section>
                </div>
                <div className="lg:sticky lg:top-20">
                    <Section eyebrow={t('Бул апта')}>
                        <div className="flex items-end justify-between gap-4 pt-4">
                            <div>
                                <div className="font-display text-[3rem] leading-none tabular" style={{ color: 'var(--gold)' }}>{todayTotal(store)}</div>
                                <div className="text-[0.8rem] mt-1" style={{ color: 'var(--text-muted)' }}>{t('бүгүн')}</div>
                            </div>
                            <div className="text-right text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>{t('Жалпы: {0}', allTime(store))}</div>
                        </div>
                        <div className="grid grid-cols-7 gap-2 mt-5 items-end h-16" aria-label={t('Бул апта')}>
                            {week.map(d => (
                                <div key={d.key} className="flex flex-col items-center justify-end h-full gap-1" title={`${d.total}`}>
                                    <span className="w-full" style={{ height: `${Math.max(d.total > 0 ? 8 : 2, (d.total / weekMax) * 100)}%`, backgroundColor: d.key === todayKey ? 'var(--gold)' : d.total > 0 ? 'var(--gold-dim)' : 'var(--border-strong)', opacity: d.key === todayKey || d.total === 0 ? 1 : 0.6 }} />
                                    <span className="text-[0.62rem]" style={{ color: d.key === todayKey ? 'var(--gold)' : 'var(--text-muted)' }}>{WEEKDAY[d.date.getDay()]}</span>
                                </div>
                            ))}
                        </div>
                    </Section>
                    <Section eyebrow={t('Менин аптам')}>
                        <MyWeek totals={totals} synced={synced} />
                    </Section>
                    <p className="text-[0.8rem] italic mt-6" style={{ color: 'var(--text-muted)' }}>{synced ? t('Сандар капитандын формасына өзү жетет.') : t('Сандар ушул телефондо сакталат. Капитанга өзүңүз жөнөтөсүз.')}</p>
                </div>
            </div>
        </AppFrame>
    );
};
