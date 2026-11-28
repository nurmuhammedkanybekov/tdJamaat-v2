// #/namaz — the prayer times as a page of their own: today, the next prayer,
// the week ahead, the city, the voluntary prayers' times, and the Qibla.
import React, { useEffect, useMemo, useState } from 'react';
import { Compass } from 'lucide-react';
import type { Theme } from '../theme';
import { t } from '../i18n';
import { AppFrame } from './AppFrame';
import { PrayerTimetable } from '../components/PrayerSheet';
import { OrnamentDivider } from '../components/Ornament';
import { go } from './route';
import type { City } from '../utils/prayer';
import { clock, voluntaryTimes } from '../utils/prayer';
import { loadCity } from '../utils/city';
import { useNow } from '../hooks/useNow';

/** Тахажжуд, Ишрак, Духа: when, from the day's times. */
const Voluntary: React.FC = () => {
    const [city, setCity] = useState<City>(loadCity);
    useEffect(() => { const on = () => setCity(loadCity()); window.addEventListener('tdjamaat-city', on); return () => window.removeEventListener('tdjamaat-city', on); }, []);
    const now = useNow();
    const day = useMemo(() => { const d = new Date(now); d.setHours(12, 0, 0, 0); return d; }, [now]);
    const v = useMemo(() => voluntaryTimes(city, day), [city, day]);
    const c = (d: Date) => clock(d, city.tz);
    const rows = [
        { name: t('Тахажжуд'), time: `${c(v.tahajjud.from)} – ${c(v.tahajjud.to)}`, about: t('Түндүн акыркы үчтөн бири: бүгүнкү шамдан эртеңки багымдатка чейинки түн боюнча. Уктап тургандан кийин окулат; түн ортосу — {0}.', c(v.tahajjud.midnight)) },
        { name: t('Ишрак'), time: c(v.ishraq), about: t('Күн чыгып, бир аз көтөрүлгөндөн кийин (күн чыккандан болжол менен 20 мүнөт өткөндө).') },
        { name: t('Духа'), time: `${c(v.duha.from)} – ${c(v.duha.to)}`, about: t('Ишрактан тартып бешимге аз калганга чейин; күндүн төрттөн бири өткөндө окуу артыкча.') }
    ];
    return (
        <section className="mt-12">
            <OrnamentDivider />
            <div className="text-center mt-8">
                <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Нафил намаздар')}</div>
                <h2 className="font-display text-[2rem] leading-tight mt-1" style={{ color: 'var(--text-primary)' }}>{t('Тахажжуд, Ишрак, Духа')}</h2>
            </div>
            <ul className="mt-6">
                {rows.map(r => (
                    <li key={r.name} className="vol-row">
                        <div className="flex items-baseline gap-3">
                            <span className="font-display text-[1.35rem]" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                            <span className="leader" />
                            <span className="font-display text-[1.3rem] tabular whitespace-nowrap" style={{ color: 'var(--gold)' }}>{r.time}</span>
                        </div>
                        <p className="text-[0.86rem] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{r.about}</p>
                    </li>
                ))}
            </ul>
            <p className="text-[0.8rem] italic mt-4" style={{ color: 'var(--text-muted)' }}>{t('Бул убакыттар намаз убактыларынан эсептелген болжолдуу убакыт. Так чектерин имамыңыздан сураңыз.')}</p>
        </section>
    );
};

export const NamazPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => (
    <AppFrame page="namaz" title={t('Намаз убактылары')} kicker={t('Бүгүн жана жуманын калганы')} theme={theme} onToggleTheme={onToggleTheme}>
        <div className="max-w-[38rem] mx-auto pt-6">
            <PrayerTimetable arc />
            <Voluntary />
            <button onClick={() => go('#/qibla')} className="row-link w-full mt-10 py-4 flex items-center gap-4 text-left" style={{ borderTop: '1px solid var(--gold-dim)', borderBottom: '1px solid var(--border)' }}>
                <Compass className="w-6 h-6 flex-shrink-0" strokeWidth={1.3} style={{ color: 'var(--gold)' }} />
                <span className="flex-1">
                    <span className="block font-display text-[1.3rem]" style={{ color: 'var(--text-primary)' }}>{t('Кыбла')}</span>
                    <span className="block text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>{t('Кааба кайсы тарапта экенин компас көрсөтөт')}</span>
                </span>
            </button>
        </div>
    </AppFrame>
);
