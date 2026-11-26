import { useEffect, useRef } from 'react';

// Phones: the system Back (Android's back button, the iPhone swipe) closes the
// open sheet instead of leaving the page. Opening a sheet adds one history
// step (same address); Back takes it away and closes the top sheet. Closing
// with ✕ removes the step again — unless the sheet itself navigated somewhere
// (then that new page stays where it is).
const open: string[] = [];

export const useBackCloses = (onClose: () => void) => {
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
    useEffect(() => {
        const key = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        open.push(key);
        try { window.history.pushState({ ...(window.history.state ?? {}), tdModal: key }, '', window.location.href); } catch { /* not critical */ }
        let closedByBack = false;
        const onPop = () => {
            // Only the top sheet answers, and only when its step is gone.
            if (open[open.length - 1] !== key || (window.history.state as { tdModal?: string } | null)?.tdModal === key) return;
            closedByBack = true;
            onCloseRef.current();
        };
        window.addEventListener('popstate', onPop);
        return () => {
            window.removeEventListener('popstate', onPop);
            open.splice(open.indexOf(key), 1);
            if (!closedByBack && (window.history.state as { tdModal?: string } | null)?.tdModal === key) {
                try { window.history.back(); } catch { /* not critical */ }
            }
        };
    }, []);
};
