// Бүгүн: the reason to open the app every day. The prayer times where you
// are, the tasbihat whose time it is, an ayah of the day with its meaning,
// where you stopped in the Quran, today's zikr, your jamaat week — and, for
// a captain or the admin, how the houses stand.
import React, { Suspense, lazy, useContext, useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Clock3, Compass, MapPin } from 'lucide-react';
import { Crown, Mark } from '../components/Ornament';
import type { Theme } from '../theme';
import { useNow } from '../hooks/useNow';
import { loadCity } from '../utils/city';
import type { City, PrayerKey } from '../utils/prayer';
import { PRAYER_NAMES, PRAYER_ORDER, clock, nextPrayer, prayerNow, prayerTimes, untilText } from '../utils/prayer';
import { formatHijri, isRamadan, toHijri } from '../utils/hijri';
import { loadZikr, todayTotal } from '../utils/zikr';
import { calculateHouseRating } from '../utils/scoring';
import { weekComplete } from '../utils/insights';
import { formatWeekRange } from '../utils/weekDates';
import { withReload } from '../lazyLoad';
import { isEnglish, t } from '../i18n';
import { AppFrame, Section } from './AppFrame';
import { AppContext } from './context';
import { useSelf } from './self';
import { go } from './route';
import { TASBIHAT_ORDER, currentPrayer } from './tasbihat';
import type { Ayah, Rendering, Surah } from './quranData';
import { ayahOfDay, loadIndex, loadSurah, loadTranslation, translationLang } from './quranData';
import { loadLastRead, loadMode } from './quranStore';
import { loadPractice, pagesOn, tasbihatDone } from './practice';
import { CopyWeek } from './MyWeek';
import { MemberSummary } from './MemberResults';
import { signInWithGoogle, signOutMember, takeAuthError } from '../services/memberService';
import { useWeekTotals } from './useWeekTotals';
import { NewsTeaser } from './Community';
import { DayCalendar } from './DayCalendar';

const PrayerSheet = lazy(withReload(() => import('../components/PrayerSheet').then(m => ({ default: m.PrayerSheet }))));

const KY_DAYS = ['Жекшемби', 'Дүйшөмбү', 'Шейшемби', 'Шаршемби', 'Бейшемби', 'Жума', 'Ишемби'];
const KY_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const weekday = (d: Date) => (isEnglish() ? d.toLocaleDateString('en-GB', { weekday: 'long' }) : KY_DAYS[d.getDay()]);
const dayMonth = (d: Date) => (isEnglish() ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : `${d.getDate()}-${KY_MONTHS[d.getMonth()]}`);

const RowLink: React.FC<{ onClick: () => void; eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; mark?: React.ReactNode }> = ({ onClick, eyebrow, title, sub, mark }) => (
    <button onClick={onClick} className="row-link w-full text-left py-4 px-1 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
        {mark}
        <span className="flex-1 min-w-0">
            {eyebrow && <span className="eyebrow block mb-1">{eyebrow}</span>}
            <span className="block font-display text-[1.35rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{title}</span>
            {sub && <span className="block text-[0.85rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</span>}
        </span>
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--gold)' }} />
    </button>
);

/** The ayah of the day, with its meaning. */
const DailyAyah: React.FC<{ now: Date }> = ({ now }) => {
    const [state, setState] = useState<{ surah: Surah; ayah: number; text: Ayah; meaning: Rendering | null } | null>(null);
    const day = now.toDateString();
    useEffect(() => {
        let alive = true;
        (async () => {
            const index = await loadIndex();
            const at = ayahOfDay(new Date(day));
            const [rows, tr] = await Promise.all([loadSurah(at.surah), loadTranslation(at.surah).catch(() => null)]);
            if (alive) setState({ surah: index[at.surah - 1], ayah: at.ayah, text: rows[at.ayah - 1], meaning: tr?.[at.ayah - 1] ?? null });
        })().catch(() => undefined);
        return () => { alive = false; };
    }, [day]);
    if (!state) return <div className="py-10 flex justify-center"><div className="skeleton h-1 w-24" /></div>;
    return (
        <div className="pt-5">
            <p dir="rtl" lang="ar" className="quran-text text-center text-[1.75rem] leading-[2.1]" style={{ color: 'var(--text-primary)' }}>{state.text[0]}</p>
            {state.meaning && <p className="mt-4 text-[1rem] leading-relaxed text-center max-w-[36rem] mx-auto" lang={translationLang()} style={{ color: 'var(--text-secondary)' }}>{state.meaning[0]}</p>}
            <div className="text-center mt-3">
                <button onClick={() => go(`#/quran/${state.surah.n}:${state.ayah}`)} className="hit text-[0.72rem] tracking-[0.18em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}>
                    {state.surah.name} · {state.surah.n}:{state.ayah}
                </button>
            </div>
        </div>
    );
};

