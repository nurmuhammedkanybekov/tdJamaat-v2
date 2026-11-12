// Where the reader stopped, and the chosen text size — on this device only.
export interface LastRead { surah: number; ayah: number; name: string }
const KEY = 'tdjamaat-quran-v1';
interface Store { last?: LastRead; size?: number }
const read = (): Store => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store; } catch { return {}; } };
const write = (s: Store) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* not critical */ } };
export const loadLastRead = (): LastRead | null => read().last ?? null;
export const saveLastRead = (last: LastRead) => write({ ...read(), last });
export const loadSize = (): number => read().size ?? (window.innerWidth < 640 ? 1.6 : 2);
export const saveSize = (size: number) => write({ ...read(), size });
