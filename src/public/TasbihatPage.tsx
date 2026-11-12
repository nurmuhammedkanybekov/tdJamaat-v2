// Тасбихат: what is read after each prayer. A list of the five prayers (the
// one whose time it is now comes first), then the text itself: the words
// large and calm, the directions set apart, a counter on every line that is
// read more than once, and the meaning one tap away.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react';
import type { Theme } from '../theme';
import { useNow } from '../hooks/useNow';
import { loadCity } from '../utils/city';
import { PRAYER_NAMES, clock, prayerTimes } from '../utils/prayer';
import { t } from '../i18n';
import { PublicFrame } from './PublicFrame';
import { go } from './route';
import { useWakeLock } from './useWakeLock';
import type { Block, Line, Part, Tasbihat, TasbihatId } from './tasbihat';
import { NAARIA, TASBIHAT_ORDER, currentPrayer, isTasbihat, linesOf, loadTasbihat } from './tasbihat';

const KEY = 'tdjamaat-tasbihat-v1';
interface Store { size?: number; naaria?: number }
const read = (): Store => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store; } catch { return {}; } };
const write = (patch: Store) => { try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch })); } catch { /* not critical */ } };
const buzz = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch { /* no vibration on this device */ } };

const List: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const now = useNow();
    const city = loadCity();
    const times = prayerTimes(city, now);
    const current = currentPrayer(city, now);
    return (
        <PublicFrame title={t('Тасбихат')} back="" theme={theme} onToggleTheme={onToggleTheme}>
            <button onClick={() => go(`#/tasbihat/${current}`)} className="card lift w-full text-left mt-5 p-5 flex items-center gap-4" style={{ borderTop: '2px solid var(--gold)' }}>
                <span className="flex-1 min-w-0">
                    <span className="eyebrow block" style={{ color: 'var(--gold)' }}>{t('Азыр')}</span>
                    <span className="block font-display text-[1.6rem] leading-tight mt-0.5" style={{ color: 'var(--text-primary)' }}>{t('{0} намазынын тасбихаты', PRAYER_NAMES[current])}</span>
                    <span className="block text-[0.85rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('Намаздан кийин окулат')}</span>
                </span>
                <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--gold)' }} />
            </button>
            <ol className="mt-6">
                {TASBIHAT_ORDER.map((id, i) => (
                    <li key={id} style={{ borderTop: '1px solid var(--border)' }}>
                        <button onClick={() => go(`#/tasbihat/${id}`)} className="row-link w-full text-left py-4 px-1 flex items-center gap-4" aria-current={id === current ? 'true' : undefined}>
                            <span className="w-7 font-display text-[1.1rem] tabular" style={{ color: 'var(--gold)' }}>{i + 1}</span>
                            <span className="flex-1 min-w-0 font-display text-[1.3rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{PRAYER_NAMES[id]}</span>
                            {id === current && <span className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Азыр')}</span>}
                            <span className="text-[0.95rem] tabular" style={{ color: 'var(--text-muted)' }}>{clock(times[id], city.tz)}</span>
                        </button>
                    </li>
                ))}
                <li style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    <button onClick={() => go(`#/tasbihat/${NAARIA}`)} className="row-link w-full text-left py-4 px-1 flex items-center gap-4">
                        <span className="w-7 text-[1rem]" style={{ color: 'var(--gold)' }} aria-hidden="true">❃</span>
                        <span className="flex-1 min-w-0 font-display text-[1.3rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{t('Ан-Наария салаваты')}</span>
                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </button>
                </li>
            </ol>
            <p className="text-[0.78rem] italic mt-6" style={{ color: 'var(--text-muted)' }}>{t('Текст «Санарип таспихаттан» (addua.vercel.app) өзгөртүүсүз алынды.')}</p>
        </PublicFrame>
    );
};

const Words: React.FC<{ parts: Part[] }> = ({ parts }) => (
    <>
        {parts.map(([kind, text], i) => (
            kind === 1 ? <span key={i} className="tasbihat-note">{text}</span>
                : kind === 3 ? <span key={i} style={{ color: 'var(--gold)' }}>{text}</span>
                    : kind === 2 ? <strong key={i} className="font-semibold">{text}</strong>
                        : <React.Fragment key={i}>{text}</React.Fragment>
        ))}
    </>
);

