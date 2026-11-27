// Куран. The contents (surahs or juz, a search that understands «бакара»,
// «baqara» or «2:255», where you stopped, saved ayahs) and the reader:
// ayah by ayah with the meaning under each, or the mushaf's continuous text.
// The Arabic is the King Fahd Complex's text in its own typeface; the meaning
// is a published translation (quranData.ts). Nothing is typed in by hand.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, Check, ChevronLeft, ChevronDown, ChevronRight, Copy, Hash, Loader2, Minus, Pause, Play, Plus, Search, X } from 'lucide-react';
import { RECITERS, loadReciter, recite, saveReciter, stopRecitation, useRecitation } from './recitation';
import type { Theme } from '../theme';
import { t } from '../i18n';
import { AppFrame, Problem, Waiting } from './AppFrame';
import { go } from './route';
import { useWakeLock } from './useWakeLock';
import type { Ayah, Rendering, Surah } from './quranData';
import { QuranGoTo } from './QuranGoTo';
import { basmalaOf, cachedIndex, cachedSurah, loadIndex, loadJuz, loadSurah, loadTranslation, sourceNote, translationLang, withoutNumber } from './quranData';
import type { ReadMode } from './quranStore';
import { isMarked, loadLastRead, loadMarks, loadMode, loadSize, parseRef, saveLastRead, saveMode, saveSize, searchKey, toggleMark } from './quranStore';
import { addPages, loadPractice, pageReadToday, pagesOn, removePage, savePractice } from './practice';

const useIndex = () => {
    const [index, setIndex] = useState<Surah[] | null>(cachedIndex());
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => { if (!index) loadIndex().then(setIndex).catch(() => setFailed(true)); }, [index, attempt]);
    return { index, failed, retry: () => { setFailed(false); setAttempt(n => n + 1); } };
};

const placeName = (s: Surah) => (s.place === 'makkah' ? t('Мекке') : t('Мадина'));

/** The surah's number in a small diamond, as on the results' badges. */
const Diamond: React.FC<{ n: number | string; size?: number }> = ({ n, size = 36 }) => (
    <span className="flex-shrink-0 inline-flex items-center justify-center font-display tabular rotate-45" style={{ width: size, height: size, margin: size * 0.15, border: '1px solid var(--gold-dim)', color: 'var(--gold)', fontSize: size > 30 ? '0.95rem' : '0.8rem' }}>
        <span className="-rotate-45">{n}</span>
    </span>
);

