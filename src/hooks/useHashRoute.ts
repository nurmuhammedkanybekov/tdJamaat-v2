import { useCallback, useEffect, useRef, useState } from 'react';
import { LEGACY_VIEWS, TABS } from '../components/navigation';
import type { ActiveView } from '../components/navigation';

// The view and the open profile live in the URL hash (#/teams?m=<member id>),
// so the phone's back button closes a profile and a link opens the same page.
export interface Route { view: ActiveView; memberId: string | null }

const VIEW_KEYS = TABS.map(it => it.key) as string[];

export const parseHash = (hash: string): Route => {
    const raw = hash.replace(/^#\/?/, '');
    const [path, query] = raw.split('?');
    const view = VIEW_KEYS.includes(path) ? (path as ActiveView) : LEGACY_VIEWS[path] ?? 'overview';
    return { view, memberId: new URLSearchParams(query ?? '').get('m') };
};

export const hashFor = (view: ActiveView, memberId?: string | null) => `#/${view}${memberId ? `?m=${memberId}` : ''}`;

export const useHashRoute = () => {
    const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
    // Opening a profile pushes a history entry; closing it goes back, so the
    // back button and the close button do the same thing.
    const pushedProfile = useRef(false);
    // The view, read by the callbacks below (history calls must not run
    // inside a state updater: React may call those twice).
    const viewRef = useRef(route.view);
    useEffect(() => { viewRef.current = route.view; }, [route.view]);

    useEffect(() => {
        const onChange = () => {
            const next = parseHash(window.location.hash);
            if (!next.memberId) pushedProfile.current = false;
            setRoute(next);
        };
        window.addEventListener('hashchange', onChange);
        window.addEventListener('popstate', onChange);
        return () => {
            window.removeEventListener('hashchange', onChange);
            window.removeEventListener('popstate', onChange);
        };
    }, []);

    const setView = useCallback((view: ActiveView) => {
        history.replaceState(null, '', hashFor(view));
        pushedProfile.current = false;
        viewRef.current = view;
        setRoute({ view, memberId: null });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const openProfile = useCallback((memberId: string) => {
        const view = viewRef.current;
        history.pushState(null, '', hashFor(view, memberId));
        pushedProfile.current = true;
        setRoute({ view, memberId });
    }, []);

    const closeProfile = useCallback(() => {
        if (pushedProfile.current) { history.back(); return; }
        const view = viewRef.current;
        history.replaceState(null, '', hashFor(view));
        setRoute({ view, memberId: null });
    }, []);

    return { route, setView, openProfile, closeProfile };
};
