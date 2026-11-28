// #/calendar — the Islamic calendar, the fasts and the day plans.
//
//   · today: the hijri date, what the day is, what is left from before;
//   · the month: gregorian and hijri days, holy days, sunnah fasting days,
//     fasts (intended, kept, missed) and days with plans;
//   · the chosen day: its fast (kind and state), its tasks (once or
//     repeating, after a prayer or at a time) and a note;
//   · below: the seven days ahead, the fasting record (Ramadan, make-up
//     fasts owed and made up) and the dates of the year.
// Everything is saved at once, on this device and (with an account) to it.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, CornerDownLeft, Minus, Plus, Repeat as RepeatIcon, Trash2, Undo2 } from 'lucide-react';
import type { Theme } from '../theme';
import { t, dateLocale } from '../i18n';
import { AppFrame } from './AppFrame';
import { Horn, OrnamentDivider } from '../components/Ornament';
import { HIJRI_MONTHS, formatHijri } from '../utils/hijri';
import type { HijriDate } from '../utils/hijri';
import { daysBetween, hijriOf, holyDaysOf, noFast, ramadanDays, shift, sunnahFast, upcoming } from '../utils/islamicCalendar';
import type { CalendarStore, Fast, FastKind, FastState, Repeat, Task, When } from './fasting';
import { addTask, editTask, fastOn, isDone, leftOver, loadCalendar, moveTask, noteOn, qazaLedger, removeTask, saveCalendar, setFast, setNote, tasksOn, toggleTask, unconfirmedFasts } from './fasting';

const KY_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const KY_WD = () => [t('жекшемби'), t('дүйшөмбү'), t('шейшемби'), t('шаршемби'), t('бейшемби'), t('жума'), t('ишемби')];
const monthName = (d: Date) => (dateLocale() ? d.toLocaleDateString(dateLocale()!, { month: 'long', year: 'numeric' }) : `${d.getFullYear()}-жыл, ${KY_MONTHS[d.getMonth()]}`);
const dayLabel = (d: Date) => (dateLocale() ? d.toLocaleDateString(dateLocale()!, { weekday: 'long', day: 'numeric', month: 'long' }) : `${d.getDate()}-${KY_MONTHS[d.getMonth()]}, ${KY_WD()[d.getDay()]}`);
const shortDay = (d: Date) => (dateLocale() ? d.toLocaleDateString(dateLocale()!, { day: 'numeric', month: 'short' }).replace('.', '') : `${d.getDate()}-${KY_MONTHS[d.getMonth()].slice(0, 3)}`);
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const weekdayName = (d: Date) => cap(dateLocale() ? d.toLocaleDateString(dateLocale()!, { weekday: 'long' }) : KY_WD()[d.getDay()]);
const monthShort = (d: Date) => (dateLocale() ? d.toLocaleDateString(dateLocale()!, { month: 'short' }).replace('.', '') : KY_MONTHS[d.getMonth()].slice(0, 3));
const WEEK = () => [t('Дш'), t('Шш'), t('Шр'), t('Бш'), t('Жм'), t('Иш'), t('Жш')];
const noon = (d: Date) => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x; };

/* ── names ─────────────────────────────────────────────────────────────── */

const KIND_NAME: Record<FastKind, () => string> = {
    ramadan: () => t('Рамазан'), sunnah: () => t('Сүннөт'), nafl: () => t('Нафил'), qaza: () => t('Каза')
};
const KIND_FULL: Record<FastKind, () => string> = {
    ramadan: () => t('Рамазан орозосу'), sunnah: () => t('Сүннөт орозо'), nafl: () => t('Нафил орозо'), qaza: () => t('Каза орозо')
};
const KIND_ABOUT: Record<FastKind, () => string> = {
    ramadan: () => t('Парз орозо.'),
    sunnah: () => t('Пайгамбарыбыз ﷺ кармап жүргөн күндөр: дүйшөмбү, бейшемби, ар айдын 13–15-күндөрү, Ашура, Арафа.'),
    nafl: () => t('Каалаган күнү, өз ыктыяры менен кармалган орозо.'),
    qaza: () => t('Рамазандан калган орозону өтөө.')
};
const STATE_NAME: Record<Exclude<FastState, 'off'>, () => string> = {
    plan: () => t('Ниет кылдым'), kept: () => t('Кармадым'), missed: () => t('Кармай албадым')
};
const WHEN_NAME: Record<string, () => string> = {
    fajr: () => t('Багымдаттан кийин'), dhuhr: () => t('Бешимден кийин'), asr: () => t('Асрдан кийин'), maghrib: () => t('Шамдан кийин'), isha: () => t('Куптандан кийин')
};
const whenName = (w: When) => (!w ? '' : WHEN_NAME[w]?.() ?? w);
const REPEAT_NAME: Record<Repeat, () => string> = {
    none: () => t('Бир жолу'), daily: () => t('Күн сайын'), weekly: () => t('Апта сайын'), monthly: () => t('Ай сайын')
};

