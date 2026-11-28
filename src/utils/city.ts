// The person's city for prayer times, the sky and the Qibla: one of CITIES,
// or their own place ("here", from the phone's location, worked out on the
// device; nothing is sent anywhere). Kept as one string: a city's id, or
// "here:<lat>,<lng>,<time zone>".
import type { City } from './prayer';
import { CITIES } from './prayer';
import { localChanged } from './localEvent';
import { t } from '../i18n';

const CITY_KEY = 'tdjamaat-city';

export const hereCity = (lat: number, lng: number, tz: string): City =>
    ({ id: 'here', name: t('Менин жайгашкан жерим'), lat, lng, tz, region: 'here' });

export const parseCity = (raw: string | null): City | null => {
    if (!raw) return null;
    if (raw.startsWith('here:')) {
        const [lat, lng, ...tz] = raw.slice(5).split(',');
        const la = Number(lat), lo = Number(lng);
        if (Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) return hereCity(la, lo, tz.join(',') || 'UTC');
        return null;
    }
    return CITIES.find(c => c.id === raw) ?? null;
};
const encode = (c: City) => (c.id === 'here' ? `here:${c.lat.toFixed(4)},${c.lng.toFixed(4)},${c.tz}` : c.id);

export const loadCity = (): City => {
    try { return parseCity(localStorage.getItem(CITY_KEY)) ?? CITIES[0]; } catch { return CITIES[0]; }
};

export const saveCity = (c: City) => {
    try { localStorage.setItem(CITY_KEY, encode(c)); } catch { /* not critical */ }
    localChanged();
    try { window.dispatchEvent(new Event('tdjamaat-city')); } catch { /* not in a browser */ }
};

/** The phone's place, as a city (asks the person once; null if refused). */
export const locate = (): Promise<City | null> => new Promise(resolve => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
        p => resolve(hereCity(p.coords.latitude, p.coords.longitude, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 6 * 3600e3 }
    );
});