// ---------------------------------------------------------------------------
// Contents
// ---------------------------------------------------------------------------
const Contents: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const { index, failed, retry } = useIndex();
    const [tab, setTab] = useState<'surah' | 'juz' | 'saved'>('surah');
    const [juz, setJuz] = useState<Array<[number, number]> | null>(null);
    const [q, setQ] = useState('');
    const last = loadLastRead();
    const marks = loadMarks();
    useEffect(() => { if (tab === 'juz' && !juz) loadJuz().then(setJuz).catch(() => undefined); }, [tab, juz]);

    const ref = parseRef(q);
    const shown = useMemo(() => {
        const s = q.trim();
        if (!index || !s) return index ?? [];
        if (ref) return index.filter(x => x.n === ref.surah);
        const key = searchKey(s);
        return index.filter(x => (key.length > 0 && searchKey(x.name).includes(key)) || x.ar.includes(s));
    }, [index, q, ref]);
    const total = index?.length ?? 114;

    return (
        <AppFrame page="quran" title={t('Куран')} kicker={t('Курани Карим')} sub={t('{0} сүрө · 30 пара · {1} бет', total, 604)} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[46rem] mx-auto">
                {/* Where I stopped: a bookmark ribbon, the surah's own name in Arabic,
                    and how far through the 604 pages of the mushaf that is. */}
                <section className="q-mark">
                    <span className="q-ribbon" aria-hidden="true" />
                    <button onClick={() => go(last ? (loadMode() === 'pages' && last.page ? `#/quran/p/${last.page}` : `#/quran/${last.surah}:${last.ayah}`) : '#/quran/1')} className="q-mark-main">
                        <span className="eyebrow" style={{ color: 'var(--gold)' }}>{last ? t('Улантуу') : t('Баштоо')}</span>
                        {index && <span dir="rtl" lang="ar" className="quran-text q-mark-ar">{index[(last?.surah ?? 1) - 1]?.ar}</span>}
                        <span className="font-display q-mark-name">{last?.name ?? index?.[0]?.name ?? ''}</span>
                        <span className="text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>{last ? t('{0}-сүрө, {1}-аят', last.surah, last.ayah) : t('{0} сүрө · 30 пара · {1} бет', total, 604)}</span>
                    </button>
                    {last?.page && (
                        <div className="q-progress" aria-label={t('{0}-бет, 604 беттен', last.page)}>
                            <span className="q-progress-line"><i style={{ width: `${(last.page / 604) * 100}%` }} /><b style={{ left: `${(last.page / 604) * 100}%` }} /></span>
                            <span className="q-progress-l tabular"><span>1</span><span style={{ color: 'var(--gold)' }}>{t('{0}-бет', last.page)}</span><span>604</span></span>
                        </div>
                    )}
                    <button onClick={() => go(`#/quran/p/${last?.page ?? 1}`)} className="q-mushaf">
                        <span className="quran-text" aria-hidden="true">۞</span>{t('Мусхафты барак боюнча окуу')}<ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </section>

                <label className="relative block mt-6">
                    <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Сүрөнүн аты, номери же 2:255')} aria-label={t('Издөө')} inputMode="search" className="w-full pl-7 pr-8 py-3 text-[1.05rem] bg-transparent outline-none" style={{ borderBottom: '1px solid var(--border-strong)', color: 'var(--text-primary)' }} />
                    {q && <button onClick={() => setQ('')} aria-label={t('Тазалоо')} className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center" style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>}
                </label>
                {ref?.ayah && index && ref.ayah <= (index[ref.surah - 1]?.ayahs ?? 0) && (
                    <button onClick={() => go(`#/quran/${ref.surah}:${ref.ayah}`)} className="row-link w-full text-left py-3.5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)', color: 'var(--gold)' }}>
                        <span className="flex-1">{t('{0}, {1}-аятка өтүү', index[ref.surah - 1].name, ref.ayah)}</span><ChevronRight className="w-4 h-4" />
                    </button>
                )}

                {!q && (
                    <div className="jattoo-kinds mt-6" role="tablist">
                        {([['surah', t('Сүрөлөр')], ['juz', t('Паралар')], ['saved', t('Сакталгандар')]] as const).map(([k, label]) => (
                            <button key={k} role="tab" aria-selected={tab === k} data-on={tab === k || undefined} onClick={() => setTab(k)}>{label}{k === 'saved' && marks.length > 0 ? ` · ${marks.length}` : ''}</button>
                        ))}
                    </div>
                )}

                {failed && <Problem onRetry={retry} />}
                {!index && !failed && <Waiting />}

                {index && (q || tab === 'surah') && (
                    <ol className="mt-2">
                        {shown.map(s => (
                            <li key={s.n} style={{ borderBottom: '1px solid var(--border)' }}>
                                <button onClick={() => go(`#/quran/${s.n}`)} className="row-link w-full text-left py-3.5 px-1 flex items-center gap-4">
                                    <Diamond n={s.n} />
                                    <span className="flex-1 min-w-0 pl-1">
                                        <span className="block font-display text-[1.25rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                                        <span className="block text-[0.78rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>{placeName(s)} · {t('{0} аят', s.ayahs)} · {t('{0}-бет', s.page)}</span>
                                    </span>
                                    <span dir="rtl" lang="ar" className="quran-text text-[1.55rem]" style={{ color: 'var(--text-primary)' }}>{s.ar}</span>
                                </button>
                            </li>
                        ))}
                        {shown.length === 0 && <li className="py-10 text-center italic" style={{ color: 'var(--text-muted)' }}>{t('Табылган жок')}</li>}
                    </ol>
                )}

                {index && !q && tab === 'juz' && (
                    juz ? (
                        <ol className="mt-2">
                            {juz.map(([s, a], i) => (
                                <li key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <button onClick={() => go(`#/quran/${s}:${a}`)} className="row-link w-full text-left py-3.5 px-1 flex items-center gap-4">
                                        <Diamond n={i + 1} />
                                        <span className="flex-1 min-w-0 pl-1">
                                            <span className="block font-display text-[1.25rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{t('{0}-пара', i + 1)}</span>
                                            <span className="block text-[0.78rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('{0}, {1}-аяттан', index[s - 1].name, a)}</span>
                                        </span>
                                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                    </button>
                                </li>
                            ))}
                        </ol>
                    ) : <Waiting />
                )}

                {index && !q && tab === 'saved' && (
                    marks.length ? (
                        <ol className="mt-2">
                            {marks.map(m => (
                                <li key={`${m.surah}:${m.ayah}`} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <button onClick={() => go(`#/quran/${m.surah}:${m.ayah}`)} className="row-link w-full text-left py-3.5 px-1 flex items-center gap-4">
                                        <BookmarkCheck className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--gold)' }} />
                                        <span className="flex-1 min-w-0 font-display text-[1.2rem]" style={{ color: 'var(--text-primary)' }}>{m.name} <span className="tabular" style={{ color: 'var(--text-muted)' }}>{m.surah}:{m.ayah}</span></span>
                                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                    </button>
                                </li>
                            ))}
                        </ol>
                    ) : <p className="py-10 text-center italic" style={{ color: 'var(--text-muted)' }}>{t('Аяттын номерин басып сактасаңыз, ушул жерге чогулат.')}</p>
                )}

                <p className="text-[0.78rem] italic mt-8 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {sourceNote()}
                </p>
            </div>
        </AppFrame>
    );
};

