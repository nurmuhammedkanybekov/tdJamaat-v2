// The everyday pages, each arriving on demand.
import React, { Suspense, lazy, useEffect } from 'react';
import type { Theme } from '../theme';
import { withReload } from '../lazyLoad';
import { t } from '../i18n';
import type { AppRoute } from './route';
import type { AppCtx } from './context';
import { AppContext } from './context';
import { useMember, usePracticeSync } from './useMember';
import { ADMIN_DEFAULT_NAME, readStaff, saveStaffSelf, useSelf } from './self';
import { useMemberData } from './memberData';

const TodayPage = lazy(withReload(() => import('./TodayPage').then(m => ({ default: m.TodayPage }))));
const QuranPage = lazy(withReload(() => import('./QuranPage').then(m => ({ default: m.QuranPage }))));
const TasbihatPage = lazy(withReload(() => import('./TasbihatPage').then(m => ({ default: m.TasbihatPage }))));
const HousePage = lazy(withReload(() => import('./HousePage').then(m => ({ default: m.HousePage }))));
const NewsPage = lazy(withReload(() => import('./Community').then(m => ({ default: m.NewsPage }))));
const SignInCheck = lazy(withReload(() => import('./SignInCheck').then(m => ({ default: m.SignInCheck }))));
const ZikrPage = lazy(withReload(() => import('./ZikrPage').then(m => ({ default: m.ZikrPage }))));

const Waiting: React.FC = () => (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ backgroundColor: 'var(--page-plane)' }} aria-busy="true" aria-label={t('Жүктөлүүдө')}>
        <div className="skeleton h-1 w-24" />
    </div>
);

/** A captain or the admin who chose "Мен": their counts reach the form too. */
const StaffSync: React.FC = () => {
    const { self } = useSelf();
    usePracticeSync(self?.via === 'staff' ? self.memberId : null);
    return null;
};

/** The admin is Нур by default: set unless the admin picked someone by hand. */
const AdminDefaultSelf: React.FC = () => {
    const { data } = useMemberData();
    useEffect(() => {
        if (!data) return;
        const current = readStaff();
        if (current?.manual) return;
        const latest = data.weeks[data.weeks.length - 1];
        for (const tm of latest?.teams ?? []) {
            const m = tm.members.find(x => x.name.trim() === ADMIN_DEFAULT_NAME);
            if (m) {
                if (current?.memberId !== m.id) saveStaffSelf({ memberId: m.id, name: m.name, houseId: tm.id, houseName: tm.name });
                return;
            }
        }
    }, [data]);
    return null;
};

const TITLES: Record<AppRoute['page'], () => string> = {
    today: () => t('Менин күнүм'), house: () => t('Үйүм'), news: () => t('Жамааттан кабар'), quran: () => t('Куран'), tasbihat: () => t('Тасбихат'), zikr: () => t('Зикир'), kiruu: () => t('Кирүүнү текшерүү')
};

export const AppPages: React.FC<{ route: AppRoute; theme: Theme; onToggleTheme: () => void; ctx: AppCtx }> = ({ route, theme, onToggleTheme, ctx }) => {
    const member = useMember();
    useEffect(() => { document.title = `${TITLES[route.page]()} · tdJamaat`; }, [route.page]);
    const props = { theme, onToggleTheme };
    return (
        <AppContext.Provider value={{ ...ctx, member }}>
            <StaffSync />
            {ctx.signedIn && ctx.role === 'admin' && <AdminDefaultSelf />}
            <Suspense fallback={<Waiting />}>
                {route.page === 'quran' ? <QuranPage arg={route.arg} sub={route.sub} {...props} />
                    : route.page === 'tasbihat' ? <TasbihatPage arg={route.arg} {...props} />
                        : route.page === 'zikr' ? <ZikrPage arg={route.arg} {...props} />
                            : route.page === 'house' ? <HousePage arg={route.arg} sub={route.sub} {...props} />
                                : route.page === 'news' ? <NewsPage {...props} />
                                : route.page === 'kiruu' ? <SignInCheck {...props} />
                            : <TodayPage {...props} />}
            </Suspense>
        </AppContext.Provider>
    );
};
