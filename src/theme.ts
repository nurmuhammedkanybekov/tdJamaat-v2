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
