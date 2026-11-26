// Тасбихат: what is read after each prayer. The list (the prayer whose time
// it is now first, with what has been read today), then the text: the words
// large and calm, the directions in gold, a counter on every line that is read
// more than once, the meaning one tap away (or all at once), and — for the
// Quran passage that closes each tasbihat — the ayahs themselves from the
// mushaf. At the end, "read": it counts towards the week (ТСП).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react';
import type { Theme } from '../theme';
import { useNow } from '../hooks/useNow';
import { loadCity } from '../utils/city';
import { PRAYER_NAMES, clock, prayerTimes } from '../utils/prayer';
import { t } from '../i18n';
import { AppFrame, Problem, Section, Waiting } from './AppFrame';
import { go } from './route';
import { useWakeLock } from './useWakeLock';
import type { Block, Line, Part, Tasbihat, TasbihatId } from './tasbihat';
import { NAARIA, TASBIHAT_ORDER, currentPrayer, isTasbihat, linesOf, loadTasbihat } from './tasbihat';
import type { Ayah } from './quranData';
import { loadSurah } from './quranData';
import { loadPractice, markTasbihat, savePractice, tasbihatDone } from './practice';
import { dayKey } from '../utils/zikr';
import ARABIC from './tasbihat/arabic.json';

/** The verified Arabic for a paragraph (README in ./tasbihat), if there is one. */
const arabicFor = (block: Block): { ar: string; src: string } | null => {
    const text = (block.parts ?? []).map(p => p[1]).join('').trim();
    const hit = (ARABIC as Array<{ prefix: string; ar: string; src: string }>).find(e => text.startsWith(e.prefix));
    return hit ? { ar: hit.ar, src: hit.src } : null;
};

/** «ХАШР» СҮРӨСҮ → «Хашр» сүрөсү: the source's capitals, as a title. */
const titleCase = (v: string) => v.toLocaleLowerCase('ky').replace(/(^|«|")(\p{L})/u, (_m, a: string, b: string) => a + b.toLocaleUpperCase('ky'));

const KEY = 'tdjamaat-tasbihat-v1';
interface Store { size?: number; naaria?: number; meanings?: boolean; script?: Script }
type Script = 'cyr' | 'ar';
const read = (): Store => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store; } catch { return {}; } };
const write = (patch: Store) => { try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch })); } catch { /* not critical */ } };
const buzz = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch { /* no vibration on this device */ } };

/** The Quran passage that closes each tasbihat (by the heading the source gives it). */
const PASSAGES: Record<string, { surah: number; from: number; to: number }> = {
    '«ХАШР» СҮРӨСҮ': { surah: 59, from: 20, to: 24 },
    '«ФАТХ» СҮРӨСҮ': { surah: 48, from: 27, to: 29 },
    '«НАБАА» СҮРӨСҮ': { surah: 78, from: 31, to: 40 },
    '«БАКАРА» СҮРӨСҮ': { surah: 2, from: 285, to: 286 }
};

/** The week (Thursday → Wednesday) as five rows of seven: what was read. */
const WeekGrid: React.FC<{ now: Date }> = ({ now }) => {
    const practice = loadPractice();
    const back = (now.getDay() - 4 + 7) % 7;
    const days = Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - back + i));
    const DAY = [t('Жш'), t('Дш'), t('Шш'), t('Шр'), t('Бш'), t('Жм'), t('Иш')];
    let total = 0;
    return (
        <div className="pt-4">
            <div className="grid gap-y-2.5 items-center" style={{ gridTemplateColumns: '5.5rem repeat(7, minmax(0, 1fr))' }}>
                <span />
                {days.map(d => <span key={d.toISOString()} className="text-center text-[0.66rem] tracking-[0.08em] uppercase" style={{ color: d.toDateString() === now.toDateString() ? 'var(--gold)' : 'var(--text-muted)' }}>{DAY[d.getDay()]}</span>)}
                {TASBIHAT_ORDER.map(id => (
                    <React.Fragment key={id}>
                        <span className="text-[0.85rem] truncate" style={{ color: 'var(--text-secondary)' }}>{PRAYER_NAMES[id]}</span>
                        {days.map(d => {
                            const done = (practice.tasbihat[dayKey(d)] ?? []).includes(id);
                            if (done) total++;
                            const future = d.getTime() > now.getTime();
                            return <span key={d.toISOString()} className="flex justify-center"><span className="w-3 h-3 rotate-45" style={{ backgroundColor: done ? 'var(--gold)' : 'transparent', border: `1px solid ${future ? 'var(--border)' : done ? 'var(--gold)' : 'var(--border-strong)'}` }} /></span>;
                        })}
                    </React.Fragment>
                ))}
            </div>
            <p className="text-[0.8rem] mt-3" style={{ color: 'var(--text-muted)' }}>{t('Ушул апта: {0} / 35 · аптанын эсебине кошулат (ТСП)', total)}</p>
        </div>
    );
};