/** The fast one would most likely keep on this day. */
const likelyKind = (h: HijriDate | null, sunnah: string | null, owed: number): FastKind =>
    h?.month === 9 ? 'ramadan' : sunnah ? 'sunnah' : owed > 0 ? 'qaza' : 'nafl';

/** Re-read the store whenever it changes (here, or from another device). */
const useCalendar = () => {
    const [s, set] = useState(loadCalendar);
    useEffect(() => {
        const on = () => set(loadCalendar());
        window.addEventListener('tdjamaat-calendar', on);
        window.addEventListener('tdjamaat-cloud', on);
        window.addEventListener('storage', on);
        return () => { window.removeEventListener('tdjamaat-calendar', on); window.removeEventListener('tdjamaat-cloud', on); window.removeEventListener('storage', on); };
    }, []);
    return s;
};
const save = (fn: (s: CalendarStore) => CalendarStore) => { const before = loadCalendar(); const after = fn(before); if (after !== before) saveCalendar(after); };

type Tab = 'week' | 'fasts' | 'year';

export const CalendarPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const store = useCalendar();
    const today = useMemo(() => noon(new Date()), []);
    const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12));
    const [picked, setPicked] = useState<Date>(today);
    const [tab, setTab] = useState<Tab>('week');
    const off = store.offset;
    const leafRef = useRef<HTMLElement>(null);

    /** Open a day: its month in the grid, its leaf in view (on a phone). */
    const open = (d: Date, scroll = true) => {
        setPicked(noon(d));
        setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12));
        if (scroll) window.setTimeout(() => leafRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    };

    const h = hijriOf(today, off);
    const holyToday = holyDaysOf(h);
    const sunnahToday = sunnahFast(today, h);
    const nextHoly = useMemo(() => upcoming(today, off, 1)[0], [today, off]);
    const left = leftOver(store, today);
    const unconfirmed = unconfirmedFasts(store, today);

    return (
        <AppFrame page="calendar" title={t('Календарь')} kicker={t('Хижрий жыл, орозо жана пландар')} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[68rem] mx-auto pt-6">
                {/* Today */}
                <header className="cal-today">
                    <div className="eyebrow" style={{ color: 'var(--gold)' }}><span className="greet-horn" aria-hidden="true"><Horn size={18} strokeWidth={4} /></span>{t('Бүгүн')}<span className="greet-horn" aria-hidden="true"><Horn size={18} strokeWidth={4} /></span></div>
                    <div className="font-display cal-today-h">{h ? formatHijri(h) : ''}</div>
                    <div className="text-[0.95rem]" style={{ color: 'var(--text-muted)' }}>{dayLabel(today)}</div>
                    <p className="cal-today-note">
                        {holyToday.length > 0 ? holyToday.map(x => x.name()).join(' · ')
                            : h?.month === 9 ? t('Рамазан, {0}-орозо', h.day)
                                : sunnahToday ? t('Бүгүн орозо кармоо сүннөт: {0}', sunnahToday)
                                    : nextHoly ? t('{0}: {1} күндөн кийин', nextHoly.day.name(), nextHoly.inDays) : ''}
                    </p>
                </header>

                {/* What is waiting from earlier days */}
                {(left.length > 0 || unconfirmed.length > 0) && (
                    <section className="cal-wait" aria-label={t('Мурунку күндөрдөн')}>
                        {unconfirmed.map(({ day, fast }) => (
                            <div key={day.toISOString()} className="cal-wait-row">
                                <span className="cal-wait-what"><b>{KIND_FULL[fast.k]()}</b> · {shortDay(day)}<span className="block text-[0.82rem]" style={{ color: 'var(--text-muted)' }}>{t('Ниет кылган элеңиз. Кармадыңызбы?')}</span></span>
                                <span className="cal-wait-act">
                                    <button onClick={() => save(s => setFast(s, day, fast.k, 'kept'))}>{t('Ооба')}</button>
                                    <button onClick={() => save(s => setFast(s, day, fast.k, 'missed'))}>{t('Жок')}</button>
                                </span>
                            </div>
                        ))}
                        {left.length > 0 && (
                            <div className="cal-wait-row">
                                <span className="cal-wait-what"><b>{t('{0|аткарылбаган иш|аткарылбаган иш}', left.length)}</b><span className="block text-[0.82rem]" style={{ color: 'var(--text-muted)' }}>{left.slice(0, 3).map(x => x.text).join(' · ')}{left.length > 3 ? ' …' : ''}</span></span>
                                <span className="cal-wait-act">
                                    <button onClick={() => save(s => left.reduce((acc, x) => moveTask(acc, x.id, today), s))}>{t('Бүгүнгө көчүрүү')}</button>
                                    <button onClick={() => open(new Date(`${left[0].day}T12:00:00`))}>{t('Көрүү')}</button>
                                </span>
                            </div>
                        )}
                    </section>
                )}

                <div className="cal-main">
                    <MonthGrid store={store} month={month} setMonth={setMonth} picked={picked} today={today} onPick={d => open(d, window.innerWidth < 1024)} />
                    <section ref={leafRef} className="cal-leaf" aria-live="polite">
                        <DayLeaf key={picked.toISOString()} store={store} day={picked} today={today} />
                    </section>
                </div>

                <OrnamentDivider className="mt-20" />

                {/* Below: the week ahead, the fasts, the year */}
                <div className="max-w-[46rem] mx-auto mt-8">
                    <nav className="cal-kinds cal-tabs" role="tablist">
                        {([['week', t('Алдыдагы 7 күн')], ['fasts', t('Орозо эсеби')], ['year', t('Жылдын күндөрү')]] as Array<[Tab, string]>).map(([k, l]) => (
                            <button key={k} role="tab" aria-selected={tab === k} data-on={tab === k || undefined} onClick={() => setTab(k)}>{l}</button>
                        ))}
                    </nav>
                    {tab === 'week' && <Agenda store={store} today={today} onOpen={open} />}
                    {tab === 'fasts' && <FastRecord store={store} today={today} onOpen={open} />}
                    {tab === 'year' && <YearAhead store={store} today={today} onOpen={open} />}
                </div>
            </div>
        </AppFrame>
    );
};

