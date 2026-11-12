// Куран: the Arabic text of the Madinah mushaf (Hafs), exactly as published by
// the King Fahd Complex — fetched one surah at a time from /quran/<n>.json
// (built from quran.com's "QPC Hafs" text; see public/quran/README.md) and set
// in the Complex's own typeface. The text is never edited or generated here.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Search } from 'lucide-react';
import type { Theme } from '../theme';
import { t } from '../i18n';
import { PublicFrame } from './PublicFrame';
import { go } from './route';
import { loadLastRead, loadSize, saveLastRead, saveSize, searchKey } from './quranStore';

interface Surah { n: number; ar: string; name: string; ayahs: number; place: 'makkah' | 'madinah'; page: number; juz: number; basmala: boolean }
/** [text, page, juz, sajda] */
type Ayah = [string, number, number, 0 | 1];

let indexCache: Surah[] | null = null;
const loadIndex = async (): Promise<Surah[]> => indexCache ?? (indexCache = await (await fetch('/quran/index.json')).json() as Surah[]);
const surahCache = new Map<number, Ayah[]>();
const loadSurah = async (n: number): Promise<Ayah[]> => {
    const hit = surahCache.get(n);
    if (hit) return hit;
    const res = await fetch(`/quran/${n}.json`);
    if (!res.ok) throw new Error(String(res.status));
    const rows = await res.json() as Ayah[];
    surahCache.set(n, rows);
    return rows;
};

const useIndex = () => {
    const [index, setIndex] = useState<Surah[] | null>(indexCache);
    const [failed, setFailed] = useState(false);
    useEffect(() => { if (!index) loadIndex().then(setIndex).catch(() => setFailed(true)); }, [index]);
    return { index, failed };
};

const Problem: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
    <div className="text-center py-16">
        <p style={{ color: 'var(--text-secondary)' }}>{t('Жүктөлгөн жок. Интернетти текшериңиз.')}</p>
        <button className="btn btn-ghost mt-4" onClick={onRetry}>{t('Кайра аракет кылуу')}</button>
    </div>
);

const SurahList: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const { index, failed } = useIndex();
    const [q, setQ] = useState('');
    const last = loadLastRead();
    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!index || !s) return index ?? [];
        const key = searchKey(s);
        return index.filter(x => String(x.n) === s || (key.length > 0 && searchKey(x.name).includes(key)) || x.ar.includes(q.trim()));
    }, [index, q]);
    return (
        <PublicFrame title={t('Куран')} back="" theme={theme} onToggleTheme={onToggleTheme} width="full">
            <div className="lg:flex lg:items-stretch lg:gap-4 lg:mt-4">
            {last && (
                <button onClick={() => go(`#/quran/${last.surah}`)} className="card lift w-full lg:w-[24rem] text-left mt-5 p-5 flex items-center gap-4" style={{ borderTop: '2px solid var(--gold)' }}>
                    <span className="flex-1 min-w-0">
                        <span className="eyebrow block" style={{ color: 'var(--gold)' }}>{t('Улантуу')}</span>
                        <span className="block font-display text-[1.45rem]" style={{ color: 'var(--text-primary)' }}>{last.name}</span>
                        <span className="block text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>{t('{0}-аят', last.ayah)}</span>
                    </span>
                    <ChevronRight className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                </button>
            )}
            <label className="relative block mt-5 lg:flex-1 lg:self-end">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Сүрөнүн аты же номери')} className="login-field w-full pl-10 pr-3 py-3 text-base" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }} />
            </label>
            </div>
            {failed && <Problem onRetry={() => window.location.reload()} />}
            {!index && !failed && <div className="py-16 flex justify-center"><div className="skeleton h-1 w-24" /></div>}
            <ol className="mt-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-x-12">
                {shown.map(s => (
                    <li key={s.n} style={{ borderBottom: '1px solid var(--border)' }}>
                        <button onClick={() => go(`#/quran/${s.n}`)} className="row-link w-full text-left py-3.5 px-1 flex items-center gap-4">
                            <span className="w-9 h-9 flex-shrink-0 inline-flex items-center justify-center font-display text-[0.95rem] tabular rotate-45" style={{ border: '1px solid var(--gold-dim)', color: 'var(--gold)' }}><span className="-rotate-45">{s.n}</span></span>
                            <span className="flex-1 min-w-0">
                                <span className="block font-display text-[1.2rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                                <span className="block text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>{s.place === 'makkah' ? t('Мекке') : t('Мадина')} · {t('{0} аят', s.ayahs)} · {t('{0}-бет', s.page)}</span>
                            </span>
                            <span dir="rtl" lang="ar" className="quran-text text-[1.6rem]" style={{ color: 'var(--text-primary)' }}>{s.ar}</span>
                        </button>
                    </li>
                ))}
            </ol>
            <p className="text-[0.78rem] italic mt-6" style={{ color: 'var(--text-muted)' }}>{t('Текст: Мадина мусхафы (Хафс риваяты), Падыша Фахд комплексинин басылышы боюнча.')}</p>
        </PublicFrame>
    );
};

