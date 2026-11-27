// #/calendar — the Islamic calendar and the fasts: the month with its hijri
// days, the dates of the year, the days on which fasting is sunnah, the fasts
// kept (Ramadan, sunnah, nafl, make-up), and a line of plan for any day.
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import type { Theme } from '../theme';
import { t, dateLocale } from '../i18n';
import { AppFrame } from './AppFrame';
import { OrnamentDivider } from '../components/Ornament';
import { HIJRI_MONTHS, formatHijri } from '../utils/hijri';
import { daysBetween, hijriOf, holyDaysOf, noFast, ramadanDays, sunnahFast, upcoming } from '../utils/islamicCalendar';
import type { FastKind } from './fasting';
import { fastOn, loadCalendar, qazaDone, saveCalendar, setFast, setNote } from './fasting';
import { dayKey } from '../utils/zikr';

const KY_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const monthName = (d: Date) => (dateLocale() ? d.toLocaleDateString(dateLocale()!, { month: 'long', year: 'numeric' }) : `${d.getFullYear()}-жыл, ${KY_MONTHS[d.getMonth()]}`);
const dayLabel = (d: Date) => (dateLocale() ? d.toLocaleDateString(dateLocale()!, { weekday: 'long', day: 'numeric', month: 'long' }) : `${d.getDate()}-${KY_MONTHS[d.getMonth()]}, ${[t('жекшемби'), t('дүйшөмбү'), t('шейшемби'), t('шаршемби'), t('бейшемби'), t('жума'), t('ишемби')][d.getDay()]}`);
const WEEK = () => [t('Дш'), t('Шш'), t('Шр'), t('Бш'), t('Жм'), t('Иш'), t('Жш')];

const KINDS: Array<[FastKind, () => string]> = [['sunnah', () => t('Сүннөт')], ['nafl', () => t('Нафил')], ['qaza', () => t('Каза')], ['nazr', () => t('Назир')]];
const kindName = (k: FastKind) => (k === 'ramadan' ? t('Рамазан') : KINDS.find(x => x[0] === k)?.[1]() ?? '');

/** Re-read the store whenever it changes (here, or from another device). */
const useCalendar = () => {
    const [s, set] = useState(loadCalendar);
    useEffect(() => {
        const on = () => set(loadCalendar());
        window.addEventListener('tdjamaat-calendar', on);
        window.addEventListener('tdjamaat-cloud', on);
        return () => { window.removeEventListener('tdjamaat-calendar', on); window.removeEventListener('tdjamaat-cloud', on); };
    }, []);
    return s;
};

