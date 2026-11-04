import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataFile, House } from '../types';
import { fetchDataFile, fetchHouses } from '../services/dataService';
import { t } from '../i18n';
import { clearResults, readResults, writeResults } from '../utils/resultsCache';

const REFRESH_EVERY = 120_000;
const MIN_GAP = 30_000;

/**
 * The results, loaded once someone is logged in and forgotten on logout.
 * Live: refreshed every 2 minutes while the page is visible and right away
 * when someone comes back to it — a laptop left open in a meeting shows new
 * results as captains submit them. `paused()` holds the refresh back (while a
 * captain is typing results, fresh numbers would only get in the way).
 *
 * A background refresh that fails keeps the numbers on screen and marks them
 * `stale`, with the time they were last loaded — so nobody mistakes old
 * numbers for new ones when the connection drops.
 *
 * `who` identifies the login (null: logged out). The last results this
 * device loaded for that login are shown at once while fresh ones load, so
 * the app opens instantly; logging out removes them. Nothing happens until
 * `checked` (the stored session has been read).
 */
export const useResults = (who: string | null, checked: boolean, paused: () => boolean) => {
    const enabled = !!who;
    const [data, setData] = useState<DataFile | null>(null);
    const [houses, setHouses] = useState<House[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [stale, setStale] = useState(false);
    const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    const whoRef = useRef(who);
    useEffect(() => { whoRef.current = who; }, [who]);
    const pausedRef = useRef(paused);
    useEffect(() => { pausedRef.current = paused; }, [paused]);

    // `silent`: refresh in the background without swapping the page for the
    // loading screen (which would also unmount an open form).
    const reload = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [df, houseList] = await Promise.all([fetchDataFile(), fetchHouses()]);
            setData(df);
            setHouses(houseList);
            if (whoRef.current) writeResults(whoRef.current, df, houseList);
            setError(null);
            setStale(false);
            setUpdatedAt(new Date());
        } catch (err) {
            if (silent) setStale(true);
            else setError(t('Маалыматты жүктөөдө ката кетти. Интернет байланышын текшерип, бир аздан кийин кайра аракет кылыңыз.'));
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!checked) return;
        if (who) {
            // Open on the last results at once; the fresh load replaces them.
            const cached = readResults(who);
            if (cached) {
                setData(cached.data);
                setHouses(cached.houses);
                setUpdatedAt(new Date(cached.at));
                setLoading(false);
                reload(true);
            } else {
                reload();
            }
            return;
        }
        clearResults();
        setData(null);
        setHouses([]);
        setUpdatedAt(null);
        setStale(false);
    }, [who, checked, reload]);

    useEffect(() => {
        let last = Date.now();
        const refresh = (force = false) => {
            if (!enabled || document.visibilityState !== 'visible' || pausedRef.current()) return;
            if (!force && Date.now() - last < MIN_GAP) return;
            last = Date.now();
            reload(true);
        };
        const onTick = () => refresh();
        const onOnline = () => { setOnline(true); refresh(true); };
        const onOffline = () => setOnline(false);
        const id = window.setInterval(onTick, REFRESH_EVERY);
        document.addEventListener('visibilitychange', onTick);
        window.addEventListener('focus', onTick);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onTick);
            window.removeEventListener('focus', onTick);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, [enabled, reload]);

    return { data, houses, loading, error, reload, updatedAt, stale: stale || !online, offline: !online };
};
