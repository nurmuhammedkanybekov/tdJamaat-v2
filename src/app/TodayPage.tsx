// Бүгүн: the reason to open the app every day. The prayer times where you
// are, the tasbihat whose time it is, an ayah of the day with its meaning,
// where you stopped in the Quran, today's zikr, your jamaat week — and, for
// a captain or the admin, how the houses stand.
import React, { Suspense, lazy, useContext, useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type { Theme } from '../theme';
import { useNow } from '../hooks/useNow';
import { loadCity, saveCity } from '../utils/city';
import type { City } from '../utils/prayer';
import { CITIES, PRAYER_NAMES, PRAYER_ORDER, clock, nextPrayer, prayerTimes, untilText } from '../utils/prayer';
import { formatHijri, isRamadan, toHijri } from '../utils/hijri';
import { loadZikr, streak, todayTotal } from '../utils/zikr';
import { calculateHouseRating } from '../utils/scoring';
import { weekComplete } from '../utils/insights';
import { formatWeekRange } from '../utils/weekDates';
import { withReload } from '../lazyLoad';
import { isEnglish, t } from '../i18n';
import { AppFrame, Section } from './AppFrame';
import { AppContext } from './context';
import { go } from './route';
import { TASBIHAT_ORDER, currentPrayer } from './tasbihat';
import type { Ayah, Rendering, Surah } from './quranData';
import { ayahOfDay, loadIndex, loadSurah, loadTranslation, translationLang } from './quranData';
import { loadLastRead } from './quranStore';
import { loadPractice, pagesOn, tasbihatDone } from './practice';
import { MyWeek } from './MyWeek';
import { useWeekTotals } from './useWeekTotals';

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
                <button onClick={() => go(`#/quran/${state.surah.n}:${state.ayah}`)} className="text-[0.72rem] tracking-[0.18em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}>
                    {state.surah.name} · {state.surah.n}:{state.ayah}
                </button>
            </div>
        </div>
    );
};

/** For a captain or the admin: the latest week of the jamaat. */
const Jamaat: React.FC = () => {
    const { signedIn, data, houseId, houseName, role } = useContext(AppContext);
    const week = data?.weeks[data.weeks.length - 1];
    const ranking = useMemo(() => {
        if (!week) return [];
        return week.teams.filter(tm => tm.submitted).map(tm => ({ id: tm.id, name: tm.name, rating: calculateHouseRating(tm) })).sort((a, b) => b.rating - a.rating);
    }, [week]);
    if (!signedIn) {
        return <RowLink onClick={() => go('#/overview')} title={t('Капитандар үчүн кирүү')} sub={t('Үйлөрдүн апталык жыйынтыктары')} />;
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

export const TodayPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const now = useNow();
    const [city, setCity] = useState<City>(loadCity);
    const [sheet, setSheet] = useState(false);
    const times = useMemo(() => prayerTimes(city, now), [city, now]);
    const next = nextPrayer(city, now);
    const hijri = toHijri(now);
    const ramadan = isRamadan(hijri);
    const prayer = currentPrayer(city, now);
    const practice = loadPractice();
    const zikr = loadZikr();
    const last = loadLastRead();
    const totals = useWeekTotals();
    const pick = (c: City) => { setCity(c); saveCity(c); };
    const zikrToday = todayTotal(zikr), days = streak(zikr);

    return (
        <AppFrame page="today" title={weekday(now)} kicker={dayMonth(now)} sub={<>{hijri && <span className="italic">{formatHijri(hijri)}</span>}{ramadan && <span style={{ color: 'var(--gold)' }}> · {t('Рамазан мубарак')}</span>}</>} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[46rem] mx-auto">
                {/* The next prayer: the one thing to know at a glance. */}
                <div className="text-center pt-8">
                    <div className="eyebrow">{t('Кийинки намаз')}</div>
                    <div className="font-display text-[2.8rem] sm:text-[3.4rem] leading-none mt-2" style={{ color: 'var(--text-primary)' }}>
                        {PRAYER_NAMES[next.key]} <span className="tabular" style={{ color: 'var(--gold)' }}>{clock(next.at, city.tz)}</span>
                    </div>
                    <div className="text-[0.95rem] italic mt-2" style={{ color: 'var(--text-muted)' }}>{t('{0} калды', untilText(next.at.getTime() - now.getTime()))}</div>
                </div>

                <Section eyebrow={t('Намаз убактылары · {0}', city.name)} action={<button onClick={() => setSheet(true)} className="text-[0.7rem] tracking-[0.16em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}>{t('7 күн')}</button>}>
                    <ol>
                        {PRAYER_ORDER.map(k => {
                            const isNext = k === next.key && next.at.toDateString() === now.toDateString();
                            return (
                                <li key={k} className="flex items-baseline gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                                    <span className="font-display text-[1.3rem]" style={{ color: isNext ? 'var(--gold)' : k === 'sunrise' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{PRAYER_NAMES[k]}</span>
                                    <span className="leader" />
                                    <span className="font-display text-[1.4rem] tabular" style={{ color: isNext ? 'var(--gold)' : 'var(--text-primary)' }}>{clock(times[k], city.tz)}</span>
                                </li>
                            );
                        })}
                    </ol>
                    <div className="chip-row mt-3" role="group" aria-label={t('Шаар')}>
                        {CITIES.map(c => <button key={c.id} className={`chip ${c.id === city.id ? 'is-active' : ''}`} aria-pressed={c.id === city.id} onClick={() => pick(c)}>{c.name}</button>)}
                    </div>
                </Section>

                <Section eyebrow={t('Ибадат')}>
                    <RowLink
                        onClick={() => go(`#/tasbihat/${prayer}`)}
                        mark={<span className="w-6 h-6 inline-flex items-center justify-center flex-shrink-0" style={{ border: `1px solid ${tasbihatDone(practice, prayer) ? 'var(--gold)' : 'var(--border-strong)'}`, color: 'var(--gold)' }}>{tasbihatDone(practice, prayer) && <Check className="w-3.5 h-3.5" />}</span>}
                        title={t('{0} намазынын тасбихаты', PRAYER_NAMES[prayer])}
                        sub={t('Бүгүн окулду: {0} / 5', TASBIHAT_ORDER.filter(p => tasbihatDone(practice, p, now)).length)}
                    />
                    <RowLink
                        onClick={() => go(last ? `#/quran/${last.surah}:${last.ayah}` : '#/quran')}
                        title={last ? t('Куран: {0}', last.name) : t('Куран окуу')}
                        sub={last ? t('{0}-аяттан улантуу · бүгүн {1} бет', last.ayah, pagesOn(practice)) : t('Мадина мусхафы, кыргызча мааниси менен')}
                    />
                    <RowLink
                        onClick={() => go('#/zikr/namaz')}
                        title={t('Намаздан кийинки тасбих')}
                        sub={days > 1 ? t('Бүгүн {0} зикир · катары менен {1} күн', zikrToday, days) : t('Бүгүн {0} зикир', zikrToday)}
                    />
                </Section>

                <Section eyebrow={t('Күндүн аяты')}>
                    <DailyAyah now={now} />
                </Section>

                <Section eyebrow={t('Менин аптам')}>
                    <MyWeek totals={totals} />
                </Section>

                <Section eyebrow={t('Жамаат')}>
                    <Jamaat />
                </Section>
            </div>
            {sheet && <Suspense fallback={null}><PrayerSheet onClose={() => setSheet(false)} onCityChange={c => setCity(c)} /></Suspense>}
        </AppFrame>
    );
};