/* ── The month ─────────────────────────────────────────────────────────── */

const MonthGrid: React.FC<{ store: CalendarStore; month: Date; setMonth: React.Dispatch<React.SetStateAction<Date>>; picked: Date; today: Date; onPick: (d: Date) => void }> = ({ store, month, setMonth, picked, today, onPick }) => {
    const off = store.offset;
    const cells = useMemo(() => {
        const lead = (month.getDay() + 6) % 7;
        const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        const out: Array<Date | null> = Array.from({ length: lead }, () => null);
        for (let i = 1; i <= days; i++) out.push(new Date(month.getFullYear(), month.getMonth(), i, 12));
        while (out.length % 7) out.push(null);
        return out;
    }, [month]);
    const hijriSpan = useMemo(() => {
        const a = hijriOf(month, off), b = hijriOf(new Date(month.getFullYear(), month.getMonth() + 1, 0, 12), off);
        if (!a || !b) return '';
        return a.month === b.month ? `${HIJRI_MONTHS[a.month - 1]} ${a.year}` : `${HIJRI_MONTHS[a.month - 1]} – ${HIJRI_MONTHS[b.month - 1]} ${b.year}`;
    }, [month, off]);
    const thisMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
    const go = (n: number) => setMonth(m => new Date(m.getFullYear(), m.getMonth() + n, 1, 12));
    // a swipe sideways turns the month (on a phone)
    const touch = useRef<number | null>(null);

    return (
        <section className="cal-month" onTouchStart={e => { touch.current = e.touches[0].clientX; }} onTouchEnd={e => { const x = touch.current; touch.current = null; if (x === null) return; const dx = e.changedTouches[0].clientX - x; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); }}>
            <div className="cal-head">
                <button onClick={() => go(-1)} aria-label={t('Мурунку ай')} className="cal-nav"><ChevronLeft className="w-5 h-5" /></button>
                <div className="text-center min-w-0">
                    <div className="font-display text-[1.6rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{monthName(month)}</div>
                    <div className="text-[0.85rem] italic" style={{ color: 'var(--gold)' }}>{hijriSpan}</div>
                </div>
                <button onClick={() => go(1)} aria-label={t('Кийинки ай')} className="cal-nav"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <div className="cal-grid mt-4" role="grid">
                {WEEK().map((w, i) => <span key={w} className="cal-wd" data-sun={i === 0 || i === 3 ? '' : undefined}>{w}</span>)}
                {cells.map((d, i) => {
                    if (!d) return <span key={`e${i}`} />;
                    const hd = hijriOf(d, off);
                    const holy = holyDaysOf(hd);
                    const fast = fastOn(store, d);
                    const tasks = tasksOn(store, d);
                    const open = tasks.filter(x => !isDone(x, d)).length;
                    const isToday = daysBetween(d, today) === 0;
                    const sel = daysBetween(d, picked) === 0;
                    return (
                        <button key={d.getDate()} onClick={() => onPick(d)} className="cal-day" role="gridcell" aria-selected={sel}
                            data-today={isToday || undefined} data-sel={sel || undefined} data-past={daysBetween(d, today) > 0 || undefined}
                            data-holy={holy.length ? holy[0].kind : undefined} data-fast={fast?.s} data-ram={hd?.month === 9 || undefined}
                            data-no={noFast(hd) || undefined} data-sunnah={sunnahFast(d, hd) ? '' : undefined}
                            aria-label={`${dayLabel(d)}${hd ? ', ' + formatHijri(hd) : ''}${holy.length ? ', ' + holy.map(x => x.name()).join(', ') : ''}${fast ? ', ' + KIND_FULL[fast.k]() + ': ' + STATE_NAME[fast.s as Exclude<FastState, 'off'>]() : ''}${tasks.length ? ', ' + t('{0|иш|иш}', tasks.length) : ''}`}>
                            <span className="cal-g tabular">{d.getDate()}</span>
                            <span className="cal-h tabular">{hd ? (hd.day === 1 ? HIJRI_MONTHS[hd.month - 1].slice(0, 3) : hd.day) : ''}</span>
                            {fast && <i className="cal-fast" aria-hidden="true" />}
                            {tasks.length > 0 && <i className="cal-task" data-all={open === 0 || undefined} aria-hidden="true" />}
                        </button>
                    );
                })}
            </div>
            <div className="cal-legend">
                <span><i className="lg-fast" />{t('орозо')}</span>
                <span><i className="lg-plan" />{t('ниет')}</span>
                <span><i className="lg-task" />{t('иштер')}</span>
                <span><i className="lg-holy" />{t('майрам, түн')}</span>
                <span><b className="font-display" style={{ color: 'var(--gold)', fontWeight: 400 }}>14</b>&nbsp;{t('сүннөт орозо күнү')}</span>
            </div>
            {!thisMonth && <div className="text-center mt-3"><button className="cal-back" onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12)); onPick(today); }}><Undo2 className="w-3.5 h-3.5" />{t('Бүгүнгө кайтуу')}</button></div>}
        </section>
    );
};

