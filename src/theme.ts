// Tiny theme helper: light/dark, persisted, defaulting to the OS preference.
// Applied as a `.dark` class on <html> so Tailwind's custom dark variant
// (see index.css) and the CSS custom properties both key off the same class.

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tdjamaat-theme';

const prefersDark = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

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
export const initTheme = (): Theme => {
    const theme = getStoredTheme() ?? (prefersDark() ? 'dark' : 'light');
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
