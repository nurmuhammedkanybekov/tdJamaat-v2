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
import { useMemberData } from './memberData';

const TodayPage = lazy(withReload(() => import('./TodayPage').then(m => ({ default: m.TodayPage }))));
const QuranPage = lazy(withReload(() => import('./QuranPage').then(m => ({ default: m.QuranPage }))));
const TasbihatPage = lazy(withReload(() => import('./TasbihatPage').then(m => ({ default: m.TasbihatPage }))));
const HousePage = lazy(withReload(() => import('./HousePage').then(m => ({ default: m.HousePage }))));
const NewsPage = lazy(withReload(() => import('./Community').then(m => ({ default: m.NewsPage }))));
const ChatsPage = lazy(withReload(() => import('./ChatsPage').then(m => ({ default: m.ChatsPage }))));
const JamaatPage = lazy(withReload(() => import('./JamaatPage').then(m => ({ default: m.JamaatPage }))));
const HelpPage = lazy(withReload(() => import('./HelpPage').then(m => ({ default: m.HelpPage }))));
const NamazPage = lazy(withReload(() => import('./NamazPage').then(m => ({ default: m.NamazPage }))));
const QiblaPage = lazy(withReload(() => import('./QiblaPage').then(m => ({ default: m.QiblaPage }))));
const SignInCheck = lazy(withReload(() => import('./SignInCheck').then(m => ({ default: m.SignInCheck }))));
const AccountPage = lazy(withReload(() => import('./AccountPage').then(m => ({ default: m.AccountPage }))));
const CalendarPage = lazy(withReload(() => import('./CalendarPage').then(m => ({ default: m.CalendarPage }))));
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

/** A captain is the captain of their house: their person is chosen for them
 *  (the house's captain on the roster), so the app never asks "who are you?".
 *  A person chosen by hand in the same house is kept. */
const CaptainIsSelf: React.FC<{ houseId: string }> = ({ houseId }) => {
    const { data } = useMemberData();
    useEffect(() => {
        if (!data) return;
        const current = readStaff();
        if (current && current.houseId === houseId) return;
        const team = data.weeks[data.weeks.length - 1]?.teams.find(tm => tm.id === houseId);
        const captain = team?.members.find(m => m.role === 'imam');
        if (team && captain) saveStaffSelf({ memberId: captain.id, name: captain.name, houseId: team.id, houseName: team.name });
    }, [data, houseId]);
    return null;
};

const TITLES: Record<AppRoute['page'], () => string> = {
    today: () => t('Менин күнүм'), house: () => t('Үйүм'), news: () => t('Жамааттан кабар'), quran: () => t('Куран'), tasbihat: () => t('Тасбихат'), zikr: () => t('Зикир'), kiruu: () => t('Кирүүнү текшерүү'), qibla: () => t('Кыбла'), chat: () => t('Чаттар'), namaz: () => t('Намаз убактылары'), jamaat: () => t('Жамаат'), help: () => t('Жардам'), account: () => t('Менин аккаунтум'), calendar: () => t('Календарь')
};

export const AppPages: React.FC<{ route: AppRoute; theme: Theme; onToggleTheme: () => void; ctx: AppCtx }> = ({ route, theme, onToggleTheme, ctx }) => {
    const member = useMember();
    useEffect(() => { document.title = `${TITLES[route.page]()} · tdJamaat`; }, [route.page]);
    const props = { theme, onToggleTheme };
    return (
        <AppContext.Provider value={{ ...ctx, member }}>
            <StaffSync />
            {ctx.signedIn && ctx.role === 'admin' && <AdminIsAdmin />}
            {ctx.signedIn && ctx.role === 'leader' && ctx.houseId && <CaptainIsSelf houseId={ctx.houseId} />}
            <Suspense fallback={<Waiting />}>
                {route.page === 'quran' ? <QuranPage arg={route.arg} sub={route.sub} {...props} />
                    : route.page === 'tasbihat' ? <TasbihatPage arg={route.arg} {...props} />
                        : route.page === 'zikr' ? <ZikrPage arg={route.arg} {...props} />
                            : route.page === 'house' ? <HousePage arg={route.arg} sub={route.sub} {...props} />
                                : route.page === 'news' ? <NewsPage {...props} />
                                : route.page === 'kiruu' ? <SignInCheck {...props} />
                                : route.page === 'qibla' ? <QiblaPage {...props} />
                                : route.page === 'chat' ? <ChatsPage arg={route.arg} sub={route.sub} {...props} />
                                : route.page === 'namaz' ? <NamazPage {...props} />
                                : route.page === 'help' ? <HelpPage {...props} />
                                : route.page === 'jamaat' ? <JamaatPage {...props} />
                                : route.page === 'account' ? <AccountPage {...props} />
                                : route.page === 'calendar' ? <CalendarPage {...props} />
                            : <TodayPage {...props} />}
            </Suspense>
        </AppContext.Provider>
    );
};
