import type React from 'react';
import { useEffect, useLayoutEffect, useRef } from 'react';

/** The viewer asked for less motion. */
export const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Adds `is-in` to the element once it scrolls into view (class `reveal`). */
export const useReveal = <T extends HTMLElement>() => {
    const ref = useRef<T>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (reduced() || typeof IntersectionObserver === 'undefined') { el.classList.add('is-in'); return; }
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return ref;
};


/**
 * Every outermost <section> inside the container that starts below the
 * screen rises into view as it is scrolled to. Runs before paint, so content
 * already on screen never flickers; re-runs when `key` changes (a new tab).
 */
export const useAutoReveal = (container: React.RefObject<HTMLElement | null>, key: unknown) => {
    useLayoutEffect(() => {
        const root = container.current;
        if (!root || reduced() || typeof IntersectionObserver === 'undefined') return;
        const fold = window.innerHeight * 0.92;
        const targets = [...root.querySelectorAll<HTMLElement>('section')]
            .filter(el => !el.parentElement?.closest('section, .reveal') && !el.classList.contains('reveal') && el.getBoundingClientRect().top > fold);
        if (!targets.length) return;
        targets.forEach(el => el.classList.add('reveal'));
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
        }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
        targets.forEach(el => io.observe(el));
        return () => io.disconnect();
    }, [container, key]);
};
