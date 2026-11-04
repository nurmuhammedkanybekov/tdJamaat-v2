import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withReload } from './lazyLoad';

describe('on-demand code after a deploy', () => {
    let store: Map<string, string>;
    const reload = vi.fn();
    beforeEach(() => {
        store = new Map();
        vi.stubGlobal('sessionStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
        vi.stubGlobal('window', { location: { reload } });
        reload.mockClear();
    });
    afterEach(() => vi.unstubAllGlobals());

    it('a missing file reloads the page once', async () => {
        const load = withReload(() => Promise.reject(new Error('Failed to fetch dynamically imported module')));
        void load();
        await Promise.resolve(); await Promise.resolve();
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('if it still fails after the reload, the error comes through (no reload loop)', async () => {
        store.set('tdjamaat-chunk-reload', '1');
        await expect(withReload(() => Promise.reject(new Error('offline')))()).rejects.toThrow('offline');
        expect(reload).not.toHaveBeenCalled();
    });

    it('a successful load clears the flag', async () => {
        store.set('tdjamaat-chunk-reload', '1');
        await expect(withReload(() => Promise.resolve(42))()).resolves.toBe(42);
        expect(store.has('tdjamaat-chunk-reload')).toBe(false);
    });
});