/* ── The chosen day ────────────────────────────────────────────────────── */

const DayLeaf: React.FC<{ store: CalendarStore; day: Date; today: Date }> = ({ store, day, today }) => {
    const off = store.offset;
    const h = hijriOf(day, off);
    const holy = holyDaysOf(h);
    const rel = daysBetween(today, day);
    return (
        <>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>{h ? formatHijri(h) : ''}{rel === 0 ? ` · ${t('бүгүн')}` : rel === 1 ? ` · ${t('эртең')}` : rel === -1 ? ` · ${t('кечээ')}` : ''}</div>
            <h2 className="font-display text-[1.9rem] sm:text-[2.2rem] leading-tight mt-2" style={{ color: 'var(--text-primary)' }}>{dayLabel(day)}</h2>
            {holy.map(x => <p key={x.key} className="cal-pick-holy"><b>{x.name()}</b>{x.note && <span>{x.note()}</span>}</p>)}
            <FastControl store={store} day={day} today={today} h={h} />
            <Tasks store={store} day={day} />
            <DayNote store={store} day={day} />
        </>
    );
};

const FastControl: React.FC<{ store: CalendarStore; day: Date; today: Date; h: HijriDate | null }> = ({ store, day, today, h }) => {
    const fast = fastOn(store, day);
    const sunnah = sunnahFast(day, h);
    const ledger = qazaLedger(store);
    const [kind, setKind] = useState<FastKind>(fast?.k ?? likelyKind(h, sunnah, ledger.left));
    const future = daysBetween(today, day) > 0;
    const inRamadan = h?.month === 9;
    if (noFast(h)) return <div className="cal-block"><div className="cal-block-h">{t('Орозо')}</div><p className="text-[0.95rem] italic" style={{ color: 'var(--danger)' }}>{t('Бул күнү орозо кармалбайт.')}</p></div>;
    const kinds: FastKind[] = inRamadan ? ['ramadan'] : ['sunnah', 'nafl', 'qaza'];
    const states: Array<Exclude<FastState, 'off'>> = future ? ['plan'] : inRamadan ? ['kept', 'missed'] : ['plan', 'kept', 'missed'];
    const k = inRamadan ? 'ramadan' : kind;
    const mark = (s: Exclude<FastState, 'off'>) => save(st => (fast && fast.s === s && fast.k === k ? setFast(st, day, k, 'off') : setFast(st, day, k, s)));
    const chooseKind = (x: FastKind) => { setKind(x); if (fast) save(st => setFast(st, day, x, fast.s)); };
    return (
        <div className="cal-block">
            <div className="cal-block-h">{t('Орозо')}{sunnah && !inRamadan && <span className="cal-block-sub">{t('Бул күнү кармоо сүннөт: {0}', sunnah)}</span>}</div>
            {!inRamadan && (
                <div className="cal-kinds" role="radiogroup" aria-label={t('Орозонун түрү')}>
                    {kinds.map(x => <button key={x} role="radio" aria-checked={k === x} data-on={k === x || undefined} onClick={() => chooseKind(x)}>{KIND_NAME[x]()}</button>)}
                </div>
            )}
            <p className="cal-about">{KIND_ABOUT[k]()}{k === 'qaza' && ledger.left > 0 ? ' ' + t('Калганы: {0}.', ledger.left) : ''}</p>
            <div className="cal-states">
                {states.map(s => (
                    <button key={s} data-state={s} data-on={(fast?.s === s && fast.k === k) || undefined} onClick={() => mark(s)} aria-pressed={fast?.s === s && fast.k === k}>
                        <i aria-hidden="true" />{s === 'plan' && future ? t('Кармайм') : STATE_NAME[s]()}
                    </button>
                ))}
            </div>
            <FastLine fast={fast} future={future} />
        </div>
    );
};

