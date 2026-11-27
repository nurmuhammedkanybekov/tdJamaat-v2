// "Өтүү" — go anywhere in the Quran from any reading page: a page (slider
// 1–604 or typed), a surah by name or number, an ayah (2:255), or a juz.
// Works the same in every reading mode: in Барак it opens the page, in
// Мааниси / Мусхаф the ayah.
import React, { useEffect, useMemo, useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { Sheet } from '../components/ui';
import { t } from '../i18n';
import type { Surah } from './quranData';
import { loadJuz, loadSurah } from './quranData';
import { parseRef, searchKey } from './quranStore';
import { go } from './route';

/** The surah a page belongs to (the last surah that starts on or before it). */
const surahOnPage = (index: Surah[], p: number): Surah => {
    let s = index[0];
    for (const x of index) { if (x.page <= p) s = x; else break; }
    return s;
};

export const QuranGoTo: React.FC<{ index: Surah[]; pagesMode: boolean; page: number; onClose: () => void }> = ({ index, pagesMode, page, onClose }) => {
    const [p, setP] = useState(page || 1);
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState(false);
    const [juz, setJuz] = useState<Array<[number, number]> | null>(null);
    useEffect(() => { loadJuz().then(setJuz).catch(() => undefined); }, []);

    const done = (hash: string) => { onClose(); go(hash); };
    // An ayah: in Барак its page, elsewhere the ayah itself.
    const toAyah = async (s: number, a: number) => {
        if (!pagesMode) { done(`#/quran/${s}:${a}`); return; }
        setBusy(true);
        try { const rows = await loadSurah(s); done(`#/quran/p/${rows[Math.min(a, rows.length) - 1]?.[1] ?? index[s - 1].page}`); }
        catch { done(`#/quran/p/${index[s - 1].page}`); }
    };
    // A page: in Барак the page, elsewhere its first ayah.
    const toPage = async (n: number) => {
        const pg = Math.min(604, Math.max(1, Math.round(n)));
        if (pagesMode) { done(`#/quran/p/${pg}`); return; }
        const s = surahOnPage(index, pg);
        setBusy(true);
        try {
            const rows = await loadSurah(s.n);
            const i = rows.findIndex(r => r[1] >= pg);
            done(i >= 0 ? `#/quran/${s.n}:${i + 1}` : `#/quran/${Math.min(114, s.n + 1)}:1`);
        } catch { done(`#/quran/${s.n}`); }
    };

    const ref = parseRef(q);
    const found = useMemo(() => {
        const s = q.trim();
        if (!s) return [];
        if (ref) return index.filter(x => x.n === ref.surah);
        const key = searchKey(s);
        return index.filter(x => (key.length > 0 && searchKey(x.name).includes(key)) || x.ar.includes(s)).slice(0, 6);
    }, [index, q, ref]);
    const onSlider = surahOnPage(index, p);

    return (
        <Sheet title={t('Өтүү')} onClose={onClose} width="34rem">
            <div className="px-5 sm:px-7 pb-7">
                {/* A page */}
                <section className="pt-5">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <div className="eyebrow">{t('Барак')}</div>
                            <div className="flex items-baseline gap-2 mt-1">
                                <input type="number" inputMode="numeric" min={1} max={604} value={p} onChange={e => setP(Number(e.target.value) || 1)}
                                    aria-label={t('Барактын номери')} className="goto-page font-display tabular" />
                                <span className="font-display text-[1.1rem]" style={{ color: 'var(--text-muted)' }}>/ 604</span>
                            </div>
                            <div className="text-[0.85rem] italic mt-1" style={{ color: 'var(--text-secondary)' }}>{onSlider.name}</div>
                        </div>
                        <button className="btn btn-primary" disabled={busy} onClick={() => toPage(p)}>{t('Ачуу')}</button>
                    </div>
                    <input type="range" min={1} max={604} value={p} onChange={e => setP(Number(e.target.value))} aria-label={t('Барак')} className="goto-slider mt-5" style={{ '--v': `${((p - 1) / 603) * 100}%` } as React.CSSProperties} />
                    <div className="flex justify-between text-[0.7rem] tabular mt-1" style={{ color: 'var(--text-muted)' }}><span>1</span><span>{t('Учурдагы: {0}', page || 1)}</span><span>604</span></div>
                </section>

                {/* A surah or an ayah */}
                <section className="pt-7">
                    <div className="eyebrow">{t('Сүрө же аят')}</div>
                    <form className="relative mt-2" onSubmit={e => { e.preventDefault(); if (ref) toAyah(ref.surah, ref.ayah ?? 1); else if (found[0]) toAyah(found[0].n, 1); }}>
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Сүрөнүн аты, номери же 2:255')} inputMode="search" aria-label={t('Сүрө же аят')}
                            className="w-full pr-8 py-2.5 text-[1.05rem] bg-transparent outline-none" style={{ borderBottom: '1px solid var(--border-strong)', color: 'var(--text-primary)' }} />
                        <CornerDownLeft className="w-4 h-4 absolute right-1 top-3.5" style={{ color: 'var(--text-muted)' }} />
                    </form>
                    {found.length > 0 && (
                        <ul className="mt-1">
                            {found.map(s => (
                                <li key={s.n} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <button disabled={busy} onClick={() => toAyah(s.n, ref?.surah === s.n && ref.ayah ? ref.ayah : 1)} className="row-link w-full text-left py-3 px-1 flex items-center gap-3">
                                        <span className="w-8 font-display tabular text-[1rem]" style={{ color: 'var(--gold)' }}>{s.n}</span>
                                        <span className="flex-1 min-w-0 truncate font-display text-[1.15rem]" style={{ color: 'var(--text-primary)' }}>{s.name}{ref?.surah === s.n && ref.ayah ? <span className="text-[0.85rem]" style={{ color: 'var(--gold)' }}> · {t('{0}-аят', ref.ayah)}</span> : null}</span>
                                        <span className="text-[0.75rem] tabular" style={{ color: 'var(--text-muted)' }}>{t('{0}-бет', s.page)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* A juz */}
                <section className="pt-7">
                    <div className="eyebrow">{t('Пара')}</div>
                    <div className="goto-juz mt-3">
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(j => {
                            return (
                                <button key={j} disabled={!juz || busy} onClick={() => { const at = juz?.[j - 1]; if (at) toAyah(at[0], at[1]); }} className="goto-juz-cell font-display tabular" aria-label={t('{0}-пара', j)}>{j}</button>
                            );
                        })}
                    </div>
                </section>
            </div>
        </Sheet>
    );
};