// ---------------------------------------------------------------------------
// Reader
// ---------------------------------------------------------------------------
const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };

/** What can be done with one ayah: listen from it, keep it, copy it. */
const AyahActions: React.FC<{ surah: Surah; ayah: number; text: string; meaning?: string; onClose: () => void }> = ({ surah, ayah, text, meaning, onClose }) => {
    const [marked, setMarked] = useState(() => isMarked(surah.n, ayah));
    const [copied, setCopied] = useState(false);
    return (
        <div className="fixed left-0 right-0 bottom-0 z-40 page-gutter animate-fade-up" role="dialog" aria-label={t('{0}:{1}', surah.n, ayah)} style={{ paddingBottom: 'max(0.8rem, env(safe-area-inset-bottom))', paddingTop: '0.8rem', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--gold)', boxShadow: 'var(--shadow-lift)' }}>
            <div className="mx-auto max-w-[46rem] flex items-center gap-2">
                <span className="flex-1 min-w-0 font-display text-[1.15rem] truncate" style={{ color: 'var(--text-primary)' }}>{surah.name} <span className="tabular" style={{ color: 'var(--gold)' }}>{surah.n}:{ayah}</span></span>
                <button className="btn btn-ghost" onClick={() => { recite(surah.n, ayah); onClose(); }} aria-label={t('Ушул аяттан угуу')}>
                    <Play className="w-4 h-4" /><span className="hidden sm:inline">{t('Угуу')}</span>
                </button>
                <button className="btn btn-ghost" onClick={() => setMarked(toggleMark({ surah: surah.n, ayah, name: surah.name }))} aria-pressed={marked} aria-label={marked ? t('Сакталды') : t('Сактоо')}>
                    {marked ? <BookmarkCheck className="w-4 h-4" style={{ color: 'var(--gold)' }} /> : <Bookmark className="w-4 h-4" />}<span className="hidden sm:inline">{marked ? t('Сакталды') : t('Сактоо')}</span>
                </button>
                <button className="btn btn-ghost" aria-label={copied ? t('Көчүрүлдү') : t('Көчүрүү')} onClick={async () => { setCopied(await copy(`${withoutNumber(text)}\n\n${meaning ?? ''}\n— ${surah.name} ${surah.n}:${ayah}`.replace(/\n\n\n/, '\n\n'))); }}>
                    <Copy className="w-4 h-4" /><span className="hidden sm:inline">{copied ? t('Көчүрүлдү') : t('Көчүрүү')}</span>
                </button>
                <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('Жабуу')}><X className="w-4 h-4" /></button>
            </div>
        </div>
    );
};

const Footnote: React.FC<{ text: string }> = ({ text }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="mt-1">
            <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="hit text-[0.66rem] tracking-[0.18em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: open ? 'var(--gold)' : 'var(--text-muted)' }}>{t('Түшүндүрмө')}</button>
            {open && <p className="mt-1.5 pl-3 text-[0.86em] leading-relaxed whitespace-pre-line" style={{ borderLeft: '2px solid var(--gold-dim)', color: 'var(--text-secondary)' }}>{text}</p>}
        </div>
    );
};

