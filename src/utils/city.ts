import type { City } from './prayer';
import { CITIES } from './prayer';

const CITY_KEY = 'tdjamaat-city';

export const loadCity = (): City => {
    try { return CITIES.find(c => c.id === localStorage.getItem(CITY_KEY)) ?? CITIES[0]; } catch { return CITIES[0]; }
};

export const saveCity = (c: City) => { try { localStorage.setItem(CITY_KEY, c.id); } catch { /* not critical */ } };
