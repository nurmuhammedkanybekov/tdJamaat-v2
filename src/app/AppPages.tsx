// The everyday pages, each arriving on demand.
import React, { Suspense, lazy, useEffect } from 'react';
import type { Theme } from '../theme';
import { withReload } from '../lazyLoad';
import { t } from '../i18n';
import type { AppRoute } from './route';
import type { AppCtx } from './context';
import { AppContext } from './context';
import { useMember, usePracticeSync } from './useMember';
import { readStaff, saveStaffSelf, useSelf } from './self';

const TodayPage = lazy(withReload(() => import('./TodayPage').then(m => ({ default: m.TodayPage }))));
const QuranPage = lazy(withReload(() => import('./QuranPage').then(m => ({ default: m.QuranPage }))));
const TasbihatPage = lazy(withReload(() => import('./TasbihatPage').then(m => ({ default: m.TasbihatPage }))));
const HousePage = lazy(withReload(() => import('./HousePage').then(m => ({ default: m.HousePage }))));
const NewsPage = lazy(withReload(() => import('./Community').then(m => ({ default: m.NewsPage }))));
const QiblaPage = lazy(withReload(() => import('./QiblaPage').then(m => ({ default: m.QiblaPage }))));
const SignInCheck = lazy(withReload(() => import('./SignInCheck').then(m => ({ default: m.SignInCheck }))));
const ZikrPage = lazy(withReload(() => import('./ZikrPage').then(m => ({ default: m.ZikrPage }))));

const Waiting: React.FC = () => (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ backgroundColor: 'var(--page-plane)' }} aria-busy="true" aria-label={t('Жүктөлүүдө')}>
        <div className="skeleton h-1 w-24" />
    </div>
);

/** A captain who chose "Мен": their counts reach the form too. */
const StaffSync: React.FC = () => {
    const { self } = useSelf();
    usePracticeSync(self?.via === 'staff' ? self.memberId : null);
    return null;
};

/** The admin's account is the admin, not a person of a house: forget a
 *  person chosen earlier (when the admin used to be Нур by default). */
const AdminIsAdmin: React.FC = () => {
    useEffect(() => { if (readStaff()) saveStaffSelf(null); }, []);
    return null;
};

const TITLES: Record<AppRoute['page'], () => string> = {
    today: () => t('Менин күнүм'), house: () => t('Үйүм'), news: () => t('Жамааттан кабар'), quran: () => t('Куран'), tasbihat: () => t('Тасбихат'), zikr: () => t('Зикир'), kiruu: () => t('Кирүүнү текшерүү'), qibla: () => t('Кыбла')
};

export const AppPages: React.FC<{ route: AppRoute; theme: Theme; onToggleTheme: () => void; ctx: AppCtx }> = ({ route, theme, onToggleTheme, ctx }) => {
    const member = useMember();
    useEffect(() => { document.title = `${TITLES[route.page]()} · tdJamaat`; }, [route.page]);
    const props = { theme, onToggleTheme };
    return (
        <AppContext.Provider value={{ ...ctx, member }}>
            <StaffSync />
            {ctx.signedIn && ctx.role === 'admin' && <AdminIsAdmin />}
            <Suspense fallback={<Waiting />}>
                {route.page === 'quran' ? <QuranPage arg={route.arg} sub={route.sub} {...props} />
                    : route.page === 'tasbihat' ? <TasbihatPage arg={route.arg} {...props} />
                        : route.page === 'zikr' ? <ZikrPage arg={route.arg} {...props} />
                            : route.page === 'house' ? <HousePage arg={route.arg} sub={route.sub} {...props} />
                                : route.page === 'news' ? <NewsPage {...props} />
                                : route.page === 'kiruu' ? <SignInCheck {...props} />
                                : route.page === 'qibla' ? <QiblaPage {...props} />
                            : <TodayPage {...props} />}
            </Suspense>
        </AppContext.Provider>
    );
};
