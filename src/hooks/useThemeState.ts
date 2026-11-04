import { useState } from 'react';
import { getStoredTheme, setScreen, setTheme } from '../theme';
import type { Theme } from '../theme';

// Light/dark and "big screen" mode, mirrored in React state (the classes on
// <html> are the source of truth, set before React mounts — see main.tsx).
export const useThemeState = () => {
    const [theme, setThemeState] = useState<Theme>(() => getStoredTheme() ?? (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
    const [screen, setScreenState] = useState(() => document.documentElement.classList.contains('screen'));
    const toggleTheme = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        setThemeState(next);
    };
    const toggleScreen = () => { setScreen(!screen); setScreenState(!screen); };
    return { theme, toggleTheme, screen, toggleScreen };
};