export const CalendarPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const store = useCalendar();
    const today = useMemo(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; }, []);
    const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12));
    const [picked, setPicked] = useState<Date>(today);
    const off = store.offset;

    // The month as weeks from Monday.
    const cells = useMemo(() => {
        const first = month;
        const lead = (first.getDay() + 6) % 7;
        const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
        const out: Array<Date | null> = Array.from({ length: lead }, () => null);
        for (let i = 1; i <= days; i++) out.push(new Date(first.getFullYear(), first.getMonth(), i, 12));
        while (out.length % 7) out.push(null);
        return out;
    }, [month]);
    const hijriSpan = useMemo(() => {
        const a = hijriOf(month, off), b = hijriOf(new Date(month.getFullYear(), month.getMonth() + 1, 0, 12), off);
        if (!a || !b) return '';
        return a.month === b.month ? `${HIJRI_MONTHS[a.month - 1]} ${a.year}` : `${HIJRI_MONTHS[a.month - 1]} – ${HIJRI_MONTHS[b.month - 1]} ${b.year}`;
    }, [month, off]);

    const h = hijriOf(today, off);
    const next = useMemo(() => upcoming(today, off, 7), [today, off]);
    const ramadan = useMemo(() => ramadanDays(today, off), [today, off]);
    const save = (fn: (s: typeof store) => typeof store) => saveCalendar(fn(loadCalendar()));

    const ph = hijriOf(picked, off);
    const pickedHoly = holyDaysOf(ph);
    const pickedSunnah = sunnahFast(picked, ph);
    const pickedFast = fastOn(store, picked);
    const pickedNo = noFast(ph);
    const inRamadan = ph?.month === 9;
    const [note, setNoteText] = useState(store.notes[dayKey(picked)] ?? '');
    useEffect(() => setNoteText(loadCalendar().notes[dayKey(picked)] ?? ''), [picked]);

    const monthFasts = cells.filter((d): d is Date => !!d && !!fastOn(store, d)).length;
    const ramadanKept = ramadan.filter(d => fastOn(store, d) === 'ramadan').length;
    const qDone = qazaDone(store);
    const qLeft = Math.max(0, store.qazaOwed - qDone);
    const todaySunnah = sunnahFast(today, h);
    const todayHoly = holyDaysOf(h);

    return (
        <AppFrame page="today" title={t('Календарь')} kicker={t('Хижрий жыл жана орозо')} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[46rem] mx-auto pt-6">
                {/* Today */}
                <header className="cal-today">
                    <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Бүгүн')}</div>
                    <div className="font-display cal-today-h">{h ? formatHijri(h) : ''}</div>
                    <div className="text-[0.95rem]" style={{ color: 'var(--text-muted)' }}>{dayLabel(today)}</div>
                    {(todayHoly.length > 0 || todaySunnah) && (
                        <p className="cal-today-note">{todayHoly.map(x => x.name()).join(' · ')}{todayHoly.length && todaySunnah ? ' · ' : ''}{todaySunnah ? t('орозо кармоо сүннөт ({0})', todaySunnah) : ''}</p>
                    )}
                    {!todayHoly.length && next[0] && <p className="cal-today-note">{t('{0}: {1} күндөн кийин', next[0].day.name(), next[0].inDays)}</p>}
                </header>

                {/* The month */}
                <section className="mt-9">
                    <div className="cal-head">
                        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1, 12))} aria-label={t('Мурунку ай')} className="cal-nav"><ChevronLeft className="w-5 h-5" /></button>
                        <div className="text-center min-w-0">
                            <div className="font-display text-[1.5rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{monthName(month)}</div>
                            <div className="text-[0.85rem] italic" style={{ color: 'var(--gold)' }}>{hijriSpan}</div>
                        </div>
                        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1, 12))} aria-label={t('Кийинки ай')} className="cal-nav"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                    <div className="cal-grid mt-4" role="grid">
                        {WEEK().map((w, i) => <span key={w} className="cal-wd" data-sun={i === 0 || i === 3 ? '' : undefined}>{w}</span>)}
                        {cells.map((d, i) => {
                            if (!d) return <span key={`e${i}`} />;
                            const hd = hijriOf(d, off);
                            const holy = holyDaysOf(hd);
                            const fast = fastOn(store, d);
                            const isToday = daysBetween(d, today) === 0;
                            const sel = daysBetween(d, picked) === 0;
                            return (
                                <button key={d.getDate()} onClick={() => setPicked(d)} className="cal-day" role="gridcell" aria-selected={sel}
                                    data-today={isToday || undefined} data-sel={sel || undefined} data-holy={holy.length ? holy[0].kind : undefined} data-fast={fast ?? undefined} data-ram={hd?.month === 9 || undefined} data-no={noFast(hd) || undefined} data-sunnah={sunnahFast(d, hd) ? '' : undefined}
                                    aria-label={`${dayLabel(d)}${hd ? ', ' + formatHijri(hd) : ''}${holy.length ? ', ' + holy.map(x => x.name()).join(', ') : ''}${fast ? ', ' + t('орозо') : ''}`}>
                                    <span className="cal-g tabular">{d.getDate()}</span>
                                    <span className="cal-h tabular">{hd ? (hd.day === 1 ? HIJRI_MONTHS[hd.month - 1].slice(0, 3) : hd.day) : ''}</span>
                                    {fast && <i className="cal-fast" aria-hidden="true" />}
                                    {store.notes[dayKey(d)] && <i className="cal-note" aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>
                    <div className="cal-legend">
                        <span><i className="lg-fast" />{t('орозо кармалды')}</span>
                        <span><i className="lg-holy" />{t('майрам, түн')}</span>
                        <span><i className="lg-sunnah" />{t('сүннөт орозо күнү')}</span>
                    </div>
                </section>

                {/* The chosen day */}
                <section className="cal-pick">
                    <div className="eyebrow" style={{ color: 'var(--gold)' }}>{ph ? formatHijri(ph) : ''}</div>
                    <h2 className="font-display text-[1.7rem] leading-tight mt-1" style={{ color: 'var(--text-primary)' }}>{dayLabel(picked)}</h2>
                    {pickedHoly.map(x => (
                        <p key={x.key} className="mt-2"><span className="font-display text-[1.2rem]" style={{ color: 'var(--gold)' }}>{x.name()}</span>{x.note && <span className="block text-[0.88rem]" style={{ color: 'var(--text-muted)' }}>{x.note()}</span>}</p>
                    ))}
                    {pickedNo ? (
                        <p className="mt-3 text-[0.95rem]" style={{ color: 'var(--danger)' }}>{t('Бул күнү орозо кармалбайт.')}</p>
                    ) : (
                        <div className="mt-4">
                            <div className="text-[0.9rem]" style={{ color: 'var(--text-secondary)' }}>
                                {inRamadan ? t('Рамазан, {0}-орозо', ph!.day) : pickedSunnah ? t('Орозо кармоо сүннөт: {0}', pickedSunnah) : t('Орозо')}
                            </div>
                            <div className="cal-kinds mt-3">
                                {inRamadan ? (
                                    <button data-on={pickedFast === 'ramadan' || undefined} onClick={() => save(s => setFast(s, picked, pickedFast === 'ramadan' ? null : 'ramadan'))}>{pickedFast === 'ramadan' ? t('Кармадым ✓') : t('Кармадым')}</button>
                                ) : (
                                    <>
                                        {KINDS.map(([k, l]) => <button key={k} data-on={pickedFast === k || undefined} onClick={() => save(s => setFast(s, picked, pickedFast === k ? null : k))}>{l()}</button>)}
                                    </>
                                )}
                                {pickedFast && pickedFast !== 'ramadan' && !inRamadan && <span className="cal-kept">{t('{0} орозо кармалды', kindName(pickedFast))}</span>}
                            </div>
                            {daysBetween(today, picked) > 0 && pickedFast && <p className="mt-2 text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{t('Алдыга белгиленди: ниет катары.')}</p>}
                        </div>
                    )}
                    <label className="block mt-6">
                        <span className="eyebrow">{t('Бул күнгө план')}</span>
                        <textarea value={note} onChange={e => setNoteText(e.target.value)} onBlur={() => save(s => setNote(s, picked, note))} rows={2} maxLength={500}
                            placeholder={t('мис. Куптандан кийин 1 пара; ата-энеме телефон')} className="cal-plan" />
                    </label>
                </section>

                <OrnamentDivider className="mt-12" />

                {/* Fasts */}
                <section className="mt-8">
                    <h2 className="font-display text-[1.8rem]" style={{ color: 'var(--text-primary)' }}>{t('Орозо')}</h2>
                    <dl className="acct-held">
                        <div><dt>{t('Бул айда')}</dt><dd className="tabular">{monthFasts}</dd></div>
                        <div><dt>{t('Рамазан')}</dt><dd className="tabular">{ramadanKept}<small>/{ramadan.length || 30}</small></dd></div>
                        <div><dt>{t('Каза кармалды')}</dt><dd className="tabular">{qDone}</dd></div>
                        <div><dt>{t('Каза калды')}</dt><dd className="tabular">{qLeft}</dd></div>
                    </dl>
                    {ramadan.length > 0 && (
                        <div className="mt-6">
                            <div className="eyebrow">{t('Рамазан {0}', hijriOf(ramadan[0], off)?.year ?? '')} · {ramadan[0].getDate()}.{String(ramadan[0].getMonth() + 1).padStart(2, '0')} – {ramadan[ramadan.length - 1].getDate()}.{String(ramadan[ramadan.length - 1].getMonth() + 1).padStart(2, '0')}</div>
                            <div className="cal-ram mt-3">
                                {ramadan.map((d, i) => {
                                    const kept = fastOn(store, d) === 'ramadan';
                                    const past = daysBetween(d, today) >= 0;
                                    return <button key={i} onClick={() => { setPicked(d); setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12)); }} data-kept={kept || undefined} data-past={past || undefined} aria-label={t('{0}-орозо', i + 1)} className="tabular">{i + 1}</button>;
                                })}
                            </div>
                            {daysBetween(today, ramadan[0]) > 0 && <p className="mt-2 text-[0.88rem]" style={{ color: 'var(--text-muted)' }}>{t('Рамазанга {0} күн калды.', daysBetween(today, ramadan[0]))}</p>}
                        </div>
                    )}
                    <div className="cal-qaza mt-7">
                        <div className="min-w-0">
                            <div className="font-display text-[1.2rem]" style={{ color: 'var(--text-primary)' }}>{t('Каза орозолор')}</div>
                            <div className="text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>{t('Мурунку Рамазандардан канча күн калганын жазыңыз; каза кармаган күнүңүздү календардан белгилейсиз.')}</div>
                        </div>
                        <div className="cal-step">
                            <button onClick={() => save(s => ({ ...s, qazaOwed: Math.max(0, s.qazaOwed - 1) }))} aria-label={t('Азайтуу')}><Minus className="w-4 h-4" /></button>
                            <span className="font-display tabular">{store.qazaOwed}</span>
                            <button onClick={() => save(s => ({ ...s, qazaOwed: Math.min(999, s.qazaOwed + 1) }))} aria-label={t('Көбөйтүү')}><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>
                </section>

                <OrnamentDivider className="mt-12" />

                {/* The year ahead */}
                <section className="mt-8">
                    <h2 className="font-display text-[1.8rem]" style={{ color: 'var(--text-primary)' }}>{t('Алдыдагы күндөр')}</h2>
                    <ul className="mt-3">
                        {next.map(x => (
                            <li key={`${x.day.key}-${x.inDays}`} className="cal-next">
                                <button onClick={() => { setPicked(x.date); setMonth(new Date(x.date.getFullYear(), x.date.getMonth(), 1, 12)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="row-link w-full text-left py-3.5 flex items-baseline gap-4">
                                    <span className={`cal-next-mark is-${x.day.kind}`} aria-hidden="true" />
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-display text-[1.25rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{x.day.name()}</span>
                                        <span className="block text-[0.82rem]" style={{ color: 'var(--text-muted)' }}>{dayLabel(x.date)}{x.day.kind === 'night' ? ` · ${t('мурунку кечте башталат')}` : ''}</span>
                                    </span>
                                    <span className="text-[0.85rem] tabular whitespace-nowrap" style={{ color: 'var(--gold)' }}>{x.inDays === 0 ? t('бүгүн') : x.inDays === 1 ? t('эртең') : t('{0} күн', x.inDays)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* The correction */}
                <section className="mt-10 cal-offset">
                    <div className="min-w-0">
                        <div className="eyebrow">{t('Хижрий күн')}</div>
                        <p className="text-[0.88rem] mt-1" style={{ color: 'var(--text-muted)' }}>{t('Эсептелген календарь (Умм аль-Кура). Муфтият жарыялаган күн бир күнгө айырмаланса, ушул жерден оңдоңуз.')}</p>
                    </div>
                    <div className="cal-kinds">
                        {[-1, 0, 1].map(v => <button key={v} data-on={off === v || undefined} onClick={() => save(s => ({ ...s, offset: v }))} className="tabular">{v === 0 ? '0' : v > 0 ? `+${v}` : v}</button>)}
                    </div>
                </section>
            </div>
        </AppFrame>
    );
};