const FastLine: React.FC<{ fast: Fast | null; future: boolean }> = ({ fast, future }) => {
    if (!fast) return null;
    const text = fast.s === 'plan' ? (future ? t('Ниет белгиленди. Күнү өткөндөн кийин бул жерден сурайбыз: кармадыңызбы?') : t('Ниет кылынган. Кармасаңыз, «Кармадым» деп белгилеңиз.'))
        : fast.s === 'kept' ? t('{0} кармалды. Аллах кабыл кылсын.', KIND_FULL[fast.k]())
            : fast.k === 'ramadan' ? t('Каза орозолорго кошулду.') : t('Белгиленди.');
    return <p className="cal-fast-line" data-state={fast.s}>{text}</p>;
};

const Tasks: React.FC<{ store: CalendarStore; day: Date }> = ({ store, day }) => {
    const list = tasksOn(store, day);
    const done = list.filter(x => isDone(x, day)).length;
    const [text, setText] = useState('');
    const [when, setWhen] = useState<When>('');
    const [clock, setClock] = useState('');
    const [repeat, setRepeat] = useState<Repeat>('none');
    const [more, setMore] = useState(false);
    const add = () => {
        if (!text.trim()) return;
        const w: When = when === ('clock' as When) ? (clock as When) : when;
        save(s => addTask(s, day, text, w, repeat));
        setText(''); setWhen(''); setClock(''); setRepeat('none'); setMore(false);
    };
    return (
        <div className="cal-block">
            <div className="cal-block-h">{t('Иштер')}{list.length > 0 && <span className="cal-block-sub tabular">{done}/{list.length}</span>}</div>
            {list.length > 0 && (
                <ul className="cal-tasks">
                    {list.map(x => <TaskRow key={x.id} task={x} day={day} />)}
                </ul>
            )}
            <form className="cal-add" onSubmit={e => { e.preventDefault(); add(); }}>
                <span className="cal-add-mark" aria-hidden="true"><Plus className="w-4 h-4" /></span>
                <input value={text} onChange={e => setText(e.target.value)} onFocus={() => setMore(true)} maxLength={300} placeholder={t('Жаңы иш: мис. 1 пара Куран, ата-энеге телефон')} aria-label={t('Жаңы иш')} />
                {text.trim() && <button type="submit" className="cal-add-go" aria-label={t('Кошуу')}><CornerDownLeft className="w-4 h-4" /></button>}
            </form>
            {more && (
                <div className="cal-add-opts">
                    <label><span className="sr-only">{t('Качан')}</span>
                        <select value={when.includes(':') ? 'clock' : when} onChange={e => setWhen(e.target.value as When)}>
                            <option value="">{t('Убакытсыз')}</option>
                            {Object.keys(WHEN_NAME).map(k => <option key={k} value={k}>{WHEN_NAME[k]()}</option>)}
                            <option value="clock">{t('Саатын коюу')}</option>
                        </select>
                    </label>
                    {when === ('clock' as When) && <input type="time" value={clock} onChange={e => setClock(e.target.value)} aria-label={t('Саат')} />}
                    <label><span className="sr-only">{t('Кайталоо')}</span>
                        <select value={repeat} onChange={e => setRepeat(e.target.value as Repeat)}>
                            {(Object.keys(REPEAT_NAME) as Repeat[]).map(k => <option key={k} value={k}>{REPEAT_NAME[k]()}</option>)}
                        </select>
                    </label>
                </div>
            )}
        </div>
    );
};