/** The three ways of reading, at the top of every reading page. */
const ModeBar: React.FC<{ mode: ReadMode; onMode: (m: ReadMode) => void; label: React.ReactNode; onGoTo?: () => void; page?: number }> = ({ mode, onMode, label, onGoTo, page }) => (
    <div className="sticky top-0 z-30 quran-modebar">
        <div className="mx-auto max-w-[46rem] flex items-center gap-2 h-12">
            {onGoTo
                ? <button onClick={onGoTo} className="hit flex-1 min-w-0 text-left inline-flex items-center gap-1.5 text-[0.8rem] transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }} aria-label={t('Өтүү')}><span className="truncate">{label}</span><ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--gold)' }} /></button>
                : <span className="flex-1 min-w-0 truncate text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{label}</span>}
            {page ? <PageMark page={page} /> : null}
            <div className="flex items-center" role="group" aria-label={t('Окуу түрү')}>
                {([['translation', t('Мааниси')], ['mushaf', t('Мусхаф')], ['pages', t('Барак')]] as const).map(([m, l]) => (
                    <button key={m} className={`chip ${mode === m ? 'is-active' : ''}`} aria-pressed={mode === m} onClick={() => onMode(m)} style={{ marginRight: m === 'pages' ? 0 : undefined }}>{l}</button>
                ))}
            </div>
        </div>
    </div>
);

/** Text size and the reciter, in a small panel over the bottom bar. */
const Settings: React.FC<{ size: number; onResize: (by: number) => void; onClose: () => void }> = ({ size, onResize, onClose }) => {
    const [reciter, setReciter] = useState(loadReciter().id);
    return (
        <div className="fixed left-0 right-0 bottom-[4.2rem] z-40 page-gutter animate-fade-up" role="dialog" aria-label={t('Окуу жөндөөлөрү')}>
            <div className="mx-auto max-w-[24rem] p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lift)' }}>
                <div className="flex items-center justify-between">
                    <span className="eyebrow">{t('Тамганын өлчөмү')}</span>
                    <button onClick={onClose} aria-label={t('Жабуу')} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center justify-between mt-3">
                    <button className="btn btn-ghost btn-icon" onClick={() => onResize(-0.2)} aria-label={t('Тамганы кичирейтүү')}><Minus className="w-4 h-4" /></button>
                    <span dir="rtl" lang="ar" className="quran-text" style={{ fontSize: `${Math.min(size, 2.6)}rem`, color: 'var(--text-primary)' }}>بِسۡمِ ٱللَّهِ</span>
                    <button className="btn btn-ghost btn-icon" onClick={() => onResize(0.2)} aria-label={t('Тамганы чоңойтуу')}><Plus className="w-4 h-4" /></button>
                </div>
                <div className="eyebrow mt-5">{t('Кари')}</div>
                <div className="mt-2">
                    {RECITERS.map(r => (
                        <button key={r.id} onClick={() => { saveReciter(r.id); setReciter(r.id); }} className="w-full text-left py-2.5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)', color: reciter === r.id ? 'var(--gold)' : 'var(--text-secondary)' }}>
                            <span className="w-4">{reciter === r.id && <Check className="w-4 h-4" />}</span>{r.name}
                        </button>
                    ))}
                </div>
                <p className="text-[0.72rem] mt-3" style={{ color: 'var(--text-muted)' }}>{t('Үн: everyayah.com (интернет керек).')}</p>
            </div>
        </div>
    );
};

/** The bottom bar of every reading page: back and forth, listen, settings. */
const ReaderBar: React.FC<{ prev?: () => void; next?: () => void; prevLabel: string; nextLabel: string; listenFrom: () => { surah: number; ayah: number }; size: number; onResize: (by: number) => void; onGoTo: () => void }> = ({ prev, next, prevLabel, nextLabel, listenFrom, size, onResize, onGoTo }) => {
    const rec = useRecitation();
    const [settings, setSettings] = useState(false);
    return (
        <>
            {settings && <Settings size={size} onResize={onResize} onClose={() => setSettings(false)} />}
            <div className="fixed left-0 right-0 bottom-0 z-30 page-gutter" style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))', paddingTop: '0.6rem', backgroundColor: 'color-mix(in oklab, var(--page-plane) 94%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}>
                <div className="mx-auto max-w-[46rem] flex items-center justify-between gap-2">
                    {/* In a mushaf the next page is to the left. */}
                    <button className="btn btn-ghost btn-icon disabled:opacity-25" disabled={!next} onClick={next} aria-label={nextLabel}><ChevronLeft className="w-4 h-4" /></button>
                    <button className="btn btn-ghost btn-icon" onClick={() => setSettings(v => !v)} aria-label={t('Окуу жөндөөлөрү')} aria-expanded={settings}><span className="font-display text-[1.05rem] normal-case tracking-normal">Aa</span></button>
                    <button onClick={() => { if (rec.playing) stopRecitation(); else { const at = listenFrom(); recite(at.surah, at.ayah); } }} aria-label={rec.playing ? t('Токтотуу') : t('Угуу')} className="w-12 h-12 rounded-full inline-flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--gold)', color: 'var(--page-plane)' }}>
                        {rec.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : rec.playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
                    </button>
                    <button className="btn btn-ghost btn-icon relative" onClick={onGoTo} aria-label={t('Өтүү')}>
                        {rec.failed || (rec.surah && rec.playing)
                            ? <span className="text-[0.72rem] tabular" style={{ color: rec.failed ? 'var(--danger)' : 'var(--gold)' }} aria-live="polite">{rec.failed ? '!' : `${rec.surah}:${rec.ayah}`}</span>
                            : <Hash className="w-4 h-4" />}
                    </button>
                    <button className="btn btn-ghost btn-icon disabled:opacity-25" disabled={!prev} onClick={prev} aria-label={prevLabel}><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
        </>
    );
};

/** The ayah at the top of the screen (the reading position). */
const topAyah = (): HTMLElement | null => {
    const marks = [...document.querySelectorAll<HTMLElement>('[data-ayah]')];
    return marks.find(m => m.getBoundingClientRect().bottom > 110) ?? marks[marks.length - 1] ?? null;
};

