// Everything that is open without logging in. The Quran and the zikr counter
// arrive on demand; the front door and the prayer times are always at hand.
import React, { Suspense, lazy, useEffect, useState } from 'react';
import type { Theme } from '../theme';
import { withReload } from '../lazyLoad';
import { t } from '../i18n';
import { Portal } from './Portal';
import { go } from './route';
import type { PublicRoute } from './route';

const PrayerSheet = lazy(withReload(() => import('../components/PrayerSheet').then(m => ({ default: m.PrayerSheet }))));
const QuranPage = lazy(withReload(() => import('./QuranPage').then(m => ({ default: m.QuranPage }))));
const ZikrPage = lazy(withReload(() => import('./ZikrPage').then(m => ({ default: m.ZikrPage }))));

const Waiting: React.FC = () => (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ backgroundColor: 'var(--page-plane)' }} aria-busy="true" aria-label={t('Жүктөлүүдө')}>
        <div className="skeleton h-1 w-24" />
    </div>
);

export const PublicPages: React.FC<{ route: PublicRoute | null; theme: Theme; onToggleTheme: () => void; signedIn: boolean }> = ({ route, theme, onToggleTheme, signedIn }) => {
    // Re-read the chosen city after it changes in the prayer sheet.
    const [, setCityTick] = useState(0);
    const page = route?.page;
    useEffect(() => {
        document.title = page === 'quran' ? `${t('Куран')} · tdJamaat` : page === 'zikr' ? `${t('Зикир')} · tdJamaat` : page === 'namaz' ? `${t('Намаз убактылары')} · tdJamaat` : 'tdJamaat';
    }, [page]);
    if (page === 'quran') return <Suspense fallback={<Waiting />}><QuranPage arg={route!.arg} theme={theme} onToggleTheme={onToggleTheme} /></Suspense>;
    if (page === 'zikr') return <Suspense fallback={<Waiting />}><ZikrPage arg={route!.arg} theme={theme} onToggleTheme={onToggleTheme} /></Suspense>;
    return (
        <>
            <Portal theme={theme} onToggleTheme={onToggleTheme} signedIn={signedIn} />
            {page === 'namaz' && <Suspense fallback={null}><PrayerSheet onClose={() => go(signedIn ? '#/overview' : '')} onCityChange={() => setCityTick(n => n + 1)} /></Suspense>}
        </>
    );
};
