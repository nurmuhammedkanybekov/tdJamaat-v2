import { useEffect } from 'react';
import { reduced } from './useReveal';

/** A soft gold light follows the pointer over cards (desktop only): one
 *  listener for the page, the position passed to CSS (--mx, --my). */
export const useSpotlight = () => {
    useEffect(() => {
        if (reduced() || !window.matchMedia?.('(hover: hover)').matches) return;
        let last: HTMLElement | null = null;
        const onMove = (e: PointerEvent) => {
            const card = (e.target as HTMLElement | null)?.closest?.('.card') as HTMLElement | null;
            if (last && last !== card) { last.style.removeProperty('--mx'); last.style.removeProperty('--my'); }
            last = card;
            if (!card) return;
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - r.left}px`);
            card.style.setProperty('--my', `${e.clientY - r.top}px`);
        };
        document.addEventListener('pointermove', onMove, { passive: true });
        return () => document.removeEventListener('pointermove', onMove);
    }, []);
};