/** For a captain or the admin: the latest week of the jamaat. */
const Jamaat: React.FC = () => {
    const { signedIn, data, houseId, houseName, role, member } = useContext(AppContext);
    const week = data?.weeks[data.weeks.length - 1];
    const ranking = useMemo(() => {
        if (!week) return [];
        return week.teams.filter(tm => tm.submitted).map(tm => ({ id: tm.id, name: tm.name, rating: calculateHouseRating(tm) })).sort((a, b) => b.rating - a.rating);
    }, [week]);
    if (!signedIn) {
        if (member?.status === 'linked') {
            return (
                <div>
                    <div className="pt-4 flex items-baseline justify-between gap-3">
                        <span className="font-display text-[1.4rem]" style={{ color: 'var(--text-primary)' }}>{member.link.name} <span className="text-[1rem]" style={{ color: 'var(--text-muted)' }}>· {member.link.houseName}</span></span>
                        <button onClick={() => { signOutMember().catch(() => undefined); }} className="hit text-[0.7rem] tracking-[0.16em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}>{t('Чыгуу')}</button>
                    </div>
                    <MemberSummary link={member.link} />
                    <RowLink onClick={() => go('#/jamaat')} title={t('Жамааттын жыйынтыгы')} sub={t('Үйлөрдүн жарышы жана бирге окулган Куран')} />
                </div>
            );
        }
        if (member?.status === 'unlinked') {
            return (
                <div className="pt-4">
                    <p className="text-[0.95rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('Бул Google аккаунту азырынча эч бир мүчөгө байланган эмес. Капитаныңызга ушул даректи айтыңыз:')}</p>
                    <p className="font-display text-[1.3rem] mt-2 break-all" style={{ color: 'var(--gold)' }}>{member.email}</p>
                    <div className="flex flex-wrap gap-3 mt-4">
                        <button onClick={() => { signOutMember().catch(() => undefined); }} className="btn btn-ghost">{t('Чыгуу')}</button>
                        <button onClick={() => go('#/kiruu')} className="btn btn-ghost">{t('Кирүүнү текшерүү')}</button>
                    </div>
                </div>
            );
        }
        return null;
    }
    if (!week) return <RowLink onClick={() => go('#/overview')} title={t('Жыйынтыктар')} />;
    const mine = houseId ? ranking.findIndex(r => r.id === houseId) : -1;
    const filled = week.teams.filter(tm => tm.submitted).length;
    const dates = formatWeekRange(week.startDate ?? null, week.endDate ?? null);
    return (
        <div>
            <RowLink
                onClick={() => go('#/overview')}
                eyebrow={`${t('{0}-апта', week.weekNumber)}${dates ? ` · ${dates}` : ''}`}
                title={ranking[0] ? t('Алдыда: {0}', ranking[0].name) : t('Жыйынтыктар')}
                sub={weekComplete(week) ? t('Апта жабылды') : t('{0} / {1} үй толтурду', filled, week.teams.length)}
            />
            {role === 'leader' && houseName && (
                <RowLink
                    onClick={() => go('#/overview')}
                    title={mine >= 0 ? t('{0}: {1}-орун', houseName, mine + 1) : t('{0}: толтура элек', houseName)}
                    sub={mine >= 0 ? t('{0} упай', ranking[mine].rating.toFixed(1)) : t('Ушул аптанын маалыматын киргизиңиз')}
                />
            )}
        </div>
    );
};

/** The day as a path: the six times on a line, the part already gone in gold,
 *  a light where we are now. */
