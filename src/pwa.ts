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
