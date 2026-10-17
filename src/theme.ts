// Tiny theme helper: light/dark, persisted, defaulting to dark.
// Applied as a `.dark` class on <html> so Tailwind's custom dark variant
// (see index.css) and the CSS custom properties both key off the same class.

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tdjamaat-theme';

export const getStoredTheme = (): Theme | null => {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value === 'light' || value === 'dark' ? value : null;
    } catch {
        return null;
    }
};

export const applyTheme = (theme: Theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
};

// Call once, synchronously, before React mounts — avoids a flash of the wrong theme.
// "Түн" is a night-first design: dark unless the viewer has chosen light.
export const initTheme = (): Theme => {
    const theme = getStoredTheme() ?? 'dark';
    applyTheme(theme);
    return theme;
};

export const setTheme = (theme: Theme) => {
    applyTheme(theme);
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // Non-fatal — theme just won't persist across visits.
    }
};

// "Чоң экран" (big screen) mode, for showing the site on a monitor or a
// projector in meetings: bigger and heavier text, stronger contrast, thicker
// chart lines. A `.screen` class on <html> (styles in index.css), remembered
// per device. `?ekran` in the address turns it on, `?ekran=0` turns it off,
// so the meeting computer can open it straight from a bookmark.
const SCREEN_KEY = 'tdjamaat-screen';

export const applyScreen = (on: boolean) => {
    document.documentElement.classList.toggle('screen', on);
};

export const setScreen = (on: boolean) => {
    applyScreen(on);
    try { localStorage.setItem(SCREEN_KEY, on ? '1' : '0'); } catch { /* not critical */ }
};

export const initScreen = (): boolean => {
    let on = false;
    try { on = localStorage.getItem(SCREEN_KEY) === '1'; } catch { /* not critical */ }
    const param = new URLSearchParams(window.location.search).get('ekran');
    if (param !== null) {
        on = param !== '0';
        try { localStorage.setItem(SCREEN_KEY, on ? '1' : '0'); } catch { /* not critical */ }
    }
    applyScreen(on);
    return on;
};