/** The ayah being recited stays in sight and in gold. */
const useFollowVoice = (surahOf: (el: HTMLElement) => number) => {
    const rec = useRecitation();
    useEffect(() => {
        document.querySelectorAll('.is-reciting').forEach(el => el.classList.remove('is-reciting'));
        if (!rec.surah || !rec.ayah) return;
        const el = [...document.querySelectorAll<HTMLElement>(`[data-ayah="${rec.ayah}"]`)].find(e => surahOf(e) === rec.surah);
        if (!el) return;
        el.classList.add('is-reciting');
        if (rec.playing) {
            const r = el.getBoundingClientRect();
            if (r.top < 120 || r.bottom > window.innerHeight - 110) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, [rec.surah, rec.ayah, rec.playing, surahOf]);
};

/** "I read this page": pages count only when the reader says so, not by
 *  scrolling past them. A tap again takes it back. */
const PageMark: React.FC<{ page: number }> = ({ page }) => {
    const [, bump] = useState(0);
    const done = pageReadToday(loadPractice(), page);
    const today = pagesOn(loadPractice());
    const toggle = () => {
        const p = loadPractice();
        savePractice(done ? removePage(p, page) : addPages(p, [page]));
        bump(n => n + 1);
    };
    return (
        <button onClick={toggle} aria-pressed={done} title={t('Бүгүн окулган беттер: {0}', today)} className={`page-mark ${done ? 'is-done' : ''}`}>
            <span className="page-mark-gem" aria-hidden="true">{done && <Check className="w-3 h-3" strokeWidth={2.4} />}</span>
            <span>{done ? t('Окулду') : t('Окудум')}</span>
            {today > 0 && <span className="page-mark-n tabular">{today}</span>}
        </button>
    );
};

const Reader: React.FC<{ n: number; at: number | null; theme: Theme; onToggleTheme: () => void }> = ({ n, at, theme, onToggleTheme }) => {
    const { index } = useIndex();
    const surah = index?.find(s => s.n === n);
    const [ayahs, setAyahs] = useState<Ayah[] | null>(cachedSurah(n));
    const [meaning, setMeaning] = useState<Rendering[] | null>(null);
    const [basmala, setBasmala] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [size, setSize] = useState(loadSize);
    const [mode, setMode] = useState<ReadMode>(() => (loadMode() === 'pages' ? 'translation' : loadMode()));
    const [picked, setPicked] = useState<number | null>(null);
    const [where, setWhere] = useState<{ ayah: number; page: number; juz: number }>({ ayah: 1, page: 0, juz: 0 });
    const [goto, setGoto] = useState(false);
    const startAt = useRef<number | null>(at ?? (loadLastRead()?.surah === n ? loadLastRead()!.ayah : null));
    useWakeLock();
    useFollowVoice(useCallback(() => n, [n]));

    useEffect(() => {
        let alive = true;
        setFailed(false);
        Promise.all([loadSurah(n), loadSurah(1)])
            .then(([rows, fatiha]) => { if (alive) { setAyahs(rows); setBasmala(basmalaOf(fatiha)); } })
            .catch(() => { if (alive) setFailed(true); });
        // The meaning is welcome but not needed: the Arabic is read without it.
        loadTranslation(n).then(r => { if (alive) setMeaning(r); }).catch(() => undefined);
        return () => { alive = false; };
    }, [n, attempt]);

    // Return to the place asked for (or where the reader stopped); then
    // remember the ayah at the top and count the mushaf pages passed.
    const ready = !!ayahs && !!surah;
    useEffect(() => {
        if (!ready) return;
        const resume = startAt.current;
        startAt.current = null;
        window.scrollTo(0, 0);
        if (resume && resume > 1) {
            const jump = () => {
                const el = document.getElementById(`a${resume}`);
                el?.scrollIntoView({ block: 'start' });
                if (at) { el?.classList.add('ayah-flash'); window.setTimeout(() => el?.classList.remove('ayah-flash'), 2400); }
            };
            (document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(jump), jump);
        }
        let timer = 0;
        const onScroll = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                const top = topAyah();
                if (!top) return;
                const ayah = Number(top.dataset.ayah), page = Number(top.dataset.page);
                setWhere({ ayah, page, juz: ayahs![ayah - 1]?.[2] ?? 0 });
                saveLastRead({ surah: n, ayah, name: surah!.name });
            }, 300);
        };
        const first = ayahs![(resume ?? 1) - 1];
        setWhere({ ayah: resume ?? 1, page: first?.[1] ?? 0, juz: first?.[2] ?? 0 });
        saveLastRead({ surah: n, ayah: resume ?? 1, name: surah!.name });
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(timer); };
    }, [ready, n, surah, at, ayahs]);

    const resize = (by: number) => setSize(s => { const next = Math.min(3.2, Math.max(1.2, Math.round((s + by) * 10) / 10)); saveSize(next); return next; });
    const switchMode = (m: ReadMode) => {
        saveMode(m);
        if (m === 'pages') { go(`#/quran/p/${where.page || surah?.page || 1}`); return; }
        setMode(m);
        // Keep the same ayah in view when the layout changes.
        const keep = where.ayah;
        requestAnimationFrame(() => document.getElementById(`a${keep}`)?.scrollIntoView({ block: 'start' }));
    };
    const pick = useCallback((i: number) => setPicked(p => (p === i ? null : i)), []);

    const title = surah ? `${surah.n}. ${surah.name}` : t('Куран');
    const withMeaning = mode === 'translation';
    const progress = surah ? Math.round((where.ayah / surah.ayahs) * 100) : 0;

    return (
        <AppFrame page="quran" title={title} back="#/quran" theme={theme} onToggleTheme={onToggleTheme} ownBar>
            {goto && index && <QuranGoTo index={index} pagesMode={false} page={where.page} onClose={() => setGoto(false)} />}
            <ModeBar mode={mode} onMode={switchMode} onGoTo={() => setGoto(true)} page={where.page || undefined} label={surah ? <>{surah.name} · <span className="tabular">{surah.n}:{where.ayah}</span>{where.juz ? ` · ${t('{0}-пара', where.juz)}` : ''}{where.page ? ` · ${t('{0}-бет', where.page)}` : ''}</> : ''} />
            <div className="quran-progress" style={{ transform: `scaleX(${progress / 100})` }} aria-hidden="true" />
            {failed && <Problem onRetry={() => setAttempt(a => a + 1)} />}
            {!ayahs && !failed && <Waiting />}
            {ayahs && surah && (
                <article className="max-w-[46rem] mx-auto pt-4 pb-10">
                    <SurahHead surah={surah} basmala={surah.basmala ? basmala : null} size={size} />

                    {withMeaning ? (
                        <ol>
                            {ayahs.map(([text, page, juz, sajda], i) => {
                                const newPage = i > 0 && ayahs[i - 1][1] !== page;
                                const newJuz = i > 0 && ayahs[i - 1][2] !== juz;
                                const m = meaning?.[i];
                                return (
                                    <li key={i} id={`a${i + 1}`} data-ayah={i + 1} data-page={page} className="ayah-row">
                                        {newPage && <div className="quran-page" dir="ltr">{newJuz ? t('{0}-пара', juz) + ' · ' : ''}{t('{0}-бет', page)}</div>}
                                        <div className="py-5" style={{ borderBottom: '1px solid var(--border)' }}>
                                            <div className="flex items-start gap-3">
                                                <button onClick={() => pick(i)} aria-label={t('{0}-аят: угуу, сактоо, көчүрүү', i + 1)} aria-expanded={picked === i} className="mt-1"><Diamond n={i + 1} size={28} /></button>
                                                <p dir="rtl" lang="ar" className="quran-text flex-1 leading-[2.15]" style={{ fontSize: `${size}rem`, color: 'var(--text-primary)' }}>{text}</p>
                                            </div>
                                            {sajda ? <div className="eyebrow mt-2" style={{ color: 'var(--gold)' }}>{t('Сажда аяты')}</div> : null}
                                            {m && (
                                                <div className="mt-3 pl-[2.6rem]" style={{ fontSize: `${Math.max(0.95, Math.min(1.35, size * 0.55))}rem` }} lang={translationLang()}>
                                                    <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{m[0]}</p>
                                                    {m[1] && <Footnote text={m[1]} />}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <p dir="rtl" lang="ar" className="quran-text quran-body" style={{ fontSize: `${size}rem`, color: 'var(--text-primary)' }}>
                            {ayahs.map(([text, page, juz], i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && ayahs[i - 1][1] !== page && <span className="quran-page" dir="ltr" lang="ky">{i > 0 && ayahs[i - 1][2] !== juz ? t('{0}-пара', juz) + ' · ' : ''}{t('{0}-бет', page)}</span>}
                                    <span id={`a${i + 1}`} data-ayah={i + 1} data-page={page} onClick={() => pick(i)} className={`mushaf-ayah ${picked === i ? 'is-picked' : ''}`}>{text} </span>
                                </React.Fragment>
                            ))}
                        </p>
                    )}

                    {/* The end of the surah: the next one, as a mushaf turns its page. */}
                    <div className="mt-10 pt-6 text-center" style={{ borderTop: '1px solid var(--gold-dim)' }}>
                        {n < 114 && index && (
                            <button onClick={() => go(`#/quran/${n + 1}`)} className="row-link inline-flex flex-col items-center px-6 py-3">
                                <span className="eyebrow">{t('Кийинки сүрө')}</span>
                                <span className="font-display text-[1.5rem] mt-1" style={{ color: 'var(--text-primary)' }}>{index[n].n}. {index[n].name}</span>
                            </button>
                        )}
                        <p className="text-[0.75rem] italic mt-6" style={{ color: 'var(--text-muted)' }}>{sourceNote()}</p>
                    </div>
                </article>
            )}

            {picked !== null && surah && ayahs ? (
                <AyahActions key={picked} surah={surah} ayah={picked + 1} text={ayahs[picked][0]} meaning={meaning?.[picked]?.[0]} onClose={() => setPicked(null)} />
            ) : (
                <ReaderBar
                    next={n < 114 ? () => go(`#/quran/${n + 1}`) : undefined} nextLabel={t('Кийинки сүрө')}
                    prev={n > 1 ? () => go(`#/quran/${n - 1}`) : undefined} prevLabel={t('Мурунку сүрө')}
                    listenFrom={() => ({ surah: n, ayah: where.ayah || 1 })}
                    size={size} onResize={resize} onGoTo={() => setGoto(true)}
                />
            )}
        </AppFrame>
    );
};

/** A surah's head, as in a mushaf: its name in a frame, then the basmala. */
const SurahHead: React.FC<{ surah: Surah; basmala: string | null; size: number; compact?: boolean }> = ({ surah, basmala, size, compact }) => (
    <>
        <header className={`surah-head text-center ${compact ? 'my-5' : 'mb-6'}`}>
            <div className="surah-head-frame">
                <div dir="rtl" lang="ar" className="quran-text text-[2rem] sm:text-[2.3rem] leading-tight" style={{ color: 'var(--gold)' }}>سُورَةُ {surah.ar}</div>
                <div className="text-[0.78rem] mt-1" style={{ color: 'var(--text-muted)' }}>{surah.n}. {surah.name} · {placeName(surah)} · {t('{0} аят', surah.ayahs)}</div>
            </div>
        </header>
        {basmala && <p dir="rtl" lang="ar" className="quran-text text-center mb-5" style={{ fontSize: `${size}rem`, color: 'var(--text-primary)' }}>{basmala}</p>}
    </>
);

// ---------------------------------------------------------------------------
// Pages: the whole Quran as the mushaf's 604 pages, one after another
// ---------------------------------------------------------------------------
let pagesCache: Array<[number, number]> | null = null;
const loadPages = async () => pagesCache ?? (pagesCache = await (await fetch('/quran/pages.json')).json() as Array<[number, number]>);

interface PageLine { surah: number; ayah: number; text: string; juz: number }
/** The ayahs on mushaf page `p` (1…604). */
const pageContent = async (p: number): Promise<PageLine[]> => {
    const pages = await loadPages();
    const [s0, a0] = pages[p - 1];
    const end = pages[p]; // first ayah of the next page
    const out: PageLine[] = [];
    let s = s0, a = a0;
    for (;;) {
        if (end && s === end[0] && a === end[1]) break;
        const rows = await loadSurah(s);
        if (a > rows.length) { if (s >= 114) break; s += 1; a = 1; continue; }
        out.push({ surah: s, ayah: a, text: rows[a - 1][0], juz: rows[a - 1][2] });
        if (!end && s === 114 && a === rows.length) break;
        a += 1;
    }
    return out;
};

const MushafPage: React.FC<{ p: number; lines: PageLine[]; index: Surah[]; basmala: string | null; size: number; onPick: (l: PageLine) => void }> = ({ p, lines, index, basmala, size, onPick }) => {
    const first = lines[0];
    return (
        <section className="mushaf-sheet" data-sheet={p} aria-label={t('{0}-бет', p)}>
            <div className="flex items-center justify-between text-[0.72rem] pb-2 mb-3" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--gold-dim)' }}>
                <span>{first ? index[first.surah - 1].name : ''}</span>
                <span>{first ? t('{0}-пара', first.juz) : ''}</span>
            </div>
            <div dir="rtl" lang="ar" className="quran-text quran-body" style={{ fontSize: `${size}rem`, color: 'var(--text-primary)' }}>
                {lines.map(l => (
                    <React.Fragment key={`${l.surah}:${l.ayah}`}>
                        {l.ayah === 1 && <span className="block" dir="ltr"><SurahHead surah={index[l.surah - 1]} basmala={index[l.surah - 1].basmala ? basmala : null} size={size} compact /></span>}
                        <span data-ayah={l.ayah} data-surah={l.surah} data-page={p} onClick={() => onPick(l)} className="mushaf-ayah">{l.text} </span>
                    </React.Fragment>
                ))}
            </div>
            <div className="flex justify-center mt-4"><Diamond n={p} size={30} /></div>
        </section>
    );
};

const PagesReader: React.FC<{ start: number; theme: Theme; onToggleTheme: () => void }> = ({ start, theme, onToggleTheme }) => {
    const { index } = useIndex();
    const [sheets, setSheets] = useState<Array<{ p: number; lines: PageLine[] }>>([]);
    const [basmala, setBasmala] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [size, setSize] = useState(loadSize);
    const [picked, setPicked] = useState<PageLine | null>(null);
    const [where, setWhere] = useState({ p: start, surah: 1, ayah: 1 });
    const [goto, setGoto] = useState(false);
    const loading = useRef(false);
    const bottom = useRef<HTMLDivElement>(null);
    useWakeLock();
    useFollowVoice(useCallback((el: HTMLElement) => Number(el.dataset.surah), []));

    const add = useCallback(async (p: number, before = false) => {
        if (p < 1 || p > 604 || loading.current) return;
        loading.current = true;
        try {
            const lines = await pageContent(p);
            setSheets(cur => (cur.some(x => x.p === p) ? cur : before ? [{ p, lines }, ...cur] : [...cur, { p, lines }]));
        } catch { setFailed(true); }
        finally { loading.current = false; }
    }, []);

    useEffect(() => { saveMode('pages'); loadSurah(1).then(f => setBasmala(basmalaOf(f))).catch(() => undefined); add(start); }, [start, add]);

    // The next page arrives before the reader reaches the end of this one.
    const last = sheets[sheets.length - 1]?.p ?? start;
    useEffect(() => {
        const el = bottom.current;
        if (!el) return;
        const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) add(last + 1); }, { rootMargin: '1200px 0px' });
        io.observe(el);
        return () => io.disconnect();
        // A new observer after each page reports at once if the end is still near.
    }, [last, sheets.length, add]);

    // Where the reader is: remembered, counted, shown in the bar and the address.
    useEffect(() => {
        let timer = 0;
        const onScroll = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                const top = topAyah();
                if (!top || !index) return;
                const p = Number(top.dataset.page), surah = Number(top.dataset.surah), ayah = Number(top.dataset.ayah);
                setWhere({ p, surah, ayah });
                saveLastRead({ surah, ayah, name: index[surah - 1].name, page: p });
                if (window.location.hash !== `#/quran/p/${p}`) window.history.replaceState(null, '', `#/quran/p/${p}`);
            }, 300);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(timer); };
    }, [index]);

    const resize = (by: number) => setSize(s => { const next = Math.min(3.2, Math.max(1.2, Math.round((s + by) * 10) / 10)); saveSize(next); return next; });
    const switchMode = (m: ReadMode) => { saveMode(m); if (m !== 'pages') go(`#/quran/${where.surah}:${where.ayah}`); };
    const firstSheet = sheets[0]?.p ?? start;
    const jump = (p: number) => go(`#/quran/p/${Math.min(604, Math.max(1, p))}`);

    return (
        <AppFrame page="quran" title={t('{0}-бет', where.p)} back="#/quran" theme={theme} onToggleTheme={onToggleTheme} ownBar>
            {goto && index && <QuranGoTo index={index} pagesMode page={where.p} onClose={() => setGoto(false)} />}
            <ModeBar mode="pages" onMode={switchMode} onGoTo={() => setGoto(true)} page={where.p} label={index ? <>{index[where.surah - 1]?.name} · <span className="tabular">{t('{0}-бет', where.p)}</span> / 604</> : ''} />
            <div className="quran-progress" style={{ transform: `scaleX(${where.p / 604})` }} aria-hidden="true" />
            {failed && <Problem onRetry={() => { setFailed(false); add(last + 1); }} />}
            {!sheets.length && !failed && <Waiting />}
            {index && sheets.length > 0 && (
                <div className="max-w-[46rem] mx-auto pt-4 pb-10">
                    {firstSheet > 1 && (
                        <div className="text-center mb-4">
                            <button className="text-[0.72rem] tracking-[0.18em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }} onClick={() => add(firstSheet - 1, true)}>{t('Мурунку барак')}</button>
                        </div>
                    )}
                    {sheets.map(s => <MushafPage key={s.p} p={s.p} lines={s.lines} index={index} basmala={basmala} size={size} onPick={setPicked} />)}
                    <div ref={bottom} className="h-px" />
                    {last >= 604 && <p className="text-center text-[0.8rem] italic mt-8" style={{ color: 'var(--text-muted)' }}>{t('Курандын акыры. Аллах кабыл кылсын.')}</p>}
                </div>
            )}
            {picked && index ? (
                <AyahActions key={`${picked.surah}:${picked.ayah}`} surah={index[picked.surah - 1]} ayah={picked.ayah} text={picked.text} onClose={() => setPicked(null)} />
            ) : (
                <ReaderBar
                    next={where.p < 604 ? () => jump(where.p + 1) : undefined} nextLabel={t('Кийинки барак')}
                    prev={where.p > 1 ? () => jump(where.p - 1) : undefined} prevLabel={t('Мурунку барак')}
                    listenFrom={() => ({ surah: where.surah, ayah: where.ayah })}
                    size={size} onResize={resize} onGoTo={() => setGoto(true)}
                />
            )}
        </AppFrame>
    );
};

export const QuranPage: React.FC<{ arg: string | null; sub?: string | null; theme: Theme; onToggleTheme: () => void }> = ({ arg, sub, theme, onToggleTheme }) => {
    if (arg === 'p') {
        const p = Number(sub);
        return <PagesReader key={Number.isInteger(p) && p >= 1 && p <= 604 ? p : 1} start={Number.isInteger(p) && p >= 1 && p <= 604 ? p : 1} theme={theme} onToggleTheme={onToggleTheme} />;
    }
    const ref = arg ? parseRef(arg.replace(':', ' ')) : null;
    return ref
        ? <Reader key={`${ref.surah}:${ref.ayah ?? ''}`} n={ref.surah} at={ref.ayah} theme={theme} onToggleTheme={onToggleTheme} />
        : <Contents theme={theme} onToggleTheme={onToggleTheme} />;
};
