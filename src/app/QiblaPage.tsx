// #/qibla — the direction of the Kaaba. The bearing is calculated (adhan's
// great-circle Qibla) from the chosen city, or from the phone's location if
// the person allows it. On a phone with a compass the dial turns with the
// phone; elsewhere it shows the bearing from north.
import React, { useEffect, useState } from 'react';
import { Coordinates, Qibla } from 'adhan';
import { Compass, LocateFixed } from 'lucide-react';
import type { Theme } from '../theme';
import { t } from '../i18n';
import { AppFrame } from './AppFrame';
import { loadCity } from '../utils/city';

type Heading = number | null;
interface OrientationEventIOS extends DeviceOrientationEvent { webkitCompassHeading?: number }
interface DOEStatic { requestPermission?: () => Promise<'granted' | 'denied'> }

const KM_TO_MECCA = (lat: number, lng: number) => {
    const R = 6371, toR = (d: number) => d * Math.PI / 180;
    const [a1, b1, a2, b2] = [toR(lat), toR(lng), toR(21.4225), toR(39.8262)];
    return Math.round(2 * R * Math.asin(Math.sqrt(Math.sin((a2 - a1) / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin((b2 - b1) / 2) ** 2)));
};


export const QiblaPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const city = loadCity();
    const [place, setPlace] = useState<{ lat: number; lng: number; label: string }>({ lat: city.lat, lng: city.lng, label: city.name });
    const [heading, setHeading] = useState<Heading>(null);
    const [compass, setCompass] = useState<'off' | 'on' | 'denied' | 'none'>('off');
    const [locating, setLocating] = useState(false);
    const bearing = Qibla(new Coordinates(place.lat, place.lng));

    // The phone's heading (0 = north), when it has a compass and we are allowed.
    useEffect(() => {
        if (compass !== 'on') return;
        const on = (e: DeviceOrientationEvent) => {
            const ios = (e as OrientationEventIOS).webkitCompassHeading;
            if (typeof ios === 'number') setHeading(ios);
            else if (e.absolute && typeof e.alpha === 'number') setHeading(360 - e.alpha);
        };
        window.addEventListener('deviceorientationabsolute' as 'deviceorientation', on);
        window.addEventListener('deviceorientation', on);
        return () => { window.removeEventListener('deviceorientationabsolute' as 'deviceorientation', on); window.removeEventListener('deviceorientation', on); };
    }, [compass]);

    const startCompass = async () => {
        if (typeof window.DeviceOrientationEvent === 'undefined') { setCompass('none'); return; }
        const req = (window.DeviceOrientationEvent as unknown as DOEStatic).requestPermission;
        if (req) {
            try { setCompass((await req()) === 'granted' ? 'on' : 'denied'); } catch { setCompass('denied'); }
        } else setCompass('on');
    };
    const locate = () => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            p => { setPlace({ lat: p.coords.latitude, lng: p.coords.longitude, label: t('Азыркы жериңиз') }); setLocating(false); },
            () => setLocating(false),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
        );
    };

    // The dial turns so north points to the real north; the Kaaba mark sits at
    // the Qibla bearing on it. Without a compass the dial stays north-up.
    const dial = heading === null ? 0 : -heading;
    const facing = heading !== null && Math.abs(((bearing - heading + 540) % 360) - 180) < 4;

    return (
        <AppFrame page="today" title={t('Кыбла')} kicker={place.label} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[30rem] mx-auto text-center">
                <div className={`qibla ${facing ? 'is-facing' : ''}`} aria-label={t('Кыбла: түндүктөн {0}°', Math.round(bearing))}>
                    <svg viewBox="-120 -120 240 240" className="qibla-dial" style={{ transform: `rotate(${dial}deg)` }} aria-hidden="true">
                        <circle r="112" className="qibla-ring" />
                        <circle r="96" className="qibla-ring is-thin" />
                        {Array.from({ length: 72 }, (_, i) => (
                            <line key={i} y1={-112} y2={i % 18 === 0 ? -100 : i % 2 === 0 ? -105 : -108} className={i % 18 === 0 ? 'qibla-tick is-major' : 'qibla-tick'} transform={`rotate(${i * 5})`} />
                        ))}
                        <text y={-82} className="qibla-point" textAnchor="middle" dominantBaseline="middle">N</text>
                        {/* The Kaaba on the dial, at the Qibla bearing. */}
                        <g transform={`rotate(${bearing})`}>
                            <line y1={-20} y2={-70} className="qibla-needle" />
                            <g transform="translate(0,-84)">
                                <rect x={-9} y={-9} width={18} height={18} className="qibla-kaaba" />
                                <line x1={-9} x2={9} y1={-4} y2={-4} className="qibla-kaaba-band" />
                            </g>
                        </g>
                        <circle r="5" className="qibla-hub" />
                    </svg>
                    {heading !== null && <span className="qibla-top" aria-hidden="true" />}
                </div>

                <div className="font-display tabular text-[3.4rem] leading-none mt-8" style={{ color: 'var(--gold)' }}>{Math.round(bearing)}°</div>
                <div className="eyebrow mt-2">{t('түндүктөн саат жебеси боюнча')}</div>
                <p className="text-[0.92rem] mt-4" style={{ color: 'var(--text-secondary)' }}>
                    {facing ? t('Сиз Кыблага карап турасыз.') : heading !== null ? t('Телефонду Кааба белгиси жогору келгенче буруңуз.') : t('Меккеге чейин {0} км.', KM_TO_MECCA(place.lat, place.lng).toLocaleString())}
                </p>

                <div className="flex flex-wrap justify-center gap-3 mt-7">
                    {compass !== 'on' && <button className="btn btn-primary" onClick={startCompass}><Compass className="w-4 h-4" />  {t('Компасты күйгүзүү')}</button>}
                    <button className="btn btn-ghost" onClick={locate} disabled={locating}><LocateFixed className="w-4 h-4" />  {locating ? t('Изделүүдө…') : t('Менин жайгашкан жерим')}</button>
                </div>
                {compass === 'denied' && <p className="text-[0.82rem] italic mt-3" style={{ color: 'var(--danger)' }}>{t('Компаска уруксат берилген жок. Браузердин жөндөөлөрүнөн уруксат бериңиз.')}</p>}
                {compass === 'none' && <p className="text-[0.82rem] italic mt-3" style={{ color: 'var(--text-muted)' }}>{t('Бул түзмөктө компас жок. Даражаны колдонуңуз.')}</p>}
                {compass === 'on' && heading === null && <p className="text-[0.82rem] italic mt-3" style={{ color: 'var(--text-muted)' }}>{t('Компас күтүлүүдө… Телефонду сегиз сымал кыймылдатып көрүңүз.')}</p>}
                <p className="text-[0.75rem] italic mt-6" style={{ color: 'var(--text-muted)' }}>{t('Телефондун компасы темирден жана магниттен алыс так иштейт.')}</p>
            </div>
        </AppFrame>
    );
};
