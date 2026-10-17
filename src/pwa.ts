// Installable app (PWA): service worker registration + the browser's
// "Add to Home Screen" prompt.
import { useEffect, useState } from 'react';

export const registerServiceWorker = () => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.warn('[tdJamaat] service worker not registered:', err));
    });
};

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferred = e as BeforeInstallPromptEvent;
        listeners.forEach(l => l());
    });
    window.addEventListener('appinstalled', () => {
        deferred = null;
        listeners.forEach(l => l());
    });
}

const isStandalone = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

// iPadOS reports itself as a Mac; a touch screen gives it away.
export const isIos = () =>
    typeof navigator !== 'undefined' &&
    (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// 'prompt'  → Chrome/Edge/Android: we can show the native install dialog.
// 'ios'     → Safari on iPhone/iPad: no API, show "Share → Add to Home Screen".
// 'none'    → already installed, or the browser can't install.
export type InstallMode = 'prompt' | 'ios' | 'none';

const compute = (): InstallMode => (isStandalone() ? 'none' : deferred ? 'prompt' : isIos() ? 'ios' : 'none');

export const useInstallPrompt = () => {
    const [mode, setMode] = useState<InstallMode>(compute);
    useEffect(() => {
        const update = () => setMode(compute());
        listeners.add(update);
        return () => { listeners.delete(update); };
    }, []);
    const install = async () => {
        if (!deferred) return false;
        await deferred.prompt();
        const choice = await deferred.userChoice;
        deferred = null;
        setMode(compute());
        return choice.outcome === 'accepted';
    };
    return { mode, install };
};

// "A new version is available". After a deploy, an app that stays open (or
// is installed on the home screen and only resumed) keeps running the old
// code. Every few minutes, and when the app comes back to the screen, ask
// the server for the page and compare its main script file (its name
// changes on every deploy) with the one running now. Never reloads by
// itself — the person decides, so nothing they're typing is lost.
const UPDATE_CHECK_MS = 5 * 60_000;

const scriptName = (html: string): string | null => html.match(/\/assets\/index-[\w-]+\.js/)?.[0] ?? null;

export const useUpdateAvailable = () => {
    const [available, setAvailable] = useState(false);
    useEffect(() => {
        if (!import.meta.env.PROD) return;
        const running = scriptName(document.documentElement.outerHTML);
        if (!running) return;
        let stopped = false;
        let last = 0;
        const check = async () => {
            if (stopped || document.visibilityState !== 'visible' || Date.now() - last < 60_000) return;
            last = Date.now();
            try {
                const res = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' });
                if (!res.ok) return;
                const latest = scriptName(await res.text());
                if (latest && latest !== running) setAvailable(true);
            } catch { /* offline: try again later */ }
        };
        const id = window.setInterval(check, UPDATE_CHECK_MS);
        document.addEventListener('visibilitychange', check);
        return () => { stopped = true; window.clearInterval(id); document.removeEventListener('visibilitychange', check); };
    }, []);
    return available;
};
