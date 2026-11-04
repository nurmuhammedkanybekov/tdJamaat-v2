import { useEffect, useRef } from 'react';

// Keyboard shortcuts for the laptop/projector in meetings:
//   ← / →   previous / next week      1 … 9   switch tab
// Ignored while typing, with a modifier key held, or while a sheet is open
// (`enabled` false) — there the keys belong to the form or the sheet.
export const useKeyboardNav = (enabled: boolean, handlers: { prev?: () => void; next?: () => void; tab?: (index: number) => void }) => {
    const ref = useRef(handlers);
    useEffect(() => { ref.current = handlers; });
    useEffect(() => {
        if (!enabled) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
            const el = e.target as HTMLElement | null;
            if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
            if (document.querySelector('[role="dialog"], [role="menu"]')) return;
            const h = ref.current;
            if (e.key === 'ArrowLeft' && h.prev) { e.preventDefault(); h.prev(); }
            else if (e.key === 'ArrowRight' && h.next) { e.preventDefault(); h.next(); }
            else if (/^[1-9]$/.test(e.key) && h.tab) h.tab(Number(e.key) - 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [enabled]);
};