const List: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const now = useNow();
    const city = loadCity();
    const times = prayerTimes(city, now);
    const current = currentPrayer(city, now);
    const practice = loadPractice();
    const doneNow = tasbihatDone(practice, current, now);
    return (
        <AppFrame page="tasbihat" title={t('Тасбихат')} kicker={t('Намаздан кийин')} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[46rem] mx-auto">
                {/* The prayer whose time it is: the one to open. */}
                <button onClick={() => go(`#/tasbihat/${current}`)} className="t-now">
                    <span className="eyebrow block" style={{ color: 'var(--gold)' }}>{doneNow ? t('Азыр · окулду') : t('Азыр')}</span>
                    <span className="block font-display text-[3rem] sm:text-[3.6rem] leading-none mt-3" style={{ color: 'var(--text-primary)' }}>{PRAYER_NAMES[current]}</span>
                    <span className="inline-flex items-center gap-2 mt-4 text-[0.72rem] tracking-[0.2em] uppercase" style={{ color: 'var(--gold)' }}>{t('Баштоо')}<ChevronRight className="w-3.5 h-3.5" /></span>
                </button>
                <Section eyebrow={t('Беш убак')}>
                    <ol>
                        {TASBIHAT_ORDER.map(id => {
                            const done = tasbihatDone(practice, id, now);
                            return (
                                <li key={id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <button onClick={() => go(`#/tasbihat/${id}`)} className="row-link w-full text-left py-4 px-1 flex items-center gap-4" aria-current={id === current ? 'true' : undefined}>
                                        <span className="w-7 h-7 rotate-45 inline-flex items-center justify-center flex-shrink-0 mx-1" style={{ border: '1px solid var(--gold)', backgroundColor: done ? 'var(--gold)' : 'transparent' }} aria-label={done ? t('бүгүн окулду') : undefined}>
                                            {done ? <Check className="w-3.5 h-3.5 -rotate-45" style={{ color: 'var(--page-plane)' }} /> : null}
                                        </span>
                                        <span className="flex-1 min-w-0 font-display text-[1.4rem] leading-tight" style={{ color: id === current ? 'var(--gold)' : 'var(--text-primary)' }}>{PRAYER_NAMES[id]}</span>
                                        <span className="font-display text-[1.2rem] tabular" style={{ color: 'var(--text-muted)' }}>{clock(times[id], city.tz)}</span>
                                    </button>
                                </li>
                            );
                        })}
                        <li style={{ borderBottom: '1px solid var(--border)' }}>
                            <button onClick={() => go(`#/tasbihat/${NAARIA}`)} className="row-link w-full text-left py-4 px-1 flex items-center gap-4">
                                <span className="w-9 text-center text-[1.1rem]" style={{ color: 'var(--gold)' }} aria-hidden="true">❃</span>
                                <span className="flex-1 min-w-0 font-display text-[1.4rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{t('Ан-Наария салаваты')}</span>
                                <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            </button>
                        </li>
                    </ol>
                </Section>
                <Section eyebrow={t('Бул апта')}>
                    <WeekGrid now={now} />
                </Section>
                <p className="text-[0.78rem] italic mt-8" style={{ color: 'var(--text-muted)' }}>{t('Текст «Санарип таспихаттан» (addua.vercel.app) өзгөртүүсүз алынды. Куран аяттары — Мадина мусхафынан.')}</p>
            </div>
        </AppFrame>
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
                <span className="tasbihat-ring tabular" aria-hidden="true" style={{ ['--p' as string]: `${Math.min(1, count / target) * 360}deg` }}>
                    <span className="tasbihat-ring-in">{done ? <Check className="w-4 h-4" /> : <><span className="font-display text-[1.15em] leading-none">{count}</span><span className="text-[0.62em] opacity-70">/{target}</span></>}</span>
                </span>
            </button>
            {count > 0 && <button type="button" onClick={() => setCount(0)} className="tasbihat-reset" aria-label={t('Кайра баштоо')}><RotateCcw className="w-3.5 h-3.5" /></button>}
        </span>
    );
};

