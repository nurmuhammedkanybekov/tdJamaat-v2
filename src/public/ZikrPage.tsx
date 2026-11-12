// Зикир: choose what to count, then count with the whole screen as the
// button. Counts stay on this device (src/utils/zikr.ts); nothing is sent.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Minus, RotateCcw } from 'lucide-react';
import type { Theme } from '../theme';
import type { Zikr, ZikrStore } from '../utils/zikr';
import { AFTER_PRAYER, ZIKRS, addCount, allTime, lastDays, loadZikr, resetCurrent, saveZikr, setTarget, streak, targetOf, todayOf, todayTotal } from '../utils/zikr';
import { t } from '../i18n';
import { PublicFrame } from './PublicFrame';
import { go } from './route';
import { useWakeLock } from './useWakeLock';

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

const Counter: React.FC<{ zikr: Zikr; store: ZikrStore; update: (fn: (s: ZikrStore) => ZikrStore) => ZikrStore; sequence?: { index: number; onDone: () => void } }> = ({ zikr, store, update, sequence }) => {
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
        <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 5.5rem)' }}>
            {/* The whole upper area is the button. */}
            <button onClick={tap} className="zikr-tap flex-1 flex flex-col items-center justify-center text-center select-none py-6 w-full" aria-label={t('Саноо: {0}', zikr.reading)}>
                {sequence && <div className="eyebrow mb-3" style={{ color: 'var(--gold)' }}>{t('Намаздан кийин · {0} / 3', sequence.index + 1)}</div>}
                <div dir="rtl" lang="ar" className="quran-text text-[2.1rem] sm:text-[2.5rem] leading-[1.9] px-2" style={{ color: 'var(--text-primary)' }}>{zikr.arabic}</div>
                <div className="font-display text-[1.25rem] mt-1" style={{ color: 'var(--gold)' }}>{zikr.reading}</div>
                <div className="text-[0.85rem] italic mt-0.5 mb-6 max-w-[26rem]" style={{ color: 'var(--text-muted)' }}>{zikr.meaning}</div>
                <Ring value={count} target={target} full={done}>
                    <span key={pulse} className="zikr-number font-display tabular leading-none" style={{ fontSize: 'clamp(4.5rem, 24vw, 7rem)', color: done ? 'var(--gold)' : 'var(--text-primary)' }}>{target > 0 && !done ? inRound : target > 0 ? target : count}</span>
                    <span className="text-[0.9rem] mt-2 tabular" style={{ color: 'var(--text-muted)' }}>
                        {done ? <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--gold)' }}><Check className="w-4 h-4" />{t('Толду')}</span>
                            : target > 0 ? <>/ {target}{rounds > 0 && <span style={{ color: 'var(--gold)' }}> · ×{rounds}</span>}</> : t('чексиз')}
                    </span>
                </Ring>
                <div className="text-[0.82rem] mt-6" style={{ color: 'var(--text-muted)' }}>{t('Саноо үчүн экрандын каалаган жерин басыңыз')}</div>
            </button>

            {/* Controls: small, at the bottom, away from the counting thumb. */}
            <div className="pb-2">
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

