import { useEffect, useState } from 'react';

// The everyday part of the app: #/today, #/quran, #/quran/<surah>[:<ayah>],
// #/tasbihat, #/tasbihat/<prayer>, #/zikr, #/zikr/<id>. Open with or without
// an account; the results (#/overview …) stay behind the login.
export type AppPage = 'today' | 'quran' | 'tasbihat' | 'zikr' | 'house' | 'news' | 'kiruu' | 'qibla' | 'chat' | 'namaz' | 'jamaat' | 'help' | 'account' | 'calendar';
export interface AppRoute { page: AppPage; arg: string | null; sub?: string | null }

const PAGES: AppPage[] = ['today', 'quran', 'tasbihat', 'zikr', 'house', 'news', 'kiruu', 'qibla', 'chat', 'namaz', 'jamaat', 'help', 'account', 'calendar'];
const ALIASES: Record<string, AppPage> = { home: 'today', prayer: 'namaz' };

export const parseApp = (hash: string): AppRoute | null => {
    const [page, arg, sub] = hash.replace(/^#\/?/, '').split('?')[0].split('/');
    if ((PAGES as string[]).includes(page)) return { page: page as AppPage, arg: arg || null, sub: sub || null };
    if (page in ALIASES) return { page: ALIASES[page], arg: null };
    return null;
};

export const useAppRoute = (): AppRoute | null => {
    const [route, setRoute] = useState(() => parseApp(window.location.hash));
    useEffect(() => {
        const on = () => setRoute(parseApp(window.location.hash));
        window.addEventListener('hashchange', on);
        window.addEventListener('popstate', on);
        return () => { window.removeEventListener('hashchange', on); window.removeEventListener('popstate', on); };
    }, []);
    return route;
};

export const go = (hash: string) => { if (window.location.hash !== hash) window.location.hash = hash; window.scrollTo(0, 0); };
