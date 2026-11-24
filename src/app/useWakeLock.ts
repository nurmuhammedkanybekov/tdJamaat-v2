import { useEffect } from 'react';

/** Keeps the screen on while a page is being read or counted on, where the
 *  phone allows it. Released when the page is left. */
export const useWakeLock = () => {
    useEffect(() => {
        let lock: { release: () => Promise<void> } | null = null;
        let gone = false;
        const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } };
        const request = () => {
            nav.wakeLock?.request('screen').then(l => { if (gone) l.release().catch(() => undefined); else lock = l; }).catch(() => undefined);
        };
        request();
        const onVisible = () => { if (document.visibilityState === 'visible') request(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => { gone = true; document.removeEventListener('visibilitychange', onVisible); lock?.release().catch(() => undefined); };
    }, []);
};
