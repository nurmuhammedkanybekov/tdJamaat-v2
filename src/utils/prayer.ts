// Prayer times, calculated on the device with the open-source `adhan`
// library (MIT) — free, offline, nothing to update or pay for.
//
// Settings: Muslim World League angles, Hanafi Asr (the Kyrgyz madhab),
// and the "twilight angle" rule for summer nights at Hungary's latitude.
// If the local mosque's timetable differs by a minute or two, adjust
// ADJUST below (minutes per prayer) — that's the only place to change.
import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes } from 'adhan';

export interface City { id: string; name: string; lat: number; lng: number; tz: string }

export const CITIES: City[] = [
    { id: 'budapest', name: 'Будапешт', lat: 47.4979, lng: 19.0402, tz: 'Europe/Budapest' },
    { id: 'debrecen', name: 'Дебрецен', lat: 47.5316, lng: 21.6273, tz: 'Europe/Budapest' }
];

const ADJUST = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const PRAYER_NAMES: Record<PrayerKey, string> = {
    fajr: 'Багымдат', sunrise: 'Күн чыгыш', dhuhr: 'Бешим', asr: 'Аср', maghrib: 'Шам', isha: 'Куптан'
};
export const PRAYER_ORDER: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const prayerTimes = (city: City, date: Date): Record<PrayerKey, Date> => {
    const params = CalculationMethod.MuslimWorldLeague();
    params.madhab = Madhab.Hanafi;
    params.highLatitudeRule = HighLatitudeRule.TwilightAngle;
    params.adjustments = { ...ADJUST };
    const t = new PrayerTimes(new Coordinates(city.lat, city.lng), date, params);
    return { fajr: t.fajr, sunrise: t.sunrise, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha };
};

/** HH:MM in the city's own time zone (correct even when the phone is elsewhere). */
export const clock = (d: Date, tz: string) =>
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(d);

/** The next prayer from `now` (looks into tomorrow after Isha). Sunrise is skipped. */
export const nextPrayer = (city: City, now: Date): { key: PrayerKey; at: Date } => {
    const today = prayerTimes(city, now);
    for (const key of PRAYER_ORDER) {
        if (key === 'sunrise') continue;
        if (today[key] > now) return { key, at: today[key] };
    }
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    return { key: 'fajr', at: prayerTimes(city, tomorrow).fajr };
};

export const untilText = (ms: number) => {
    const m = Math.max(0, Math.round(ms / 60000));
    const h = Math.floor(m / 60);
    return h > 0 ? `${h} с ${m % 60} мүн` : `${m} мүн`;
};