const Meaning: React.FC<{ block: Block; all: boolean }> = ({ block, all }) => {
    const [open, setOpen] = useState(all);
    useEffect(() => setOpen(all), [all]);
    return (
        <div className="mt-2">
            <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="inline-flex items-center gap-1.5 py-2.5 text-[0.68rem] tracking-[0.18em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: open ? 'var(--gold)' : 'var(--text-muted)' }}>
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

/** The ayahs of a passage, from the mushaf: what the Kyrgyz letters above spell. */
const Passage: React.FC<{ surah: number; from: number; to: number }> = ({ surah, from, to }) => {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<Ayah[] | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => { if (open && !rows) loadSurah(surah).then(setRows).catch(() => setFailed(true)); }, [open, rows, surah]);
    return (
        <div className="mt-3 text-center">
            <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="inline-flex items-center gap-1.5 py-2.5 text-[0.68rem] tracking-[0.18em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: open ? 'var(--gold)' : 'var(--text-muted)' }}>
                {t('Арабча (мусхафтан)')}<ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="mt-2 py-4 animate-fade-up" style={{ borderTop: '1px solid var(--gold-dim)', borderBottom: '1px solid var(--gold-dim)' }}>
                    {failed && <p className="text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>{t('Жүктөлгөн жок. Интернетти текшериңиз.')}</p>}
                    {rows && <p dir="rtl" lang="ar" className="quran-text quran-body text-[1.6rem]" style={{ color: 'var(--text-primary)' }}>{rows.slice(from - 1, to).map(r => r[0]).join(' ')}</p>}
                    <button type="button" onClick={() => go(`#/quran/${surah}:${from}`)} className="hit mt-3 text-[0.72rem] tracking-[0.16em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}>{t('Куранда ачуу')} · {surah}:{from}–{to}</button>
                </div>
            )}
        </div>
    );
};

