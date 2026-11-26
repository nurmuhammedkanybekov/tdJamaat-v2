// Prayer times, calculated on the device with the open-source `adhan`
// library (MIT) — free, offline, nothing to update or pay for.
//
// Settings: Muslim World League angles, Hanafi Asr (the Kyrgyz madhab),
// and the "twilight angle" rule for summer nights at Hungary's latitude.
// If the local mosque's timetable differs by a minute or two, adjust
// ADJUST below (minutes per prayer) — that's the only place to change.
import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes } from 'adhan';
import { t } from '../i18n';

export interface City { id: string; name: string; lat: number; lng: number; tz: string }

export const CITIES: City[] = [
    { id: 'budapest', name: t('Будапешт'), lat: 47.4979, lng: 19.0402, tz: 'Europe/Budapest' },
    { id: 'debrecen', name: t('Дебрецен'), lat: 47.5316, lng: 21.6273, tz: 'Europe/Budapest' }
];

const ADJUST = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const PRAYER_NAMES: Record<PrayerKey, string> = {
    fajr: t('Багымдат'), sunrise: t('Күн чыгыш'), dhuhr: t('Бешим'), asr: t('Аср'), maghrib: t('Шам'), isha: t('Куптан')
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

/** What the hour is: the prayer whose time is running now (with when that
 *  time ends), or none between sunrise and Dhuhr. Fajr ends at sunrise; each
 *  other prayer lasts until the next one; Isha lasts until the next Fajr. */
export interface PrayerNow { active: { key: PrayerKey; at: Date; endsKey: PrayerKey; endsAt: Date } | null; next: { key: PrayerKey; at: Date } }
export const prayerNow = (city: City, now: Date): PrayerNow => {
    const day = prayerTimes(city, now);
    const next = nextPrayer(city, now);
    if (now < day.fajr) {
        const yesterday = prayerTimes(city, new Date(now.getTime() - 24 * 3600 * 1000));
        return { active: { key: 'isha', at: yesterday.isha, endsKey: 'fajr', endsAt: day.fajr }, next };
    }
    if (now < day.sunrise) return { active: { key: 'fajr', at: day.fajr, endsKey: 'sunrise', endsAt: day.sunrise }, next };
    if (now < day.dhuhr) return { active: null, next };
    const chain: PrayerKey[] = ['dhuhr', 'asr', 'maghrib', 'isha'];
    for (let i = chain.length - 1; i >= 0; i--) {
        const key = chain[i];
        if (now >= day[key]) {
            const endsKey: PrayerKey = chain[i + 1] ?? 'fajr';
            const endsAt = chain[i + 1] ? day[chain[i + 1]] : prayerTimes(city, new Date(now.getTime() + 24 * 3600 * 1000)).fajr;
            return { active: { key, at: day[key], endsKey, endsAt }, next };
        }
    }
    return { active: null, next };
};

export const untilText = (ms: number) => {
    const m = Math.max(0, Math.round(ms / 60000));
    const h = Math.floor(m / 60);
    return h > 0 ? t('{0} саат {1} мүн', h, m % 60) : t('{0} мүн', m);
};
