// Everything that is open without logging in. The Quran and the zikr counter
// arrive on demand; the front door and the prayer times are always at hand.
import React, { Suspense, lazy, useEffect, useState } from 'react';
import type { Theme } from '../theme';
import { withReload } from '../lazyLoad';
import { t } from '../i18n';
import { Portal } from './Portal';
import { SignedInContext } from './signedIn';
import { go } from './route';
import type { PublicRoute } from './route';

const PrayerSheet = lazy(withReload(() => import('../components/PrayerSheet').then(m => ({ default: m.PrayerSheet }))));
const QuranPage = lazy(withReload(() => import('./QuranPage').then(m => ({ default: m.QuranPage }))));
const TasbihatPage = lazy(withReload(() => import('./TasbihatPage').then(m => ({ default: m.TasbihatPage }))));
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
        document.title = page === 'quran' ? `${t('Куран')} · tdJamaat` : page === 'zikr' ? `${t('Зикир')} · tdJamaat` : page === 'tasbihat' ? `${t('Тасбихат')} · tdJamaat` : page === 'namaz' ? `${t('Намаз убактылары')} · tdJamaat` : 'tdJamaat';
    }, [page]);
    const content = page === 'quran' ? <QuranPage arg={route!.arg} theme={theme} onToggleTheme={onToggleTheme} />
        : page === 'tasbihat' ? <TasbihatPage arg={route!.arg} theme={theme} onToggleTheme={onToggleTheme} />
            : page === 'zikr' ? <ZikrPage arg={route!.arg} theme={theme} onToggleTheme={onToggleTheme} />
                : (
                    <>
                        <Portal theme={theme} onToggleTheme={onToggleTheme} signedIn={signedIn} />
                        {page === 'namaz' && <PrayerSheet onClose={() => go('#/home')} onCityChange={() => setCityTick(n => n + 1)} />}
                    </>
                );
    return (
        <SignedInContext.Provider value={signedIn}>
            <Suspense fallback={<Waiting />}>{content}</Suspense>
        </SignedInContext.Provider>
    );
};
