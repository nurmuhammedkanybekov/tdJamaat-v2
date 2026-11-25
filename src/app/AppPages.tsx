// The everyday pages, each arriving on demand.
import React, { Suspense, lazy, useEffect } from 'react';
import type { Theme } from '../theme';
import { withReload } from '../lazyLoad';
import { t } from '../i18n';
import type { AppRoute } from './route';
import type { AppCtx } from './context';
import { AppContext } from './context';
import { useMember } from './useMember';

const TodayPage = lazy(withReload(() => import('./TodayPage').then(m => ({ default: m.TodayPage }))));
const QuranPage = lazy(withReload(() => import('./QuranPage').then(m => ({ default: m.QuranPage }))));
const TasbihatPage = lazy(withReload(() => import('./TasbihatPage').then(m => ({ default: m.TasbihatPage }))));
const HousePage = lazy(withReload(() => import('./HousePage').then(m => ({ default: m.HousePage }))));
const ZikrPage = lazy(withReload(() => import('./ZikrPage').then(m => ({ default: m.ZikrPage }))));

const Waiting: React.FC = () => (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ backgroundColor: 'var(--page-plane)' }} aria-busy="true" aria-label={t('Жүктөлүүдө')}>
        <div className="skeleton h-1 w-24" />
    </div>
);

const TITLES: Record<AppRoute['page'], () => string> = {
    today: () => t('Менин күнүм'), house: () => t('Үйүм'), quran: () => t('Куран'), tasbihat: () => t('Тасбихат'), zikr: () => t('Зикир')
};

export const AppPages: React.FC<{ route: AppRoute; theme: Theme; onToggleTheme: () => void; ctx: AppCtx }> = ({ route, theme, onToggleTheme, ctx }) => {
    const member = useMember();
    useEffect(() => { document.title = `${TITLES[route.page]()} · tdJamaat`; }, [route.page]);
    const props = { theme, onToggleTheme };
    return (
        <AppContext.Provider value={{ ...ctx, member }}>
            <Suspense fallback={<Waiting />}>
                {route.page === 'quran' ? <QuranPage arg={route.arg} sub={route.sub} {...props} />
                    : route.page === 'tasbihat' ? <TasbihatPage arg={route.arg} {...props} />
                        : route.page === 'zikr' ? <ZikrPage arg={route.arg} {...props} />
                            : route.page === 'house' ? <HousePage {...props} />
                            : <TodayPage {...props} />}
            </Suspense>
        </AppContext.Provider>
    );
};
