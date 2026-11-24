// Куран. The contents (surahs or juz, a search that understands «бакара»,
// «baqara» or «2:255», where you stopped, saved ayahs) and the reader:
// ayah by ayah with the meaning under each, or the mushaf's continuous text.
// The Arabic is the King Fahd Complex's text in its own typeface; the meaning
// is a published translation (quranData.ts). Nothing is typed in by hand.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Copy, Minus, Plus, Search, X } from 'lucide-react';
import type { Theme } from '../theme';
import { t } from '../i18n';
import { AppFrame, Problem, Waiting } from './AppFrame';
import { go } from './route';
import { useWakeLock } from './useWakeLock';
import type { Ayah, Rendering, Surah } from './quranData';
import { basmalaOf, cachedIndex, cachedSurah, loadIndex, loadJuz, loadSurah, loadTranslation, sourceNote, translationLang, withoutNumber } from './quranData';
import type { ReadMode } from './quranStore';
import { isMarked, loadLastRead, loadMarks, loadMode, loadSize, parseRef, saveLastRead, saveMode, saveSize, searchKey, toggleMark } from './quranStore';
import { addPages, loadPractice, savePractice } from './practice';

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
        <AppFrame page="quran" title={t('Куран')} kicker={t('Курани Карим')} sub={t('{0} сүрө · 30 жүз · {1} бет', total, 604)} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[46rem] mx-auto">
                {last && (
                    <button onClick={() => go(`#/quran/${last.surah}:${last.ayah}`)} className="row-link w-full text-left mt-6 py-4 flex items-center gap-4" style={{ borderTop: '1px solid var(--gold)', borderBottom: '1px solid var(--border)' }}>
                        <span className="flex-1 min-w-0">
                            <span className="eyebrow block" style={{ color: 'var(--gold)' }}>{t('Улантуу')}</span>
                            <span className="block font-display text-[1.6rem] leading-tight mt-1" style={{ color: 'var(--text-primary)' }}>{last.name}</span>
                            <span className="block text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>{t('{0}-сүрө, {1}-аят', last.surah, last.ayah)}</span>
                        </span>
                        <ChevronRight className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                    </button>
                )}

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
                    <div className="flex gap-1 mt-5" role="tablist">
                        {([['surah', t('Сүрөлөр')], ['juz', t('Жүздөр')], ['saved', t('Сакталгандар')]] as const).map(([k, label]) => (
                            <button key={k} role="tab" aria-selected={tab === k} className={`chip ${tab === k ? 'is-active' : ''}`} onClick={() => setTab(k)}>{label}{k === 'saved' && marks.length > 0 ? ` · ${marks.length}` : ''}</button>
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
                                            <span className="block font-display text-[1.25rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{t('{0}-жүз', i + 1)}</span>
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
                    ) : <p className="py-10 text-center italic" style={{ color: 'var(--text-muted)' }}>{t('Аяттын номерин басып, сактап коюңуз — ушул жерде чогулат.')}</p>
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

/** What can be done with one ayah: keep it, copy it. */
const AyahActions: React.FC<{ surah: Surah; ayah: number; text: string; meaning?: string; onClose: () => void }> = ({ surah, ayah, text, meaning, onClose }) => {
    const [marked, setMarked] = useState(() => isMarked(surah.n, ayah));
    const [copied, setCopied] = useState(false);
    return (
        <div className="fixed left-0 right-0 bottom-0 z-40 page-gutter animate-fade-up" role="dialog" aria-label={t('{0}:{1}', surah.n, ayah)} style={{ paddingBottom: 'max(0.8rem, env(safe-area-inset-bottom))', paddingTop: '0.8rem', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--gold)', boxShadow: 'var(--shadow-lift)' }}>
            <div className="mx-auto max-w-[46rem] flex items-center gap-2">
                <span className="flex-1 min-w-0 font-display text-[1.15rem] truncate" style={{ color: 'var(--text-primary)' }}>{surah.name} <span className="tabular" style={{ color: 'var(--gold)' }}>{surah.n}:{ayah}</span></span>
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
            <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="text-[0.66rem] tracking-[0.18em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: open ? 'var(--gold)' : 'var(--text-muted)' }}>{t('Түшүндүрмө')}</button>
            {open && <p className="mt-1.5 pl-3 text-[0.86em] leading-relaxed whitespace-pre-line" style={{ borderLeft: '2px solid var(--gold-dim)', color: 'var(--text-secondary)' }}>{text}</p>}
        </div>
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
    const [mode, setMode] = useState<ReadMode>(loadMode);
    const [picked, setPicked] = useState<number | null>(null);
    const startAt = useRef<number | null>(at ?? (loadLastRead()?.surah === n ? loadLastRead()!.ayah : null));
    useWakeLock();

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
                const marks = [...document.querySelectorAll<HTMLElement>('[data-ayah]')];
                const top = marks.find(m => m.getBoundingClientRect().bottom > 90) ?? marks[marks.length - 1];
                if (!top) return;
                const ayah = Number(top.dataset.ayah);
                saveLastRead({ surah: n, ayah, name: surah!.name });
                const page = Number(top.dataset.page);
                if (page) {
                    const p = loadPractice();
                    const next = addPages(p, [page]);
                    if (next !== p) savePractice(next);
                }
            }, 600);
        };
        saveLastRead({ surah: n, ayah: resume ?? 1, name: surah!.name });
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(timer); };
    }, [ready, n, surah, at]);

    const resize = (by: number) => setSize(s => { const next = Math.min(3.2, Math.max(1.2, Math.round((s + by) * 10) / 10)); saveSize(next); return next; });
    const switchMode = (m: ReadMode) => { setMode(m); saveMode(m); };
    const pick = useCallback((i: number) => setPicked(p => (p === i ? null : i)), []);

    const title = surah ? `${surah.n}. ${surah.name}` : t('Куран');
    const withMeaning = mode === 'translation';

    return (
        <AppFrame page="quran" title={title} back="#/quran" theme={theme} onToggleTheme={onToggleTheme} ownBar>
            {failed && <Problem onRetry={() => setAttempt(a => a + 1)} />}
            {!ayahs && !failed && <Waiting />}
            {ayahs && surah && (
                <article className="max-w-[46rem] mx-auto pt-4 pb-10">
                    {/* The surah's head, as on the page of a mushaf. */}
                    <header className="text-center py-5 mb-6" style={{ borderTop: '1px solid var(--gold-dim)', borderBottom: '1px solid var(--gold-dim)' }}>
                        <div className="hidden sm:block eyebrow mb-2" style={{ color: 'var(--gold)' }}>{surah.n}. {surah.name}</div>
                        <div dir="rtl" lang="ar" className="quran-text text-[2.3rem] leading-tight" style={{ color: 'var(--gold)' }}>سُورَةُ {surah.ar}</div>
                        <div className="text-[0.8rem] mt-1" style={{ color: 'var(--text-muted)' }}>{placeName(surah)} · {t('{0} аят', surah.ayahs)} · {t('{0}-жүз', surah.juz)} · {t('{0}-бет', surah.page)}</div>
                    </header>
                    {surah.basmala && basmala && <p dir="rtl" lang="ar" className="quran-text text-center mb-6" style={{ fontSize: `${size}rem`, color: 'var(--text-primary)' }}>{basmala}</p>}

                    {withMeaning ? (
                        <ol>
                            {ayahs.map(([text, page, juz, sajda], i) => {
                                const newPage = i > 0 && ayahs[i - 1][1] !== page;
                                const newJuz = i > 0 && ayahs[i - 1][2] !== juz;
                                const m = meaning?.[i];
                                return (
                                    <li key={i} id={`a${i + 1}`} data-ayah={i + 1} data-page={page} className="ayah-row">
                                        {newPage && <div className="quran-page" dir="ltr">{newJuz ? t('{0}-жүз', juz) + ' · ' : ''}{t('{0}-бет', page)}</div>}
                                        <div className="py-5" style={{ borderBottom: '1px solid var(--border)' }}>
                                            <div className="flex items-start gap-3">
                                                <button onClick={() => pick(i)} aria-label={t('{0}-аят: сактоо, көчүрүү', i + 1)} aria-expanded={picked === i} className="mt-1"><Diamond n={i + 1} size={28} /></button>
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
                                    {i > 0 && ayahs[i - 1][1] !== page && <span className="quran-page" dir="ltr" lang="ky">{i > 0 && ayahs[i - 1][2] !== juz ? t('{0}-жүз', juz) + ' · ' : ''}{t('{0}-бет', page)}</span>}
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
                // The reader's own bar: the neighbouring surahs, the way of reading, the size.
                <div className="fixed left-0 right-0 bottom-0 z-30 page-gutter" style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))', paddingTop: '0.6rem', backgroundColor: 'color-mix(in oklab, var(--page-plane) 94%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}>
                    <div className="mx-auto max-w-[46rem] flex items-center justify-between gap-1">
                        {/* In a mushaf the next surah is to the left. */}
                        <button className="btn btn-ghost btn-icon disabled:opacity-25" disabled={n >= 114} onClick={() => go(`#/quran/${n + 1}`)} aria-label={t('Кийинки сүрө')}><ChevronLeft className="w-4 h-4" /></button>
                        <div className="flex items-center" role="group" aria-label={t('Окуу түрү')}>
                            <button className={`chip ${withMeaning ? 'is-active' : ''}`} aria-pressed={withMeaning} onClick={() => switchMode('translation')}>{t('Мааниси')}</button>
                            <button className={`chip ${!withMeaning ? 'is-active' : ''}`} aria-pressed={!withMeaning} onClick={() => switchMode('mushaf')}>{t('Мусхаф')}</button>
                        </div>
                        <div className="flex items-center">
                            <button className="btn btn-ghost btn-icon" onClick={() => resize(-0.2)} aria-label={t('Тамганы кичирейтүү')}><Minus className="w-4 h-4" /></button>
                            <button className="btn btn-ghost btn-icon" onClick={() => resize(0.2)} aria-label={t('Тамганы чоңойтуу')}><Plus className="w-4 h-4" /></button>
                        </div>
                        <button className="btn btn-ghost btn-icon disabled:opacity-25" disabled={n <= 1} onClick={() => go(`#/quran/${n - 1}`)} aria-label={t('Мурунку сүрө')}><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            )}
        </AppFrame>
    );
};

export const QuranPage: React.FC<{ arg: string | null; theme: Theme; onToggleTheme: () => void }> = ({ arg, theme, onToggleTheme }) => {
    const ref = arg ? parseRef(arg.replace(':', ' ')) : null;
    return ref
        ? <Reader key={`${ref.surah}:${ref.ayah ?? ''}`} n={ref.surah} at={ref.ayah} theme={theme} onToggleTheme={onToggleTheme} />
        : <Contents theme={theme} onToggleTheme={onToggleTheme} />;
};
