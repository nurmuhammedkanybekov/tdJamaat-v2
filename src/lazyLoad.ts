// On-demand code (React.lazy) that survives a deploy. After a new version is
// published, a page that was already open still asks for the old file names,
// which no longer exist: instead of a blank screen, reload once onto the new
// version. (The flag stops a reload loop if the network itself is down.)
const FLAG = 'tdjamaat-chunk-reload';

export const withReload = <T,>(load: () => Promise<T>) => (): Promise<T> =>
    load().then(
        mod => { try { sessionStorage.removeItem(FLAG); } catch { /* not critical */ } return mod; },
        err => {
            let reloaded = false;
            try { reloaded = sessionStorage.getItem(FLAG) === '1'; sessionStorage.setItem(FLAG, '1'); } catch { /* not critical */ }
            if (!reloaded) { window.location.reload(); return new Promise<T>(() => { /* the page is reloading */ }); }
            throw err;
        }
    );

/** Fetch on-demand code in the background; a failure here is silent (it is retried on use). */
export const prefetch = (...loads: Array<() => Promise<unknown>>) => { loads.forEach(load => { load().catch(() => undefined); }); };