// The basmala as it stands at the head of a surah: the first verse of
// al-Fatihah without its verse-number sign.
const basmalaOf = (fatiha: Ayah[]) => fatiha[0][0].replace(/[\s\u00a0]*[\u0660-\u0669]+\s*$/, '');

const Reader: React.FC<{ n: number; theme: Theme; onToggleTheme: () => void }> = ({ n, theme, onToggleTheme }) => {
    const { index } = useIndex();
    const [ayahs, setAyahs] = useState<Ayah[] | null>(surahCache.get(n) ?? null);
    const [basmala, setBasmala] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [size, setSize] = useState(loadSize);
    const surah = index?.find(s => s.n === n);
    const startAt = useRef<number | null>(loadLastRead()?.surah === n ? loadLastRead()!.ayah : null);

    useEffect(() => {
        let alive = true;
        setAyahs(surahCache.get(n) ?? null); setFailed(false);
        Promise.all([loadSurah(n), loadSurah(1)])
            .then(([rows, fatiha]) => { if (alive) { setAyahs(rows); setBasmala(basmalaOf(fatiha)); } })
            .catch(() => { if (alive) setFailed(true); });
        return () => { alive = false; };
    }, [n]);

    // Return to where the reader stopped; then remember the verse at the top.
    useEffect(() => {
        if (!ayahs || !surah) return;
        const resume = startAt.current;
        startAt.current = null;
        window.scrollTo(0, 0);
        // The place is found only once the typeface has arrived: until then
        // the lines are not where they will be.
        if (resume && resume > 1) {
            const jump = () => document.getElementById(`a${resume}`)?.scrollIntoView({ block: 'center' });
            (document.fonts?.ready ?? Promise.resolve()).then(jump, jump);
        }
        let timer = 0;
        const onScroll = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                const marks = [...document.querySelectorAll<HTMLElement>('[data-ayah]')];
                const at = marks.find(m => m.getBoundingClientRect().bottom > 90) ?? marks[marks.length - 1];
                if (at) saveLastRead({ surah: n, ayah: Number(at.dataset.ayah), name: surah.name });
            }, 400);
        };
        saveLastRead({ surah: n, ayah: 1, name: surah.name });
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(timer); };
    }, [ayahs, surah, n]);

    const resize = (by: number) => setSize(s => { const next = Math.min(3.2, Math.max(1.3, Math.round((s + by) * 10) / 10)); saveSize(next); return next; });

    return (
        <PublicFrame title={surah ? `${surah.n}. ${surah.name}` : t('Куран')} back="#/quran" theme={theme} onToggleTheme={onToggleTheme} width="wide" plain>
            {failed && <Problem onRetry={() => { setFailed(false); loadSurah(n).then(setAyahs).catch(() => setFailed(true)); }} />}
            {!ayahs && !failed && <div className="py-24 flex justify-center"><div className="skeleton h-1 w-24" /></div>}
            {ayahs && surah && (
                <article className="pt-6 pb-24">
                    {/* The surah's head, as on the page of a mushaf. */}
                    <header className="text-center py-5 mb-6" style={{ borderTop: '1px solid var(--gold-dim)', borderBottom: '1px solid var(--gold-dim)' }}>
                        <div dir="rtl" lang="ar" className="quran-text text-[2.4rem] leading-tight" style={{ color: 'var(--gold)' }}>سُورَةُ {surah.ar}</div>
                        <div className="text-[0.8rem] mt-1" style={{ color: 'var(--text-muted)' }}>{surah.place === 'makkah' ? t('Мекке') : t('Мадина')} · {t('{0} аят', surah.ayahs)} · {t('{0}-жүз', surah.juz)}</div>
                    </header>
                    {surah.basmala && basmala && <p dir="rtl" lang="ar" className="quran-text text-center mb-5" style={{ fontSize: `${size}rem`, color: 'var(--text-primary)' }}>{basmala}</p>}
                    <p dir="rtl" lang="ar" className="quran-text quran-body" style={{ fontSize: `${size}rem`, color: 'var(--text-primary)' }}>
                        {ayahs.map(([text, page], i) => (
                            <React.Fragment key={i}>
                                {(i === 0 || ayahs[i - 1][1] !== page) && i > 0 && (
                                    <span className="quran-page" dir="ltr" lang="ky">{t('{0}-бет', page)}</span>
                                )}
                                <span id={`a${i + 1}`} data-ayah={i + 1}>{text} </span>
                            </React.Fragment>
                        ))}
                    </p>
                </article>
            )}
            {/* Text size, and the neighbouring surahs. */}
            <div className="fixed left-0 right-0 bottom-0 z-20 page-gutter" style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))', paddingTop: '0.6rem', backgroundColor: 'color-mix(in oklab, var(--page-plane) 94%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}>
                <div className="mx-auto max-w-[60rem] flex items-center justify-between gap-2">
                    {/* In a mushaf the next surah is to the left. */}
                    <button className="btn btn-ghost" disabled={n >= 114} onClick={() => go(`#/quran/${n + 1}`)} aria-label={t('Кийинки сүрө')} style={{ opacity: n >= 114 ? 0.3 : 1 }}><ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">{t('Кийинки')}</span></button>
                    <div className="flex items-center gap-1">
                        <button className="btn btn-ghost btn-icon" onClick={() => resize(-0.2)} aria-label={t('Тамганы кичирейтүү')}><Minus className="w-4 h-4" /></button>
                        <span className="quran-text text-[1.2rem] w-8 text-center" aria-hidden="true">ع</span>
                        <button className="btn btn-ghost btn-icon" onClick={() => resize(0.2)} aria-label={t('Тамганы чоңойтуу')}><Plus className="w-4 h-4" /></button>
                    </div>
                    <button className="btn btn-ghost" disabled={n <= 1} onClick={() => go(`#/quran/${n - 1}`)} aria-label={t('Мурунку сүрө')} style={{ opacity: n <= 1 ? 0.3 : 1 }}><span className="hidden sm:inline">{t('Мурунку')}</span><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
        </PublicFrame>
    );
};

export const QuranPage: React.FC<{ arg: string | null; theme: Theme; onToggleTheme: () => void }> = ({ arg, theme, onToggleTheme }) => {
    const n = Number(arg);
    return Number.isInteger(n) && n >= 1 && n <= 114
        ? <Reader key={n} n={n} theme={theme} onToggleTheme={onToggleTheme} />
        : <SurahList theme={theme} onToggleTheme={onToggleTheme} />;
};
