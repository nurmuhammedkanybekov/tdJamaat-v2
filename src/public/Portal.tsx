// The front door, open to everyone: today's prayer times at a glance, the
// Quran, the zikr counter — and the captains' entrance to the results.
import React from 'react';
import { ArrowRight, BookOpen, Clock3, Lock } from 'lucide-react';
import type { Theme } from '../theme';
import { Crown, Tumar } from '../components/Ornament';
import { HornBand, SkyLayer, StarField } from '../components/motion';
import { useNow } from '../hooks/useNow';
import { loadCity } from '../utils/city';
import { formatHijri, toHijri } from '../utils/hijri';
import { PRAYER_NAMES, PRAYER_ORDER, clock, nextPrayer, prayerTimes, untilText } from '../utils/prayer';
import { skyAt } from '../utils/sky';
import { loadZikr, todayTotal } from '../utils/zikr';
import { loadLastRead } from './quranStore';
import { t } from '../i18n';
import { PublicFrame } from './PublicFrame';
import { go } from './route';

const Door: React.FC<{ icon: React.ReactNode; title: string; note: string; to: string; delay: number }> = ({ icon, title, note, to, delay }) => (
    <button onClick={() => go(to)} className="card lift group w-full text-left p-5 sm:p-6 flex items-center gap-5 pop-in" style={{ animationDelay: `${delay}ms` }}>
        <span className="w-12 h-12 flex-shrink-0 inline-flex items-center justify-center rounded-full" style={{ border: '1px solid var(--gold)', color: 'var(--gold)' }}>{icon}</span>
        <span className="flex-1 min-w-0">
            <span className="block font-display text-[1.55rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{title}</span>
            <span className="block text-[0.88rem] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{note}</span>
        </span>
        <ArrowRight className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-1" style={{ color: 'var(--gold)' }} />
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
        <PublicFrame theme={theme} onToggleTheme={onToggleTheme}>
            <section className="hero portal-hero relative text-center pt-8 pb-8 -mx-[1.1rem] px-[1.1rem]">
                <SkyLayer phase={sky.phase} body={sky.body} progress={sky.progress} />
                <StarField count={40} />
                <Crown className="draw-in w-[min(15rem,62%)] h-auto mx-auto" style={{ color: 'var(--gold)' }} />
                {hijri && <div className="text-[0.85rem] italic mt-5" style={{ color: 'var(--text-muted)' }}>{formatHijri(hijri)} · {city.name}</div>}
                <div className="eyebrow mt-4" style={{ color: 'var(--gold)' }}>{t('Кийинки намаз')}</div>
                <div className="font-display text-[2.6rem] leading-none mt-2" style={{ color: 'var(--text-primary)' }}>{PRAYER_NAMES[next.key]}</div>
                <div className="font-display text-[4.6rem] leading-none tabular gold-sheen mt-1">{clock(next.at, city.tz)}</div>
                <div className="text-[0.9rem] mt-2" style={{ color: 'var(--text-muted)' }}>{untilText(next.at.getTime() - now.getTime())}</div>
                {/* Today's times in one line. */}
                <button onClick={() => go('#/namaz')} className="mt-6 w-full grid grid-cols-6 gap-1" aria-label={t('Намаз убактылары')}>
                    {PRAYER_ORDER.map(k => (
                        <span key={k} className="py-2" style={{ borderTop: `1px solid ${k === next.key ? 'var(--gold)' : 'var(--border)'}` }}>
                            <span className="block text-[0.62rem] truncate" style={{ color: k === next.key ? 'var(--gold)' : 'var(--text-muted)' }}>{PRAYER_NAMES[k]}</span>
                            <span className="block text-[0.92rem] tabular mt-0.5" style={{ color: k === next.key ? 'var(--gold)' : 'var(--text-primary)' }}>{clock(times[k], city.tz)}</span>
                        </span>
                    ))}
                </button>
            </section>
            <HornBand className="mb-6" />
            <div className="space-y-3.5">
                <Door icon={<BookOpen className="w-5 h-5" strokeWidth={1.5} />} title={t('Куран')} note={last ? t('Улантуу: {0}, {1}-аят', last.name, last.ayah) : t('Мадина мусхафы, 114 сүрө')} to={last ? `#/quran/${last.surah}` : '#/quran'} delay={100} />
                <Door icon={<Tumar size={22} />} title={t('Зикир')} note={zikrToday > 0 ? t('Бүгүн: {0}', zikrToday) : t('Тасбих, салават, истигфар')} to="#/zikr" delay={200} />
                <Door icon={<Clock3 className="w-5 h-5" strokeWidth={1.5} />} title={t('Намаз убактылары')} note={t('Бүгүн жана кийинки 7 күн')} to="#/namaz" delay={300} />
            </div>
            <button onClick={() => go(signedIn ? '#/overview' : '#/login')} className="mt-8 w-full flex items-center justify-center gap-2 py-3 text-[0.72rem] tracking-[0.2em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}>
                <Lock className="w-3.5 h-3.5" />{signedIn ? t('Жыйынтыктарга өтүү') : t('Капитандар үчүн кирүү')}
            </button>
        </PublicFrame>
    );
};
