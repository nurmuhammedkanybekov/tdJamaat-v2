// "Окудум" — what the reader read, said the way people say it: this page,
// pages 23 to 41, the 3rd juz, Yasin and al-Mulk. For today or for
// yesterday (forgot to mark it). The pages count for the day; nothing is
// counted by scrolling past it.
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Sheet } from '../components/ui';
import { t } from '../i18n';
import type { Surah } from './quranData';
import { loadIndex } from './quranData';
import { searchKey } from './quranStore';
import { addPages, loadPractice, pagesOfDay, removePages, savePractice } from './practice';
import { SURAH_PAGES, clampPage, surahAt, juzOf, juzPages, pageList, toRanges, wholeJuz } from './quranPages';

type Tab = 'pages' | 'juz' | 'surah';

const dayAt = (back: number) => { const d = new Date(); d.setDate(d.getDate() - back); d.setHours(12, 0, 0, 0); return d; };

export const ReadSheet: React.FC<{ page: number; surah?: number; onClose: () => void }> = ({ page, surah, onClose }) => {
    const [back, setBack] = useState(0); // 0 today, 1 yesterday
    const [tab, setTab] = useState<Tab>('pages');
    const [from, setFrom] = useState(page || 1);
    const [to, setTo] = useState(page || 1);
    const [juz, setJuz] = useState<Set<number>>(new Set());
    const [suras, setSuras] = useState<Set<number>>(new Set());
    const here = surah ?? (page > 0 ? surahAt(page) : 0);
    const [q, setQ] = useState('');
    const [index, setIndex] = useState<Surah[] | null>(null);
    const [said, setSaid] = useState('');
    const [, bump] = useState(0);
    useEffect(() => { loadIndex().then(setIndex).catch(() => undefined); }, []);

    const when = dayAt(back);
    const marked = pagesOfDay(loadPractice(), when);
    const have = new Set(marked);
    const onPage = page > 0 && have.has(page);

    const mark = (pages: number[], what: string) => {
        const fresh = pages.filter(p => !have.has(p));
        savePractice(addPages(loadPractice(), pages, when));
        setSaid(fresh.length ? t('{0}: +{1} бет', what, fresh.length) : t('{0} мурун эле белгиленген', what));
        bump(n => n + 1);
    };
    const unmark = (pages: number[]) => { savePractice(removePages(loadPractice(), pages, when)); setSaid(''); bump(n => n + 1); };

    // What the chosen tab would mark.
    const chosen = useMemo(() => {
        if (tab === 'pages') return pageList(from, to);
        if (tab === 'juz') return [...juz].sort((a, b) => a - b).flatMap(j => pageList(...juzPages(j)));
        return [...suras].sort((a, b) => a - b).flatMap(n => pageList(...SURAH_PAGES[n - 1]));
    }, [tab, from, to, juz, suras]);
    const chosenSet = [...new Set(chosen)];
    const what = tab === 'pages' ? (from === to ? t('{0}-бет', clampPage(from)) : t('{0}–{1}-беттер', Math.min(clampPage(from), clampPage(to)), Math.max(clampPage(from), clampPage(to))))
        : tab === 'juz' ? [...juz].sort((a, b) => a - b).map(j => t('{0}-пара', j)).join(', ')
            : [...suras].sort((a, b) => a - b).map(n => index?.[n - 1]?.name ?? String(n)).join(', ');

    const found = useMemo(() => {
        if (!index) return [];
        const key = searchKey(q.trim());
        const n = Number(q.trim());
        const list = !q.trim() ? index : index.filter(s => (n && s.n === n) || (key && searchKey(s.name).includes(key)) || s.ar.includes(q.trim()));
        // The surah being read first, then the chosen ones, then the rest.
        return [...list].sort((a, b) => Number(b.n === here) - Number(a.n === here) || Number(suras.has(b.n)) - Number(suras.has(a.n)) || a.n - b.n).slice(0, q.trim() ? 12 : 8);
    }, [index, q, here, suras]);

    const toggle = <T,>(set: Set<T>, v: T) => { const s = new Set(set); if (s.has(v)) s.delete(v); else s.add(v); return s; };
    const full = wholeJuz(marked);

    return (
        <Sheet title={t('Окугандарым')} onClose={onClose} width="36rem" footer={<>
                <div className="read-go">
                    <div className="min-w-0 text-[0.9rem]" style={{ color: 'var(--text-secondary)' }}>
                        {chosenSet.length ? <><span className="font-display text-[1.2rem] tabular" style={{ color: 'var(--text-primary)' }}>{t('{0} бет', chosenSet.length)}</span>{what ? <span className="block truncate">{what}</span> : null}</> : <span style={{ color: 'var(--text-muted)' }}>{tab === 'juz' ? t('Параны тандаңыз') : t('Сүрөнү тандаңыз')}</span>}
                    </div>
                    <button className="btn btn-primary" disabled={!chosenSet.length} onClick={() => { mark(chosenSet, what); setJuz(new Set()); if (tab === 'surah') setSuras(new Set()); }}>
                        <Check className="w-4 h-4" />{back ? t('Кечээ окудум') : t('Окудум')}
                    </button>
                </div>
                {said && <p className="read-said" role="status">{said}</p>}
            </>}>
            <div className="px-5 sm:px-7 pb-8">
                {/* Which day */}
                <div className="read-day" role="tablist" aria-label={t('Күн')}>
                    {[t('Бүгүн'), t('Кечээ')].map((l, i) => (
                        <button key={l} role="tab" aria-selected={back === i} data-on={back === i || undefined} onClick={() => { setBack(i); setSaid(''); }}>{l}</button>
                    ))}
                    <span className="read-day-n tabular">{t('{0} бет', marked.length)}</span>
                </div>

                {/* The page that is open, and whether it is marked (the button below marks it). */}
                {page > 0 && (
                    <div className="read-this">
                        <div className="min-w-0">
                            <div className="eyebrow">{t('Ачык турган бет')}</div>
                            <div className="font-display text-[1.6rem] leading-tight tabular" style={{ color: 'var(--text-primary)' }}>{t('{0}-бет', page)} <span className="text-[1rem]" style={{ color: 'var(--text-muted)' }}>· {t('{0}-пара', juzOf(page))}</span></div>
                        </div>
                        {onPage
                            ? <button className="read-this-done" onClick={() => unmark([page])} aria-pressed="true"><Check className="w-4 h-4" strokeWidth={2.4} />{t('Окулду')}<span className="read-undo">{t('кайтаруу')}</span></button>
                            : <span className="read-this-not">{t('белгилене элек')}</span>}
                    </div>
                )}

                {/* More than one page */}
                <div className="plans-tabs mt-7" role="tablist">
                    {([['pages', t('Беттер')], ['juz', t('Пара')], ['surah', t('Сүрө')]] as const).map(([k, l]) => (
                        <button key={k} role="tab" aria-selected={tab === k} data-on={tab === k || undefined} onClick={() => setTab(k)}>{l}</button>
                    ))}
                </div>

                {tab === 'pages' && (
                    <div className="pt-5">
                        <div className="read-range">
                            <label><span className="eyebrow">{t('Баштап')}</span><input type="number" inputMode="numeric" min={1} max={604} value={from} onChange={e => setFrom(Number(e.target.value) || 1)} onFocus={e => e.target.select()} className="goto-page font-display tabular" /></label>
                            <span className="read-dash" aria-hidden="true">—</span>
                            <label><span className="eyebrow">{t('чейин')}</span><input type="number" inputMode="numeric" min={1} max={604} value={to} onChange={e => setTo(Number(e.target.value) || 1)} onFocus={e => e.target.select()} className="goto-page font-display tabular" /></label>
                        </div>
                        <div className="read-quick">
                            {page > 0 && <button onClick={() => { setFrom(page); setTo(page); }}>{t('Ушул бет')}</button>}
                            {page > 0 && <button onClick={() => { const [a, b] = juzPages(juzOf(page)); setFrom(a); setTo(b); }}>{t('Ушул пара')}</button>}
                            {page > 0 && <button onClick={() => { setFrom(page); setTo(Math.min(604, page + 9)); }}>{t('+10 бет')}</button>}
                        </div>
                    </div>
                )}

                {tab === 'juz' && (
                    <div className="read-juz pt-5">
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(j => {
                            const [a, b] = juzPages(j);
                            let n = 0; for (let p = a; p <= b; p++) if (have.has(p)) n++;
                            const part = n / (b - a + 1);
                            return (
                                <button key={j} onClick={() => setJuz(s => toggle(s, j))} aria-pressed={juz.has(j)} data-on={juz.has(j) || undefined} data-here={page > 0 && juzOf(page) === j ? '' : undefined}
                                    className="read-juz-cell font-display tabular" aria-label={t('{0}-пара', j)} title={t('{0}–{1}-беттер', a, b)}>
                                    {j}
                                    {part > 0 && <i style={{ width: `${part * 76}%` }} aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>
                )}

                {tab === 'surah' && (
                    <div className="pt-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-0 top-3.5" style={{ color: 'var(--text-muted)' }} />
                            <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Сүрөнүн аты же номери')} inputMode="search" aria-label={t('Сүрө')}
                                className="w-full pl-6 py-2.5 text-[1.05rem] bg-transparent outline-none" style={{ borderBottom: '1px solid var(--border-strong)', color: 'var(--text-primary)' }} />
                        </div>
                        <ul className="mt-1">
                            {found.map(s => {
                                const [a, b] = SURAH_PAGES[s.n - 1];
                                const on = suras.has(s.n);
                                return (
                                    <li key={s.n} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <button onClick={() => setSuras(x => toggle(x, s.n))} aria-pressed={on} className="row-link w-full text-left py-3 px-1 flex items-center gap-3">
                                            <span className={`read-tick ${on ? 'is-on' : ''}`} aria-hidden="true">{on && <Check className="w-3 h-3" strokeWidth={2.6} />}</span>
                                            <span className="w-7 font-display tabular text-[0.95rem]" style={{ color: 'var(--gold)' }}>{s.n}</span>
                                            <span className="flex-1 min-w-0 truncate font-display text-[1.15rem]" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                                            <span className="text-[0.75rem] tabular" style={{ color: 'var(--text-muted)' }}>{a === b ? t('{0}-бет', a) : t('{0}–{1}-беттер', a, b)}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {/* The day so far */}
                <section className="pt-8">
                    <div className="eyebrow" style={{ color: 'var(--gold)' }}>{back ? t('Кечээ окулганы') : t('Бүгүн окулганы')}</div>
                    {marked.length === 0 ? (
                        <p className="mt-2 italic" style={{ color: 'var(--text-muted)' }}>{t('Азырынча эч нерсе белгиленген жок.')}</p>
                    ) : (
                        <>
                            <ul className="read-list">
                                {toRanges(marked).map(([a, b]) => (
                                    <li key={a}>
                                        <span className="font-display text-[1.15rem] tabular" style={{ color: 'var(--text-primary)' }}>{a === b ? t('{0}-бет', a) : t('{0}–{1}-беттер', a, b)}</span>
                                        <span className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{juzOf(a) === juzOf(b) ? t('{0}-пара', juzOf(a)) : t('{0}–{1}-пара', juzOf(a), juzOf(b))}</span>
                                        <button onClick={() => unmark(pageList(a, b))} aria-label={t('Өчүрүү')} className="read-x"><X className="w-4 h-4" /></button>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-3 text-[0.9rem]" style={{ color: 'var(--text-secondary)' }}>
                                {t('Жалпы {0} бет', marked.length)}{full.length ? ` · ${t('толук пара: {0}', full.join(', '))}` : ''}
                            </p>
                        </>
                    )}
                </section>
            </div>
        </Sheet>
    );
};
