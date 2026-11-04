// The hero's sky follows the day's prayer times in the chosen city: dawn
// after Fajr, morning after sunrise, noon after Dhuhr, afternoon after Asr,
// sunset after Maghrib, night after Isha. The sun (or, at night, the moon)
// travels along an arc: 0 = rising on the left, 1 = setting on the right.
import type { City } from './prayer';
import { prayerTimes } from './prayer';

export type SkyPhase = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'night';

export interface Sky {
    phase: SkyPhase;
    /** Sun between sunrise and Maghrib; moon from Maghrib to the next sunrise. */
    body: 'sun' | 'moon';
    /** 0 … 1 along the arc. */
    progress: number;
}

const DAY = 24 * 3600_000;
const clamp = (x: number) => Math.min(1, Math.max(0, x));

export const skyAt = (city: City, now: Date): Sky => {
    const today = prayerTimes(city, now);
    const t = now.getTime();
    const phase: SkyPhase =
        t < today.fajr.getTime() ? 'night'
            : t < today.sunrise.getTime() ? 'dawn'
                : t < today.dhuhr.getTime() ? 'morning'
                    : t < today.asr.getTime() ? 'noon'
                        : t < today.maghrib.getTime() ? 'afternoon'
                            : t < today.isha.getTime() ? 'sunset'
                                : 'night';
    if (t >= today.sunrise.getTime() && t < today.maghrib.getTime()) {
        return { phase, body: 'sun', progress: clamp((t - today.sunrise.getTime()) / (today.maghrib.getTime() - today.sunrise.getTime())) };
    }
    // Night arc: from this evening's Maghrib to tomorrow's sunrise (or from
    // yesterday's Maghrib to this morning's sunrise, before dawn).
    const before = t < today.sunrise.getTime();
    const other = prayerTimes(city, new Date(t + (before ? -DAY : DAY)));
    const start = (before ? other.maghrib : today.maghrib).getTime();
    const end = (before ? today.sunrise : other.sunrise).getTime();
    return { phase, body: 'moon', progress: clamp((t - start) / (end - start)) };
};
