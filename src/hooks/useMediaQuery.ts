import { useEffect, useState } from 'react';

// Tracks a CSS media query live — updates when a phone rotates, a window is
// resized, or a tablet goes split-screen. For layout that CSS alone can't
// express (e.g. a chart's pixel height passed as a prop).
export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(() =>
        typeof window !== 'undefined' && window.matchMedia(query).matches
    );

    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = () => setMatches(mql.matches);
        onChange();
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);

    return matches;
};

// Same breakpoint as Tailwind's `sm` (640px): below it we treat the screen as a phone.
export const useIsPhone = () => !useMediaQuery('(min-width: 640px)');
