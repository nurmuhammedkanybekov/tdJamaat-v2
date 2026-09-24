import React from 'react';
import { Moon, Sun } from 'lucide-react';
import type { Theme } from '../theme';

interface ThemeToggleProps {
    theme: Theme;
    onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
    return (
        <button
            onClick={onToggle}
            aria-label={theme === 'dark' ? 'Жарык темага которуу' : 'Караңгы темага которуу'}
            title={theme === 'dark' ? 'Жарык тема' : 'Караңгы тема'}
            className="p-2 transition-colors"
            style={{ border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-secondary)' }}
        >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
    );
};
