// Prayer times, calculated on the device with the open-source `adhan`
// library (MIT) — free, offline, nothing to update or pay for.
//
// Settings: Muslim World League angles, Hanafi Asr (the Kyrgyz madhab),
// and the "twilight angle" rule for summer nights at Hungary's latitude.
// If the local mosque's timetable differs by a minute or two, adjust
// ADJUST below (minutes per prayer) — that's the only place to change.
import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes } from 'adhan';
import { t } from '../i18n';

export interface City { id: string; name: string; lat: number; lng: number; tz: string; region?: 'hu' | 'kg' | 'world' | 'here' }

const c = (id: string, name: string, lat: number, lng: number, tz: string, region: City['region']): City => ({ id, name, lat, lng, tz, region });
/** The cities to choose from: where the jamaat lives, home, and where its people travel. */
export const CITIES: City[] = [
    c('budapest', t('Будапешт'), 47.4979, 19.0402, 'Europe/Budapest', 'hu'),
    c('debrecen', t('Дебрецен'), 47.5316, 21.6273, 'Europe/Budapest', 'hu'),
    c('szeged', t('Сегед'), 46.253, 20.1414, 'Europe/Budapest', 'hu'),
    c('pecs', t('Печ'), 46.0727, 18.2323, 'Europe/Budapest', 'hu'),
    c('gyor', t('Дьёр'), 47.6875, 17.6504, 'Europe/Budapest', 'hu'),
    c('miskolc', t('Мишкольц'), 48.1035, 20.7784, 'Europe/Budapest', 'hu'),
    c('bishkek', t('Бишкек'), 42.8746, 74.5698, 'Asia/Bishkek', 'kg'),
    c('osh', t('Ош'), 40.5283, 72.7985, 'Asia/Bishkek', 'kg'),
    c('jalalabad', t('Жалал-Абад'), 40.9333, 73.0, 'Asia/Bishkek', 'kg'),
    c('karakol', t('Каракол'), 42.4907, 78.3936, 'Asia/Bishkek', 'kg'),
    c('naryn', t('Нарын'), 41.4287, 75.9911, 'Asia/Bishkek', 'kg'),
    c('talas', t('Талас'), 42.5228, 72.2427, 'Asia/Bishkek', 'kg'),
    c('batken', t('Баткен'), 40.0563, 70.8194, 'Asia/Bishkek', 'kg'),
    c('tokmok', t('Токмок'), 42.8419, 75.3015, 'Asia/Bishkek', 'kg'),
    c('almaty', t('Алматы'), 43.2389, 76.8897, 'Asia/Almaty', 'world'),
    c('tashkent', t('Ташкент'), 41.2995, 69.2401, 'Asia/Tashkent', 'world'),
    c('moscow', t('Москва'), 55.7558, 37.6173, 'Europe/Moscow', 'world'),
    c('istanbul', t('Стамбул'), 41.0082, 28.9784, 'Europe/Istanbul', 'world'),
    c('vienna', t('Вена'), 48.2082, 16.3738, 'Europe/Vienna', 'world'),
    c('prague', t('Прага'), 50.0755, 14.4378, 'Europe/Prague', 'world'),
    c('warsaw', t('Варшава'), 52.2297, 21.0122, 'Europe/Warsaw', 'world'),
    c('berlin', t('Берлин'), 52.52, 13.405, 'Europe/Berlin', 'world'),
    c('london', t('Лондон'), 51.5074, -0.1278, 'Europe/London', 'world'),
    c('seoul', t('Сеул'), 37.5665, 126.978, 'Asia/Seoul', 'world'),
    c('dubai', t('Дубай'), 25.2048, 55.2708, 'Asia/Dubai', 'world')
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

/** The voluntary prayers' times, from the day's own times:
 *  · Тахажжуд: the last third of the night (from tonight's Maghrib to tomorrow's Fajr);
 *  · Ишрак: about 20 minutes after sunrise, when the sun has risen;
 *  · Духа: from Ишрак until about 10 minutes before Dhuhr (zawal). */
export const voluntaryTimes = (city: City, date: Date) => {
    const today = prayerTimes(city, date);
    const tomorrow = prayerTimes(city, new Date(date.getTime() + 24 * 3600e3));
    const night = tomorrow.fajr.getTime() - today.maghrib.getTime();
    const min = 60000;
    return {
        tahajjud: { from: new Date(tomorrow.fajr.getTime() - night / 3), to: tomorrow.fajr, midnight: new Date(today.maghrib.getTime() + night / 2) },
        ishraq: new Date(today.sunrise.getTime() + 20 * min),
        duha: { from: new Date(today.sunrise.getTime() + 20 * min), to: new Date(today.dhuhr.getTime() - 10 * min) }
    };
};