const Paragraph: React.FC<{ block: Block; all: boolean; script: Script }> = ({ block, all, script }) => {
    const lines = useMemo(() => linesOf(block.parts ?? []), [block.parts]);
    const centred = !!block.c;
    const arabic = script === 'ar' ? arabicFor(block) : null;
    if (arabic) {
        // The verified Arabic in place of the Kyrgyz letters; the directions stay.
        const notes = (block.parts ?? []).filter(([k]) => k === 1 || k === 3);
        return (
            <div className="tasbihat-p">
                <p dir="rtl" lang="ar" className="quran-text tasbihat-ar">{arabic.ar}</p>
                <div className="text-center text-[0.72em] mt-1" style={{ color: 'var(--text-muted)' }}>{arabic.src}</div>
                {notes.length > 0 && <div className="text-center mt-1"><Words parts={notes} /></div>}
                {(block.m?.length) ? <Meaning block={{ ...block, ar: undefined }} all={all} /> : null}
            </div>
        );
    }
    return (
        <div className={`tasbihat-p ${centred ? 'text-center' : ''} ${block.b ? 'is-lead' : ''}`}>
            {lines.map((line, i) => (
                line.repeat ? <Repeated key={i} line={line} centred={centred} /> : <span key={i} className="block"><Words parts={line.parts} /></span>
            ))}
            {(block.m?.length || block.ar?.length) ? <Meaning block={block} all={all} /> : null}
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
    const [all, setAll] = useState(() => !!read().meanings);
    const [script, setScript] = useState<Script>(() => read().script ?? 'cyr');
    const [attempt, setAttempt] = useState(0);
    const [done, setDone] = useState(() => tasbihatDone(loadPractice(), id));
    useWakeLock();
    useEffect(() => {
        let alive = true;
        loadTasbihat(id).then(d => { if (alive) setData(d); }).catch(() => { if (alive) setFailed(true); });
        return () => { alive = false; };
    }, [id, attempt]);
    useEffect(() => { window.scrollTo(0, 0); }, [id]);
    const resize = (by: number) => setSize(s => { const next = Math.min(1.9, Math.max(0.95, Math.round((s + by) * 100) / 100)); write({ size: next }); return next; });
    const toggleAll = () => setAll(v => { write({ meanings: !v }); return !v; });
    const finish = () => {
        const next = !done;
        savePractice(markTasbihat(loadPractice(), id, next));
        setDone(next);
        if (next) buzz([30, 50, 90]);
    };

    // How far through the text the reader is, and which part is on screen.
    const bar = useRef<HTMLDivElement>(null);
    const [part, setPart] = useState(0);
    useEffect(() => {
        const onScroll = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
            const heads = [...document.querySelectorAll<HTMLElement>('[data-part]')];
            let cur = 0;
            for (const h of heads) if (h.getBoundingClientRect().top < 140) cur = Number(h.dataset.part);
            setPart(cur);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [data]);
    // Keep the chip of the part on screen visible in the strip.
    const strip = useRef<HTMLDivElement>(null);
    useEffect(() => { strip.current?.querySelector<HTMLElement>(`[data-chip="${part}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [part]);

    const order = TASBIHAT_ORDER as string[];
    const at = order.indexOf(id);
    const isPrayer = at >= 0;
    const next = isPrayer && at < order.length - 1 ? (order[at + 1] as TasbihatId) : null;
    const title = isPrayer ? t('{0} намазы', PRAYER_NAMES[id as TasbihatId]) : t('Ан-Наария салаваты');
    const heads = (data?.blocks ?? []).map((b, i) => ({ b, i })).filter(x => x.b.t === 'h');
    const hasArabic = (data?.blocks ?? []).some(b => b.t === 'p' && arabicFor(b));
    const chooseScript = (v: Script) => { setScript(v); write({ script: v }); };

    return (
        <AppFrame page="tasbihat" title={title} back="#/tasbihat" theme={theme} onToggleTheme={onToggleTheme} ownBar>
            <div ref={bar} className="tasbihat-progress" aria-hidden="true" />
            {failed && <Problem onRetry={() => { setFailed(false); setAttempt(n => n + 1); }} />}
            {!data && !failed && <Waiting />}
            {data && (
                <>
                    {/* The parts of the text, always at hand: where you are, and a tap to go. */}
                    {heads.length > 0 && (
                        <div className="sticky top-0 z-30 quran-modebar">
                            <div ref={strip} className="mx-auto max-w-[46rem] flex items-center gap-1 overflow-x-auto h-12" style={{ scrollbarWidth: 'none' }} role="tablist" aria-label={t('Бөлүмдөр')}>
                                {heads.map(({ b, i }, k) => (
                                    <button key={i} data-chip={k + 1} role="tab" aria-selected={part === k + 1} onClick={() => document.getElementById(`s${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                        className="flex-shrink-0 px-3 h-8 text-[0.82rem] whitespace-nowrap transition-colors" style={{ color: part === k + 1 ? 'var(--gold)' : 'var(--text-muted)', borderBottom: `1px solid ${part === k + 1 ? 'var(--gold)' : 'transparent'}` }}>
                                        <span className="font-display tabular mr-1.5">{k + 1}</span>{titleCase(b.v ?? '')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <article className="tasbihat pt-6 pb-10 max-w-[42rem] mx-auto w-full" style={{ fontSize: `${size}rem` }} lang="ky">
                        <header className="text-center pt-4 pb-2">
                            <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Тасбихат')}</div>
                            <h1 className="font-display text-[2.3rem] sm:text-[2.8rem] leading-tight mt-1" style={{ color: 'var(--text-primary)' }}>{title}</h1>
                            {heads.length > 0 && <div className="text-[0.8rem] mt-1" style={{ color: 'var(--text-muted)' }}>{t('{0} бөлүм', heads.length)}</div>}
                        </header>
                        {script === 'ar' && hasArabic && (
                            <p className="text-[0.75em] italic text-center mt-3 px-4" style={{ color: 'var(--text-muted)' }}>{t('Арабча текст текшерилген булагы бар жерде гана берилет: Куран аяттары жана «Хисн аль-Муслимдеги» дуба. Калганы кыргыз тамгалары менен.')}</p>
                        )}
                        {data.blocks.map((b, i) => {
                            if (b.t !== 'h') return <Paragraph key={i} block={b} all={all} script={script} />;
                            const k = heads.findIndex(x => x.i === i) + 1;
                            const passage = PASSAGES[b.v ?? ''];
                            return (
                                <React.Fragment key={i}>
                                    <h2 id={`s${i}`} data-part={k} className="tasbihat-head">
                                        <span className="tasbihat-head-num"><span>{k}</span></span>
                                        <span className="tasbihat-head-title">{titleCase(b.v ?? '')}</span>
                                    </h2>
                                    {passage && script !== 'ar' && <Passage {...passage} />}
                                </React.Fragment>
                            );
                        })}
                        {id === NAARIA && <OpenCounter />}
                        {isPrayer && (
                            <div className="mt-12 pt-10 text-center tasbihat-finish">
                                <button type="button" onClick={finish} aria-pressed={done} className={`tasbihat-done ${done ? 'is-done' : ''}`}>
                                    <Check className="w-7 h-7" />
                                </button>
                                <div className="font-display text-[1.5rem] mt-4" style={{ color: done ? 'var(--gold)' : 'var(--text-primary)' }}>{done ? t('Бүгүн окулду') : t('Окудум')}</div>
                                <p className="text-[0.78rem] mt-1" style={{ color: 'var(--text-muted)' }}>{t('Аптанын эсебине кошулат (ТСП).')}</p>
                            </div>
                        )}
                        {next && (
                            <button onClick={() => go(`#/tasbihat/${next}`)} className="mt-8 w-full flex items-center justify-center gap-2 py-3 text-[0.72rem] tracking-[0.2em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                                {t('Кийинки: {0}', PRAYER_NAMES[next])}<ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </article>
                </>
            )}
            <div className="fixed left-0 right-0 bottom-0 z-30 page-gutter" style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))', paddingTop: '0.6rem', backgroundColor: 'color-mix(in oklab, var(--page-plane) 94%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}>
                <div className="mx-auto max-w-[42rem] flex items-center justify-between gap-1">
                    <div className="flex items-center" role="group" aria-label={t('Жазуу')}>
                        <button className={`chip ${script === 'cyr' ? 'is-active' : ''}`} aria-pressed={script === 'cyr'} onClick={() => chooseScript('cyr')}>{t('Кирилл')}</button>
                        <button className={`chip ${script === 'ar' ? 'is-active' : ''}`} aria-pressed={script === 'ar'} onClick={() => chooseScript('ar')} style={{ fontFamily: 'var(--font-serif)' }}>{t('Арабча')}</button>
                    </div>
                    <button className={`chip ${all ? 'is-active' : ''}`} aria-pressed={all} onClick={toggleAll}>{t('Мааниси')}</button>
                    <div className="flex items-center">
                        <button className="btn btn-ghost btn-icon" onClick={() => resize(-0.1)} aria-label={t('Тамганы кичирейтүү')}><Minus className="w-4 h-4" /></button>
                        <button className="btn btn-ghost btn-icon" onClick={() => resize(0.1)} aria-label={t('Тамганы чоңойтуу')}><Plus className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
        </AppFrame>
    );
};

export const TasbihatPage: React.FC<{ arg: string | null; theme: Theme; onToggleTheme: () => void }> = ({ arg, theme, onToggleTheme }) => (
    isTasbihat(arg) ? <Reader key={arg} id={arg} theme={theme} onToggleTheme={onToggleTheme} /> : <List theme={theme} onToggleTheme={onToggleTheme} />
);
