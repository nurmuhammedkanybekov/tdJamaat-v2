import { useEffect, useState } from 'react';

// The open part of the site (no login): #/zikr, #/zikr/<id>, #/quran,
// #/quran/<surah>, #/namaz — and #/login for the captains' entrance.
export type PublicPage = 'zikr' | 'quran' | 'namaz' | 'login';
export interface PublicRoute { page: PublicPage; arg: string | null }

const PAGES: PublicPage[] = ['zikr', 'quran', 'namaz', 'login'];

export const parsePublic = (hash: string): PublicRoute | null => {
    const [page, arg] = hash.replace(/^#\/?/, '').split('?')[0].split('/');
    return (PAGES as string[]).includes(page) ? { page: page as PublicPage, arg: arg || null } : null;
};

export const usePublicRoute = (): PublicRoute | null => {
    const [route, setRoute] = useState(() => parsePublic(window.location.hash));
    useEffect(() => {
        const on = () => setRoute(parsePublic(window.location.hash));
        window.addEventListener('hashchange', on);
        window.addEventListener('popstate', on);
        return () => { window.removeEventListener('hashchange', on); window.removeEventListener('popstate', on); };
    }, []);
    return route;
};

export const go = (hash: string) => { window.location.hash = hash; window.scrollTo(0, 0); };