const DayPath: React.FC<{ times: Record<PrayerKey, Date>; now: Date; tz: string; next: PrayerKey }> = ({ times, now, tz, next }) => {
    const start = times.fajr.getTime(), end = times.isha.getTime();
    const at = (d: Date) => Math.min(1, Math.max(0, (d.getTime() - start) / (end - start)));
    const here = at(now);
    return (
        <div className="day-path mx-auto w-full max-w-[40rem] mt-8 px-2" aria-label={t('Бүгүнкү намаз убактылары')}>
            <div className="relative h-[3px] mx-3">
                <span className="absolute inset-0" style={{ backgroundColor: 'var(--border-strong)' }} />
                <span className="absolute left-0 top-0 bottom-0" style={{ width: `${here * 100}%`, backgroundColor: 'var(--gold)' }} />
                {now.getTime() >= start && now.getTime() <= end && <span className="day-path-now" style={{ left: `${here * 100}%` }} />}
                {PRAYER_ORDER.map(k => (
                    <span key={k} className="absolute top-1/2 w-[9px] h-[9px] rotate-45 -translate-x-1/2 -translate-y-1/2" style={{ left: `${at(times[k]) * 100}%`, backgroundColor: times[k].getTime() <= now.getTime() ? 'var(--gold)' : 'var(--page-plane)', border: '1px solid var(--gold)' }} />
                ))}
            </div>
            <ol className="grid grid-cols-6 mt-4 text-center">
                {PRAYER_ORDER.map(k => (
                    <li key={k} className="min-w-0">
                        {/* A narrow phone gets the two long names on two lines rather than cut. */}
                        <div className="day-path-name text-[0.72rem] sm:text-[0.8rem]" style={{ color: k === next ? 'var(--gold)' : 'var(--text-muted)' }}>{PRAYER_NAMES[k].includes(' ') ? <>{PRAYER_NAMES[k].split(' ')[0]}<span className="day-path-br"> </span>{PRAYER_NAMES[k].split(' ').slice(1).join(' ')}</> : PRAYER_NAMES[k]}</div>
                        <div className="font-display tabular text-[1.05rem] sm:text-[1.25rem] mt-0.5" style={{ color: k === next ? 'var(--gold)' : k === 'sunrise' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{clock(times[k], tz)}</div>
                    </li>
                ))}
            </ol>
        </div>
    );
};

/** A number the way the results write them: large, in the display face. */
const Figure: React.FC<{ value: React.ReactNode; label: string; gold?: boolean; first?: boolean; onClick?: () => void }> = ({ value, label, gold, first, onClick }) => {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag onClick={onClick} className={`flex-1 min-w-0 text-center py-4 ${onClick ? 'row-link' : ''}`} style={first ? undefined : { borderLeft: '1px solid var(--border)' }}>
            <div className="font-display tabular leading-none text-[2.1rem] sm:text-[2.5rem]" style={{ color: gold ? 'var(--gold)' : 'var(--text-primary)' }}>{value}</div>
            <div className="text-[0.66rem] tracking-[0.16em] uppercase mt-2" style={{ color: 'var(--text-muted)' }}>{label}</div>
        </Tag>
    );
};

export const TodayPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const now = useNow(30_000);
    const [city, setCity] = useState<City>(loadCity);
    const [sheet, setSheet] = useState(false);
    const [authError] = useState(takeAuthError);
    const times = useMemo(() => prayerTimes(city, now), [city, now]);
    const next = nextPrayer(city, now);
    // While a prayer's time is running, the page shows that prayer and when
    // its time ends; between sunrise and Dhuhr, the next one and how long.
    const hour = prayerNow(city, now);
    const shown = hour.active ?? null;
    const hijri = toHijri(now);
    const ramadan = isRamadan(hijri);
    const prayer = currentPrayer(city, now);
    const practice = loadPractice();
    const zikr = loadZikr();
    const last = loadLastRead();
    const totals = useWeekTotals();
    const { member, signedIn, role } = useContext(AppContext);
    const linked = member?.status === 'linked' ? member.link : null;
    const { self } = useSelf();
    const zikrToday = todayTotal(zikr);
    const readToday = TASBIHAT_ORDER.filter(p => tasbihatDone(practice, p, now)).length;
    const doneNow = tasbihatDone(practice, prayer, now);

    const hero = (
        <div className="monument relative flex flex-col items-center text-center pt-4 sm:pt-8 pb-8 sm:pb-12">
            <Crown className="draw-in h-auto w-[min(15rem,64%)]" style={{ color: 'var(--gold)' }} />
            <div className="eyebrow mt-4" style={{ color: 'var(--gold)' }}>{linked ? t('Ассалому алейкум, {0}', linked.name) : `${weekday(now)} · ${dayMonth(now)}`}</div>
            <div className="text-[0.85rem] italic mt-1.5" style={{ color: 'var(--text-muted)' }}>
                {linked && `${weekday(now)}, ${dayMonth(now)} · `}{hijri ? formatHijri(hijri) : ''}{ramadan && <span style={{ color: 'var(--gold)' }}> · {t('Рамазан мубарак')}</span>}
            </div>
            <div className="eyebrow mt-6" style={{ color: 'var(--text-muted)' }}>{shown ? t('Азыр') : t('Кийинки намаз')}</div>
            <h1 className="font-display leading-none mt-2 text-[2.2rem] sm:text-[3rem] animate-view-in" style={{ color: 'var(--text-primary)' }}>{shown ? PRAYER_NAMES[shown.key] : ramadan && next.key === 'maghrib' ? t('Ифтар') : PRAYER_NAMES[next.key]}</h1>
            <div className="relative mt-1">
                <span className="hero-glow" aria-hidden="true" />
                <div className="font-display tabular leading-[0.9] text-[5.4rem] sm:text-[7.5rem] gold-sheen">{clock(shown ? shown.at : next.at, city.tz)}</div>
            </div>
            <div className="mt-2 text-[0.95rem] tracking-[0.04em]" style={{ color: 'var(--text-muted)' }}>
                {shown
                    ? <>{ramadan && shown.endsKey === 'maghrib' ? t('Ифтар') : PRAYER_NAMES[shown.endsKey]} <span className="tabular" style={{ color: 'var(--gold)' }}>{clock(shown.endsAt, city.tz)}</span> · {t('{0} калды', untilText(shown.endsAt.getTime() - now.getTime()))}</>
                    : t('{0} калды', untilText(next.at.getTime() - now.getTime()))}
            </div>
            <DayPath times={times} now={now} tz={city.tz} next={shown ? shown.key : next.key} />
            {/* The almanac line: the day's times, the Qibla, the city, as one
                engraved row rather than a pair of generic buttons. */}
            <nav className="almanac mt-7" aria-label={t('Намаз')}>
                <button onClick={() => go('#/namaz')}><Clock3 className="w-[1.05rem] h-[1.05rem]" strokeWidth={1.4} /><span>{t('Бардык убактылар')}</span></button>
                <button onClick={() => go('#/qibla')}><Compass className="w-[1.05rem] h-[1.05rem]" strokeWidth={1.4} /><span>{t('Кыбла')}</span></button>
                <button onClick={() => setSheet(true)} title={t('шаарды алмаштыруу')}><MapPin className="w-[1.05rem] h-[1.05rem]" strokeWidth={1.4} /><span>{city.name}</span></button>
            </nav>
        </div>
    );

    return (
        <AppFrame page="today" title={t('Менин күнүм')} hero={hero} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[46rem] mx-auto">
                {authError && (
                    <div role="alert" className="mt-6 px-4 py-3 text-[0.92rem]" style={{ borderLeft: '2px solid var(--danger)', color: 'var(--text-secondary)' }}>
                        {authError.text}
                        <div className="text-[0.75rem] mt-1" style={{ color: 'var(--text-muted)' }}>{authError.detail}</div>
                        <button onClick={() => go('#/kiruu')} className="text-[0.72rem] tracking-[0.16em] uppercase mt-2" style={{ color: 'var(--gold)' }}>{t('Кирүүнү текшерүү')} →</button>
                    </div>
                )}

                {/* What the hour asks for: this prayer's tasbihat, the 33-33-34, the Quran. */}
                <Section eyebrow={t('Азыр · {0}', PRAYER_NAMES[prayer])}>
                    <RowLink
                        onClick={() => go(`#/tasbihat/${prayer}`)}
                        mark={<span className="w-7 h-7 rotate-45 inline-flex items-center justify-center flex-shrink-0 mx-1" style={{ border: '1px solid var(--gold)', backgroundColor: doneNow ? 'var(--gold)' : 'transparent' }}>{doneNow && <Check className="w-3.5 h-3.5 -rotate-45" style={{ color: 'var(--page-plane)' }} />}</span>}
                        title={t('{0} намазынын тасбихаты', PRAYER_NAMES[prayer])}
                        sub={doneNow ? t('Окулду · бүгүн {0} / 5', readToday) : t('Бүгүн окулду: {0} / 5', readToday)}
                    />
                    <RowLink
                        onClick={() => go('#/zikr/namaz')}
                        mark={<span className="w-7 mx-1 text-center font-display text-[1.1rem]" style={{ color: 'var(--gold)' }}>33</span>}
                        title={t('Намаздан кийинки тасбих')}
                        sub={t('Субханаллах 33 · Алхамдулиллах 33 · Аллаху акбар 34')}
                    />
                    <RowLink
                        onClick={() => go(last ? (last.page && loadMode() === 'pages' ? `#/quran/p/${last.page}` : `#/quran/${last.surah}:${last.ayah}`) : '#/quran')}
                        mark={<span className="w-7 mx-1 text-center quran-text text-[1.4rem] leading-none" style={{ color: 'var(--gold)' }} aria-hidden="true">ق</span>}
                        title={last ? t('Куран: {0}', last.name) : t('Куран окуу')}
                        sub={last ? t('{0}-аяттан улантуу · бүгүн {1} бет', last.ayah, pagesOn(practice)) : t('Мадина мусхафы, кыргызча мааниси менен')}
                    />
                </Section>

                {/* Not signed in: the way in, as part of the page rather than a wall in front of it. */}
                {!linked && !signedIn && member?.status !== 'unlinked' && (
                    <section className="welcome">
                        <Mark size={44} />
                        <h2 className="font-display">{t('Жамааттын апталык жыйынтыктары')}</h2>
                        <button onClick={() => { signInWithGoogle().catch(() => undefined); }} className="btn btn-primary"><span className="font-semibold text-[1.05rem]" aria-hidden="true">G</span>{t('Google менен кирүү')}</button>
                        <button onClick={() => go('#/overview')} className="welcome-staff">{t('Капитан, CL же админ')}<ChevronRight className="w-3.5 h-3.5" /></button>
                    </section>
                )}

                {(linked || signedIn) && (
                    <Section eyebrow={t('Жамааттан кабар')}>
                        <NewsTeaser />
                        <RowLink onClick={() => go('#/chat')} title={t('Баарлашуу')} sub={t('Жамааттын сөзү, үйдүн сөзү{0}', signedIn && role !== 'member' ? t(', капитандар') : '')} />
                    </Section>
                )}

                <Section eyebrow={t('Күндүн аяты')}>
                    <DailyAyah now={now} />
                </Section>

                {/* The jamaat week, in the captain's terms, as four large numbers. */}
                <Section eyebrow={t('Менин аптам')} action={<span className="text-[0.72rem]" style={{ color: 'var(--text-muted)' }}>{formatWeekRange(totals.start, totals.end)}</span>}>
                    <div className="flex">
                        <Figure first value={totals.salawat} label={t('Салават')} gold={totals.salawat > 0} onClick={() => go('#/zikr/salawat')} />
                        <Figure value={totals.zikr} label={t('Зикир')} onClick={() => go('#/zikr')} />
                        <Figure value={`${totals.tasbihat}`} label={t('Тасбихат')} onClick={() => go('#/tasbihat')} />
                        <Figure value={totals.pages} label={t('Бет')} onClick={() => go('#/quran')} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                        <span className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{t('Бүгүн {0} зикир', zikrToday)}</span>
                        {self ? <span className="text-[0.8rem]" style={{ color: 'var(--gold)' }}>{t('Капитаныңыз бул сандарды өзү көрөт.')}</span> : <CopyWeek totals={totals} />}
                    </div>
                </Section>

                <Section eyebrow={t('Тартип · акыркы 4 апта')}>
                    <DayCalendar now={now} />
                </Section>

                {(linked || signedIn || member?.status === 'unlinked') && (
                    <Section eyebrow={linked ? t('Менин үйүм') : t('Жамаат')}>
                        <Jamaat />
                    </Section>
                )}
            </div>
            {sheet && <Suspense fallback={null}><PrayerSheet onClose={() => setSheet(false)} onCityChange={c => setCity(c)} /></Suspense>}
        </AppFrame>
    );
};