const TaskRow: React.FC<{ task: Task; day: Date }> = ({ task, day }) => {
    const done = isDone(task, day);
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(task.text);
    const meta = [whenName(task.when), task.repeat !== 'none' ? REPEAT_NAME[task.repeat]() : ''].filter(Boolean).join(' · ');
    const finish = () => { setEditing(false); if (text.trim() !== task.text) save(s => editTask(s, task.id, { text })); };
    return (
        <li className="cal-task-row" data-done={done || undefined}>
            <button className="cal-check" onClick={() => save(s => toggleTask(s, task.id, day))} aria-pressed={done} aria-label={done ? t('Аткарылды; кайра ачуу') : t('Аткарылды деп белгилөө')}>
                <i aria-hidden="true">{done && <Check className="w-3 h-3" strokeWidth={3} />}</i>
            </button>
            <div className="min-w-0 flex-1">
                {editing ? (
                    <input autoFocus value={text} onChange={e => setText(e.target.value)} onBlur={finish} onKeyDown={e => { if (e.key === 'Enter') finish(); if (e.key === 'Escape') { setText(task.text); setEditing(false); } }} className="cal-task-edit" maxLength={300} aria-label={t('Ишти өзгөртүү')} />
                ) : (
                    <button className="cal-task-text" onClick={() => setEditing(true)} title={t('Өзгөртүү')}>{task.text}</button>
                )}
                {meta && <span className="cal-task-meta">{task.repeat !== 'none' && <RepeatIcon className="w-3 h-3" />}{meta}</span>}
            </div>
            <button className="cal-task-x" onClick={() => save(s => removeTask(s, task.id, day))} aria-label={task.repeat === 'none' ? t('Өчүрүү') : t('Ушул күндөн баштап токтотуу')} title={task.repeat === 'none' ? t('Өчүрүү') : t('Ушул күндөн баштап токтотуу')}><Trash2 className="w-4 h-4" /></button>
        </li>
    );
};

const DayNote: React.FC<{ store: CalendarStore; day: Date }> = ({ store, day }) => {
    const [text, setText] = useState(() => noteOn(store, day));
    const [saved, setSaved] = useState<'' | 'saving' | 'saved'>('');
    const latest = useRef(text);
    latest.current = text;
    // Saved as one types (a moment after the last key), and on leaving the day.
    useEffect(() => {
        if (text === noteOn(loadCalendar(), day)) return;
        setSaved('saving');
        const id = window.setTimeout(() => { save(s => setNote(s, day, text)); setSaved('saved'); }, 600);
        return () => window.clearTimeout(id);
    }, [text, day]);
    useEffect(() => () => { save(s => setNote(s, day, latest.current)); }, [day]);
    return (
        <div className="cal-block">
            <label className="cal-block-h" htmlFor="cal-note">{t('Эскертме')}{saved && <span className="cal-block-sub">{saved === 'saving' ? t('Сакталууда…') : t('Сакталды')}</span>}</label>
            <textarea id="cal-note" value={text} onChange={e => setText(e.target.value)} rows={Math.min(8, Math.max(2, text.split('\n').length + 1))} maxLength={2000}
                placeholder={t('Бул күн тууралуу ой, дуба, эскертүү…')} className="cal-plan" />
        </div>
    );
};

