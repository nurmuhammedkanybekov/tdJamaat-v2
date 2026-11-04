import { describe, expect, it } from 'vitest';
import { skyAt } from './sky';
import { CITIES, prayerTimes } from './prayer';

const city = CITIES[0];
const day = new Date('2026-06-15T12:00:00Z');
const p = prayerTimes(city, day);
const at = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);

describe('the sky follows the prayer times', () => {
    it('names each part of the day after the prayer that opens it', () => {
        expect(skyAt(city, at(p.fajr, 5)).phase).toBe('dawn');
        expect(skyAt(city, at(p.sunrise, 5)).phase).toBe('morning');
        expect(skyAt(city, at(p.dhuhr, 5)).phase).toBe('noon');
        expect(skyAt(city, at(p.asr, 5)).phase).toBe('afternoon');
        expect(skyAt(city, at(p.maghrib, 5)).phase).toBe('sunset');
        expect(skyAt(city, at(p.isha, 5)).phase).toBe('night');
        expect(skyAt(city, at(p.fajr, -5)).phase).toBe('night');
    });

    it('the sun rises on the left and sets on the right', () => {
        const rise = skyAt(city, at(p.sunrise, 1)), noon = skyAt(city, new Date((p.sunrise.getTime() + p.maghrib.getTime()) / 2)), set = skyAt(city, at(p.maghrib, -1));
        expect(rise.body).toBe('sun');
        expect(rise.progress).toBeLessThan(0.05);
        expect(noon.progress).toBeCloseTo(0.5, 1);
        expect(set.progress).toBeGreaterThan(0.95);
    });

    it('at night the moon crosses, also before dawn', () => {
        const evening = skyAt(city, at(p.maghrib, 30)), small = skyAt(city, at(p.fajr, -30));
        expect(evening.body).toBe('moon');
        expect(small.body).toBe('moon');
        expect(small.progress).toBeGreaterThan(evening.progress);
    });
});
