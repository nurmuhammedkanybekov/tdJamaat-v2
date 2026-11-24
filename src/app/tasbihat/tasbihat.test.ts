import { describe, expect, it } from 'vitest';
import { CITIES } from '../../utils/prayer';
import { TASBIHAT_ORDER, currentPrayer, linesOf, loadTasbihat, repeatOf } from './index';

describe('tasbihat', () => {
    it('reads how many times from a direction', () => {
        expect(repeatOf('(33 жолу),')).toBe(33);
        expect(repeatOf('(10 жолу окулуп, 10-нун аягында)')).toBe(10);
        expect(repeatOf('(33 жолу окулат. Каалагандар багымдат жана куптан намаздардан кийин 100 жолу окуса болот.)')).toBe(33);
        expect(repeatOf('(бул 3 жолу айтылат)')).toBe(3);
        expect(repeatOf('(1 жолу)')).toBeNull();
        expect(repeatOf('(3, 5 же 7 жолу окулат).')).toBeNull();
        expect(repeatOf('деп айтылат.')).toBeNull();
    });

    it('gives each line its own count; a direction alone counts for the line above', () => {
        const three = linesOf([[0, 'Субхааналлоох '], [1, '(33 жолу),'], [0, '\nАлхамду лиллаах '], [1, '(33 жолу),'], [0, '\nАллооху акбар '], [1, '(33 жолу),']]);
        expect(three.map(l => l.repeat)).toEqual([33, 33, 33]);
        const below = linesOf([[0, 'Лаа илааха иллаллоох'], [1, '\n(33 жолу окулат.)']]);
        expect(below.map(l => l.repeat)).toEqual([33, null]);
    });

    it('every prayer has its text, with headings, meanings and nothing empty', async () => {
        for (const id of [...TASBIHAT_ORDER, 'naaria']) {
            const data = await loadTasbihat(id);
            expect(data.id).toBe(id);
            expect(data.blocks.length).toBeGreaterThan(0);
            for (const b of data.blocks) {
                if (b.t === 'h') expect(b.v).toBeTruthy();
                else expect(b.parts!.map(p => p[1]).join('').trim()).not.toBe('');
            }
            expect(data.blocks.some(b => b.m?.length)).toBe(true);
        }
        const fajr = await loadTasbihat('fajr');
        expect(fajr.blocks.filter(b => b.t === 'h').length).toBeGreaterThan(5);
        expect(fajr.blocks.flatMap(b => (b.parts ? linesOf(b.parts) : [])).filter(l => l.repeat).length).toBeGreaterThan(5);
    });

    it('knows which prayer it is now', () => {
        const city = CITIES[0];
        const day = new Date('2026-11-12T12:00:00Z');
        const at = (h: number) => new Date(Date.UTC(2026, 10, 12, h, 0));
        expect(TASBIHAT_ORDER).toContain(currentPrayer(city, day));
        expect(currentPrayer(city, at(1))).toBe('isha');        // deep night: still Isha
        const noon = currentPrayer(city, at(12));
        expect(['dhuhr', 'asr']).toContain(noon);
    });
});