// A line read several times: the line itself is the button.
const Repeated: React.FC<{ line: Line; centred: boolean }> = ({ line, centred }) => {
    const target = line.repeat!;
    const [count, setCount] = useState(0);
    const done = count >= target;
    const tap = () => {
        if (done) return;
        const next = count + 1;
        setCount(next);
        buzz(next >= target ? [40, 60, 120] : 10);
    };
    return (
        <span className={`tasbihat-repeat ${done ? 'is-done' : ''} ${centred ? 'justify-center' : ''}`}>
            <button type="button" onClick={tap} className="tasbihat-repeat-tap" aria-label={t('Саноо: {0} / {1}', count, target)}>
                <span className="flex-1 min-w-0"><Words parts={line.parts} /></span>
                <span className="tasbihat-count tabular" aria-hidden="true">
                    {done ? <Check className="w-4 h-4" /> : <><span className="font-display text-[1.25em] leading-none" style={{ color: count > 0 ? 'var(--gold)' : undefined }}>{count}</span><span className="opacity-70"> / {target}</span></>}
                </span>
            </button>
            {count > 0 && <button type="button" onClick={() => setCount(0)} className="tasbihat-reset" aria-label={t('Кайра баштоо')}><RotateCcw className="w-3.5 h-3.5" /></button>}
        </span>
    );
};

const Meaning: React.FC<{ block: Block }> = ({ block }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="mt-2">
            <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="inline-flex items-center gap-1.5 py-1 text-[0.68rem] tracking-[0.18em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: open ? 'var(--gold)' : 'var(--text-muted)' }}>
                {t('Мааниси')}<ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="tasbihat-meaning animate-fade-up">
                    {block.ar?.map((a, i) => <p key={`a${i}`} dir="rtl" lang="ar" className="quran-text text-[1.5rem] leading-[2.1] mb-3" style={{ color: 'var(--text-primary)' }}>{a}</p>)}
                    {block.m?.map((m, i) => <p key={i} className={i > 0 ? 'mt-2' : ''}>{m}</p>)}
                </div>
            )}
        </div>
    );
};

const Paragraph: React.FC<{ block: Block }> = ({ block }) => {
    const lines = useMemo(() => linesOf(block.parts ?? []), [block.parts]);
    const centred = !!block.c;
    return (
        <div className={`tasbihat-p ${centred ? 'text-center' : ''} ${block.b ? 'is-lead' : ''}`}>
            {lines.map((line, i) => (
                line.repeat ? <Repeated key={i} line={line} centred={centred} /> : <span key={i} className="block"><Words parts={line.parts} /></span>
            ))}
            {(block.m?.length || block.ar?.length) ? <Meaning block={block} /> : null}
        </div>
    );
};

// The Naaria salawat is counted without an end: a counter that stays.
const OpenCounter: React.FC = () => {
    const [count, setCount] = useState(() => read().naaria ?? 0);
    const set = (n: number) => { setCount(n); write({ naaria: n }); };
    return (
        <div className="text-center mt-8 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={() => { set(count + 1); buzz(12); }} className="zikr-tap mx-auto w-44 h-44 rounded-full inline-flex flex-col items-center justify-center" style={{ border: '1px solid var(--gold)' }} aria-label={t('Саноо: {0}', count)}>
                <span key={count} className="zikr-number font-display text-[3.4rem] leading-none tabular" style={{ color: 'var(--text-primary)' }}>{count}</span>
                <span className="eyebrow mt-2">{t('Басыңыз')}</span>
            </button>
            <div className="mt-5 flex justify-center gap-3">
                <button type="button" className="btn btn-ghost disabled:opacity-30" disabled={count === 0} onClick={() => set(Math.max(0, count - 1))} aria-label={t('Бирди артка')}><Minus className="w-4 h-4" />1</button>
                <button type="button" className="btn btn-ghost disabled:opacity-30" disabled={count === 0} onClick={() => { if (window.confirm(t('Эсепти нөлдөн баштайбы?'))) set(0); }}><RotateCcw className="w-4 h-4" />{t('Кайра')}</button>
            </div>
        </div>
    );
};

