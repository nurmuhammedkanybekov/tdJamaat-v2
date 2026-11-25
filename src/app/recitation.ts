// Listening to the Quran: one ayah after another, on to the next surah, from
// a well-known recitation archive (everyayah.com, one MP3 per ayah). The text
// on screen follows the voice.
import { useEffect, useState } from 'react';
import { SURAHS } from '../utils/quranMeta';

export interface Reciter { id: string; name: string; folder: string }
export const RECITERS: Reciter[] = [
    { id: 'alafasy', name: 'Mishary Alafasy', folder: 'Alafasy_128kbps' },
    { id: 'husary', name: 'Mahmoud Khalil Al-Husary', folder: 'Husary_128kbps' },
    { id: 'minshawi', name: 'Muhammad Siddiq Al-Minshawi', folder: 'Minshawy_Murattal_128kbps' }
];
const KEY = 'tdjamaat-reciter-v1';
export const loadReciter = (): Reciter => { try { return RECITERS.find(r => r.id === localStorage.getItem(KEY)) ?? RECITERS[0]; } catch { return RECITERS[0]; } };
export const saveReciter = (id: string) => { try { localStorage.setItem(KEY, id); } catch { /* not critical */ } };

const pad = (n: number) => String(n).padStart(3, '0');
export const ayahUrl = (reciter: Reciter, surah: number, ayah: number) => `https://everyayah.com/data/${reciter.folder}/${pad(surah)}${pad(ayah)}.mp3`;

/** The ayah after this one (across surahs); null after the last. */
export const nextAyah = (surah: number, ayah: number): { surah: number; ayah: number } | null => {
    if (ayah < SURAHS[surah - 1][2]) return { surah, ayah: ayah + 1 };
    return surah < 114 ? { surah: surah + 1, ayah: 1 } : null;
};

export interface RecitationState { playing: boolean; loading: boolean; surah: number | null; ayah: number | null; failed: boolean }

// One player for the whole app: leaving a page does not stop the voice, and
// two pages never talk over each other.
let audio: HTMLAudioElement | null = null;
let state: RecitationState = { playing: false, loading: false, surah: null, ayah: null, failed: false };
const listeners = new Set<(s: RecitationState) => void>();
const set = (patch: Partial<RecitationState>) => { state = { ...state, ...patch }; listeners.forEach(l => l(state)); };

const playAt = (surah: number, ayah: number) => {
    if (!audio) {
        audio = new Audio();
        audio.preload = 'auto';
        audio.addEventListener('ended', () => {
            const next = state.surah && state.ayah ? nextAyah(state.surah, state.ayah) : null;
            if (next && state.playing) playAt(next.surah, next.ayah); else set({ playing: false });
        });
        audio.addEventListener('playing', () => set({ loading: false, failed: false }));
        audio.addEventListener('error', () => set({ playing: false, loading: false, failed: true }));
    }
    set({ surah, ayah, playing: true, loading: true, failed: false });
    audio.src = ayahUrl(loadReciter(), surah, ayah);
    audio.play().catch(() => set({ playing: false, loading: false }));
    // The next file starts loading now, so the voice does not pause between ayahs.
    const next = nextAyah(surah, ayah);
    if (next) { const pre = new Audio(); pre.preload = 'auto'; pre.src = ayahUrl(loadReciter(), next.surah, next.ayah); }
};

export const recite = (surah: number, ayah: number) => playAt(surah, ayah);
export const stopRecitation = () => { audio?.pause(); set({ playing: false, loading: false }); };
export const toggleRecitation = (surah: number, ayah: number) => {
    if (state.playing) stopRecitation();
    else if (state.surah && state.ayah && audio?.src) { audio.play().then(() => set({ playing: true })).catch(() => playAt(surah, ayah)); }
    else playAt(surah, ayah);
};

export const useRecitation = (): RecitationState => {
    const [s, setS] = useState(state);
    useEffect(() => { listeners.add(setS); return () => { listeners.delete(setS); }; }, []);
    return s;
};