/* ── The seven days ahead ──────────────────────────────────────────────── */

const Agenda: React.FC<{ store: CalendarStore; today: Date; onOpen: (d: Date) => void }> = ({ store, today, onOpen }) => {
    const days = Array.from({ length: 7 }, (_, i) => shift(today, i));
    return (
        <ul className="cal-agenda mt-6">
            {days.map((d, i) => {
                const hd = hijriOf(d, store.offset);
                const holy = holyDaysOf(hd);
                const fast = fastOn(store, d);
                const sunnah = sunnahFast(d, hd);
                const tasks = tasksOn(store, d);
                return (
                    <li key={i}>
                        <button className="cal-agenda-day row-link" onClick={() => onOpen(d)}>
                            <span className="cal-next-date" aria-hidden="true"><b className="tabular">{d.getDate()}</b><small>{monthShort(d)}</small></span>
                            <span className="flex-1 min-w-0 text-left">
                                <span className="block font-display text-[1.2rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{i === 0 ? t('Бүгүн') : i === 1 ? t('Эртең') : weekdayName(d)}<span className="text-[0.85rem] italic ml-2" style={{ color: 'var(--text-muted)' }}>{hd ? formatHijri(hd) : ''}</span></span>
                                {holy.map(x => <span key={x.key} className="block text-[0.88rem]" style={{ color: 'var(--gold)' }}>{x.name()}</span>)}
                                {fast ? <span className="block text-[0.88rem]" style={{ color: fast.s === 'kept' ? 'var(--success)' : 'var(--gold)' }}>{KIND_FULL[fast.k]()} · {fast.s === 'plan' ? t('ниет') : STATE_NAME[fast.s as Exclude<FastState, 'off'>]().toLowerCase()}</span>
                                    : sunnah && <span className="block text-[0.85rem] italic" style={{ color: 'var(--text-muted)' }}>{t('сүннөт орозо күнү')}</span>}
                                {tasks.map(x => <span key={x.id} className="cal-agenda-task" data-done={isDone(x, d) || undefined}>{x.when && <small>{whenName(x.when)}</small>}{x.text}</span>)}
                                {!holy.length && !fast && !tasks.length && !sunnah && <span className="block text-[0.85rem] italic" style={{ color: 'var(--text-muted)' }}>{t('Азырынча эч нерсе жок')}</span>}
                            </span>
                            <ChevronRight className="w-4 h-4 flex-shrink-0 mt-2" style={{ color: 'var(--gold)' }} />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};

/* ── The fasting record ────────────────────────────────────────────────── */

const FastRecord: React.FC<{ store: CalendarStore; today: Date; onOpen: (d: Date) => void }> = ({ store, today, onOpen }) => {
    const off = store.offset;
    const ramadan = useMemo(() => ramadanDays(today, off), [today, off]);
    const ledger = qazaLedger(store);
    const year = today.getFullYear();
    const kept = Object.entries(store.fasts).filter(([d, f]) => f.s === 'kept' && d.startsWith(String(year)));
    const byKind = (k: FastKind) => kept.filter(([, f]) => f.k === k).length;
    const ramKept = ramadan.filter(d => fastOn(store, d)?.s === 'kept' && fastOn(store, d)?.k === 'ramadan').length;
    const pct = ledger.owed ? Math.min(100, Math.round((ledger.madeUp / ledger.owed) * 100)) : 0;
    return (
        <div className="mt-6">
            <dl className="acct-held">
                <div><dt>{t('{0}-жылы', year)}</dt><dd className="tabular">{kept.length}</dd></div>
                <div><dt>{t('Сүннөт')}</dt><dd className="tabular">{byKind('sunnah')}</dd></div>
                <div><dt>{t('Нафил')}</dt><dd className="tabular">{byKind('nafl')}</dd></div>
                <div><dt>{t('Каза')}</dt><dd className="tabular">{byKind('qaza')}</dd></div>
            </dl>

            {ramadan.length > 0 && (
                <div className="mt-10">
                    <div className="eyebrow text-center" style={{ color: 'var(--gold)' }}>{t('Рамазан {0}', hijriOf(ramadan[0], off)?.year ?? '')} · {shortDay(ramadan[0])} – {shortDay(ramadan[ramadan.length - 1])}</div>
                    <div className="cal-ram mt-4">
                        {ramadan.map((d, i) => {
                            const f = fastOn(store, d);
                            return <button key={i} onClick={() => onOpen(d)} data-state={f?.k === 'ramadan' ? f.s : undefined} data-past={daysBetween(d, today) >= 0 || undefined} aria-label={`${t('{0}-орозо', i + 1)}${f ? ', ' + STATE_NAME[f.s as Exclude<FastState, 'off'>]() : ''}`} className="tabular"><i aria-hidden="true" />{i + 1}</button>;
                        })}
                    </div>
                    <p className="mt-3 text-center italic text-[0.9rem]" style={{ color: 'var(--text-muted)' }}>
                        {daysBetween(today, ramadan[0]) > 0 ? t('Рамазанга {0} күн калды.', daysBetween(today, ramadan[0])) : t('Кармалды: {0} / {1}. Күндү басып белгилеңиз.', ramKept, ramadan.length)}
                    </p>
                </div>
            )}

            <div className="cal-qaza mt-10">
                <div className="font-display text-[1.6rem]" style={{ color: 'var(--text-primary)' }}>{t('Каза орозолор')}</div>
                <div className="cal-qaza-sum">
                    <div><b className="font-display tabular">{ledger.left}</b><span>{t('калды')}</span></div>
                    <div><b className="font-display tabular">{ledger.madeUp}</b><span>{t('өтөлдү')}</span></div>
                </div>
                <div className="cal-qaza-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
                <div className="cal-qaza-earlier">
                    <div className="min-w-0 text-left">
                        <div className="text-[0.95rem]" style={{ color: 'var(--text-primary)' }}>{t('Мурунку жылдардан')}</div>
                        <div className="text-[0.82rem]" style={{ color: 'var(--text-muted)' }}>{t('Календарга чейинки карыз. Бул жерде белгиленген Рамазан күндөрү ({0}) өзү кошулат.', ledger.missed)}</div>
                    </div>
                    <div className="cal-step">
                        <button onClick={() => save(s => ({ ...s, qazaOwed: Math.max(0, s.qazaOwed - 1) }))} aria-label={t('Азайтуу')}><Minus className="w-4 h-4" /></button>
                        <input className="font-display tabular" inputMode="numeric" value={ledger.earlier} onChange={e => { const v = Math.max(0, Math.min(9999, Number(e.target.value.replace(/\D/g, '')) || 0)); save(s => ({ ...s, qazaOwed: v })); }} aria-label={t('Мурунку жылдардан калган каза')} />
                        <button onClick={() => save(s => ({ ...s, qazaOwed: Math.min(9999, s.qazaOwed + 1) }))} aria-label={t('Көбөйтүү')}><Plus className="w-4 h-4" /></button>
                    </div>
                </div>
                <p className="text-[0.85rem] italic mt-4" style={{ color: 'var(--text-muted)' }}>{t('Каза кармаган күнүңүздү календардан ачып, «Каза» → «Кармадым» деп белгилейсиз.')}</p>
            </div>
        </div>
    );
};

/* ── The dates of the year ─────────────────────────────────────────────── */

const YearAhead: React.FC<{ store: CalendarStore; today: Date; onOpen: (d: Date) => void }> = ({ store, today, onOpen }) => {
    const off = store.offset;
    const next = useMemo(() => upcoming(today, off, 10), [today, off]);
    return (
        <div className="mt-4">
            <ul>
                {next.map(x => (
                    <li key={`${x.day.key}-${x.inDays}`} className={`cal-next is-${x.day.kind}`}>
                        <button onClick={() => onOpen(x.date)} className="row-link w-full text-left py-4 flex items-center gap-4">
                            <span className="cal-next-date" aria-hidden="true"><b className="tabular">{x.date.getDate()}</b><small>{monthShort(x.date)}</small></span>
                            <span className="flex-1 min-w-0">
                                <span className="block font-display text-[1.25rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{x.day.name()}</span>
                                <span className="block text-[0.82rem]" style={{ color: 'var(--text-muted)' }}>{dayLabel(x.date)}{x.day.kind === 'night' ? ` · ${t('мурунку кечте башталат')}` : ''}</span>
                            </span>
                            <span className="text-[0.85rem] tabular whitespace-nowrap" style={{ color: 'var(--gold)' }}>{x.inDays === 0 ? t('бүгүн') : x.inDays === 1 ? t('эртең') : t('{0} күн', x.inDays)}</span>
                        </button>
                    </li>
                ))}
            </ul>
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
    );
};