const Reader: React.FC<{ id: string; theme: Theme; onToggleTheme: () => void }> = ({ id, theme, onToggleTheme }) => {
    const [data, setData] = useState<Tasbihat | null>(null);
    const [failed, setFailed] = useState(false);
    const [size, setSize] = useState(() => read().size ?? 1.2);
    const [attempt, setAttempt] = useState(0);
    useWakeLock();
    useEffect(() => {
        let alive = true;
        loadTasbihat(id).then(d => { if (alive) setData(d); }).catch(() => { if (alive) setFailed(true); });
        return () => { alive = false; };
    }, [id, attempt]);
    useEffect(() => { window.scrollTo(0, 0); }, [id]);
    const resize = (by: number) => setSize(s => { const next = Math.min(1.9, Math.max(0.95, Math.round((s + by) * 100) / 100)); write({ size: next }); return next; });

    // How far through the text the reader is.
    const bar = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const onScroll = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [data]);

    const order = TASBIHAT_ORDER as string[];
    const at = order.indexOf(id);
    const next = at >= 0 && at < order.length - 1 ? (order[at + 1] as TasbihatId) : null;
    const title = at >= 0 ? t('{0} намазы', PRAYER_NAMES[id as TasbihatId]) : t('Ан-Наария салаваты');

    return (
        <PublicFrame title={title} back="#/tasbihat" theme={theme} onToggleTheme={onToggleTheme}>
            <div ref={bar} className="tasbihat-progress" aria-hidden="true" />
            {failed && (
                <div className="text-center py-16">
                    <p style={{ color: 'var(--text-secondary)' }}>{t('Жүктөлгөн жок. Интернетти текшериңиз.')}</p>
                    <button className="btn btn-ghost mt-4" onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>{t('Кайра аракет кылуу')}</button>
                </div>
            )}
            {!data && !failed && <div className="py-24 flex justify-center" aria-busy="true"><div className="skeleton h-1 w-24" /></div>}
            {data && (
                <article className="tasbihat pt-6 pb-28" style={{ fontSize: `${size}rem` }} lang="ky">
                    {data.blocks.map((b, i) => (
                        b.t === 'h' ? <h2 key={i} className="tasbihat-head">{b.v}</h2> : <Paragraph key={i} block={b} />
                    ))}
                    {id === NAARIA && <OpenCounter />}
                    {next && (
                        <button onClick={() => go(`#/tasbihat/${next}`)} className="mt-10 w-full flex items-center justify-center gap-2 py-3 text-[0.72rem] tracking-[0.2em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                            {t('Кийинки: {0}', PRAYER_NAMES[next])}<ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </article>
            )}
            <div className="fixed left-0 right-0 bottom-0 z-20 page-gutter" style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))', paddingTop: '0.6rem', backgroundColor: 'color-mix(in oklab, var(--page-plane) 94%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}>
                <div className="mx-auto max-w-[40rem] flex items-center justify-center gap-1">
                    <button className="btn btn-ghost btn-icon" onClick={() => resize(-0.1)} aria-label={t('Тамганы кичирейтүү')}><Minus className="w-4 h-4" /></button>
                    <span className="font-display text-[1.15rem] w-10 text-center" aria-hidden="true" style={{ color: 'var(--text-secondary)' }}>Аа</span>
                    <button className="btn btn-ghost btn-icon" onClick={() => resize(0.1)} aria-label={t('Тамганы чоңойтуу')}><Plus className="w-4 h-4" /></button>
                </div>
            </div>
        </PublicFrame>
    );
};

export const TasbihatPage: React.FC<{ arg: string | null; theme: Theme; onToggleTheme: () => void }> = ({ arg, theme, onToggleTheme }) => (
    isTasbihat(arg) ? <Reader key={arg} id={arg} theme={theme} onToggleTheme={onToggleTheme} /> : <List theme={theme} onToggleTheme={onToggleTheme} />
);