export const ZikrPage: React.FC<{ arg: string | null; theme: Theme; onToggleTheme: () => void }> = ({ arg, theme, onToggleTheme }) => {
    const [store, setStore] = useState<ZikrStore>(loadZikr);
    const ref = useRef(store);
    const update = useCallback((fn: (s: ZikrStore) => ZikrStore) => {
        const next = fn(ref.current);
        ref.current = next; saveZikr(next); setStore(next);
        return next;
    }, []);
    const week = useMemo(() => lastDays(store, 7), [store]);
    const weekMax = Math.max(1, ...week.map(d => d.total));

    // The after-prayer set: three counters in a row.
    const [step, setStep] = useState(0);
    const startSet = useCallback(() => { update(s => AFTER_PRAYER.reduce((acc, _, i) => resetCurrent(acc, `namaz:${i}`), s)); setStep(0); }, [update]);
    // Every visit to the set starts it from the beginning.
    const inSet = arg === 'namaz';
    useEffect(() => { startSet(); }, [inSet, startSet]);
    if (arg === 'namaz') {
        if (step >= AFTER_PRAYER.length) {
            return (
                <PublicFrame title={t('Намаздан кийинки тасбих')} back="#/zikr" theme={theme} onToggleTheme={onToggleTheme}>
                    <div className="text-center py-20">
                        <div className="mx-auto w-16 h-16 rounded-full inline-flex items-center justify-center pop-in" style={{ border: '1px solid var(--gold)', color: 'var(--gold)' }}><Check className="w-7 h-7" /></div>
                        <div className="font-display text-[2.2rem] mt-6" style={{ color: 'var(--text-primary)' }}>{t('Тасбих толду')}</div>
                        <div className="text-[0.95rem] mt-2 tabular" style={{ color: 'var(--text-muted)' }}>33 + 33 + 34 = 100</div>
                        <div className="flex flex-wrap justify-center gap-3 mt-8">
                            <button onClick={startSet} className="btn btn-ghost"><RotateCcw className="w-4 h-4" />{t('Кайра')}</button>
                            <button onClick={() => go('#/zikr')} className="btn btn-primary">{t('Даяр')}</button>
                        </div>
                    </div>
                </PublicFrame>
            );
        }
        const z = ZIKRS.find(x => x.id === AFTER_PRAYER[step].id)!;
        return (
            <PublicFrame title={t('Намаздан кийинки тасбих')} back="#/zikr" theme={theme} onToggleTheme={onToggleTheme}>
                <Counter key={z.id + step} zikr={z} store={store} update={update} sequence={{ index: step, onDone: () => setStep(n => n + 1) }} />
            </PublicFrame>
        );
    }

    const zikr = ZIKRS.find(z => z.id === arg);
    if (zikr) {
        return (
            <PublicFrame title={zikr.reading} back="#/zikr" theme={theme} onToggleTheme={onToggleTheme}>
                <Counter key={zikr.id} zikr={zikr} store={store} update={update} />
            </PublicFrame>
        );
    }

    return (
        <PublicFrame title={t('Зикир')} back="" theme={theme} onToggleTheme={onToggleTheme}>
            {/* Today, the last seven days, the run of days. */}
            <section className="card card-pad mt-5">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <div className="eyebrow">{t('Бүгүн')}</div>
                        <div className="font-display text-[3rem] leading-none tabular mt-1" style={{ color: 'var(--gold)' }}>{todayTotal(store)}</div>
                    </div>
                    <div className="text-right text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>
                        {streak(store) > 1 && <div>{t('Катары менен {0} күн', streak(store))}</div>}
                        <div>{t('Жалпы: {0}', allTime(store))}</div>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-2 mt-5 items-end h-16" aria-label={t('Акыркы 7 күн')}>
                    {week.map((d, i) => (
                        <div key={d.key} className="flex flex-col items-center justify-end h-full gap-1" title={`${d.total}`}>
                            <span className="w-full" style={{ height: `${Math.max(d.total > 0 ? 8 : 2, (d.total / weekMax) * 100)}%`, backgroundColor: i === 6 ? 'var(--gold)' : d.total > 0 ? 'var(--gold-dim)' : 'var(--border-strong)', opacity: i === 6 || d.total === 0 ? 1 : 0.6 }} />
                            <span className="text-[0.62rem]" style={{ color: i === 6 ? 'var(--gold)' : 'var(--text-muted)' }}>{WEEKDAY[d.date.getDay()]}</span>
                        </div>
                    ))}
                </div>
            </section>

            <button onClick={() => go('#/zikr/namaz')} className="card lift w-full text-left mt-4 p-5 flex items-center gap-4" style={{ borderTop: '2px solid var(--gold)' }}>
                <span className="flex-1 min-w-0">
                    <span className="block font-display text-[1.45rem]" style={{ color: 'var(--text-primary)' }}>{t('Намаздан кийинки тасбих')}</span>
                    <span className="block text-[0.85rem] tabular" style={{ color: 'var(--text-muted)' }}>{t('Субханаллах 33 · Алхамдулиллах 33 · Аллаху акбар 34')}</span>
                </span>
                <ChevronRight className="w-5 h-5" style={{ color: 'var(--gold)' }} />
            </button>

            <ul className="mt-6">
                {ZIKRS.map(z => {
                    const today = todayOf(store, z.id), target = targetOf(store, z);
                    return (
                        <li key={z.id} style={{ borderTop: '1px solid var(--border)' }}>
                            <button onClick={() => go(`#/zikr/${z.id}`)} className="row-link w-full text-left py-4 px-1 flex items-center gap-4">
                                <span className="flex-1 min-w-0">
                                    <span className="block font-display text-[1.25rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{z.reading}</span>
                                    <span className="block text-[0.82rem] italic truncate" style={{ color: 'var(--text-muted)' }}>{z.meaning}</span>
                                </span>
                                <span dir="rtl" lang="ar" className="quran-text text-[1.35rem] hidden min-[420px]:block max-w-[11rem] truncate" style={{ color: 'var(--text-secondary)' }}>{z.arabic}</span>
                                <span className="w-14 text-right flex-shrink-0">
                                    <span className="block font-display text-[1.3rem] tabular leading-none" style={{ color: today > 0 ? 'var(--gold)' : 'var(--text-muted)' }}>{today}</span>
                                    <span className="block text-[0.68rem] tabular mt-0.5" style={{ color: 'var(--text-muted)' }}>{target > 0 ? `/ ${target}` : '∞'}</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            <p className="text-[0.8rem] italic mt-6" style={{ color: 'var(--text-muted)' }}>{t('Сандар ушул телефондо гана сакталат жана эч кимге жөнөтүлбөйт.')}</p>
        </PublicFrame>
    );
};
