// The front door, open to everyone. One screen answers "what time is it in
// the day of prayer?" (the dial), leads to what anyone may read or count
// (Quran, tasbihat, zikr, prayer times) — and shows the captains plainly
// where to go in.
import React from 'react';
import { ArrowRight, BookOpen, Clock3, LogIn, ScrollText, Trophy } from 'lucide-react';
import type { Theme } from '../theme';
import { Corners, Tumar } from '../components/Ornament';
import { HornBand, SkyLayer, StarField } from '../components/motion';
import { useNow } from '../hooks/useNow';
import { loadCity } from '../utils/city';
import { formatHijri, toHijri } from '../utils/hijri';
import { PRAYER_NAMES, PRAYER_ORDER, clock, nextPrayer, prayerTimes } from '../utils/prayer';
import { skyAt } from '../utils/sky';
import { loadZikr, todayTotal } from '../utils/zikr';
import { loadLastRead } from './quranStore';
import { currentPrayer } from './tasbihat';
import { t } from '../i18n';
import { DayDial } from './DayDial';
import { PublicFrame } from './PublicFrame';
import { go } from './route';

const Door: React.FC<{ icon: React.ReactNode; title: string; note: string; to: string; delay: number }> = ({ icon, title, note, to, delay }) => (
    <button onClick={() => go(to)} className="card lift group relative w-full text-left p-4 sm:p-6 flex flex-col pop-in" style={{ animationDelay: `${delay}ms`, minHeight: '9.5rem' }}>
        <span className="flex items-center justify-between">
            <span className="w-11 h-11 inline-flex items-center justify-center rounded-full" style={{ border: '1px solid var(--gold)', color: 'var(--gold)' }}>{icon}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: 'var(--gold)' }} />
        </span>
        <span className="block font-display text-[1.45rem] sm:text-[1.7rem] leading-tight mt-auto pt-4" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <span className="block text-[0.82rem] sm:text-[0.9rem] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>{note}</span>
    </button>
);

export const Portal: React.FC<{ theme: Theme; onToggleTheme: () => void; signedIn?: boolean }> = ({ theme, onToggleTheme, signedIn }) => {
    const now = useNow();
    const city = loadCity();
    const times = prayerTimes(city, now);
    const next = nextPrayer(city, now);
    const sky = skyAt(city, now);
    const hijri = toHijri(now);
    const zikrToday = todayTotal(loadZikr(), now);
    const last = loadLastRead();
    return (
        <PublicFrame theme={theme} onToggleTheme={onToggleTheme} width="full">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-x-14 xl:gap-x-20 lg:items-center lg:min-h-[calc(100dvh-4.5rem)] lg:py-8">
                {/* The day */}
                <section className="hero portal-hero relative text-center pt-7 pb-6 -mx-[1.1rem] px-[1.1rem] lg:mx-0 lg:px-6 lg:py-10">
                    <SkyLayer phase={sky.phase} progress={sky.progress} />
                    <StarField count={40} />
                    <h1 className="font-display text-[1.7rem] lg:text-[2.1rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{t('Ассалому алейкум')}</h1>
                    <div className="text-[0.9rem] italic mt-1" style={{ color: 'var(--text-muted)' }}>{hijri ? `${formatHijri(hijri)} · ` : ''}{city.name}</div>
                    <DayDial city={city} now={now} className="mt-4" />
                    <button onClick={() => go('#/namaz')} className="mt-4 w-full max-w-[30rem] mx-auto grid grid-cols-6 gap-1" aria-label={t('Намаз убактылары')}>
                        {PRAYER_ORDER.map(k => (
                            <span key={k} className="py-2" style={{ borderTop: `1px solid ${k === next.key ? 'var(--gold)' : 'var(--border)'}` }}>
                                <span className="block text-[0.64rem] truncate" style={{ color: k === next.key ? 'var(--gold)' : 'var(--text-muted)' }}>{PRAYER_NAMES[k]}</span>
                                <span className="block text-[0.95rem] tabular mt-0.5" style={{ color: k === next.key ? 'var(--gold)' : 'var(--text-primary)' }}>{clock(times[k], city.tz)}</span>
                            </span>
                        ))}
                    </button>
                </section>

                <div className="pb-4">
                    <div className="lg:hidden"><HornBand className="mb-6" /></div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <Door icon={<BookOpen className="w-5 h-5" strokeWidth={1.5} />} title={t('Куран')} note={last ? t('Улантуу: {0}, {1}-аят', last.name, last.ayah) : t('Мадина мусхафы, 114 сүрө')} to={last ? `#/quran/${last.surah}` : '#/quran'} delay={80} />
                        <Door icon={<ScrollText className="w-5 h-5" strokeWidth={1.5} />} title={t('Тасбихат')} note={t('Азыр: {0} намазынан кийин', PRAYER_NAMES[currentPrayer(city, now)])} to="#/tasbihat" delay={140} />
                        <Door icon={<Tumar size={22} />} title={t('Зикир')} note={zikrToday > 0 ? t('Бүгүн: {0}', zikrToday) : t('Тасбих, салават, истигфар')} to="#/zikr" delay={200} />
                        <Door icon={<Clock3 className="w-5 h-5" strokeWidth={1.5} />} title={t('Намаз')} note={t('Бүгүн жана кийинки 7 күн')} to="#/namaz" delay={260} />
                    </div>

                    {/* The captains' and the admin's entrance: plain to see, one tap. */}
                    <section className="card relative mt-4 p-5 sm:p-7 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ borderTop: '2px solid var(--gold)' }}>
                        <Corners inset={6} size={20} />
                        <div className="flex-1 min-w-[13rem]">
                            <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Капитандар жана админ үчүн')}</div>
                            <div className="font-display text-[1.5rem] sm:text-[1.7rem] leading-tight mt-1" style={{ color: 'var(--text-primary)' }}>{t('Үйлөрдүн жыйынтыктары')}</div>
                            <p className="text-[0.88rem] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>{t('Апталык рейтинг, сыйлыктар жана маалымат киргизүү.')}</p>
                        </div>
                        <button onClick={() => go(signedIn ? '#/overview' : '#/login')} className="btn btn-primary w-full sm:w-auto" style={{ minHeight: '3rem', paddingInline: '1.6rem' }}>
                            {signedIn ? <Trophy className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}{signedIn ? t('Жыйынтыктарга өтүү') : t('Кирүү')}
                        </button>
                    </section>
                </div>
            </div>
        </PublicFrame>
    );
};
