import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CACHE_MAX_AGE, clearResults, readResults, writeResults } from './resultsCache';
import type { DataFile } from '../types';

const data = { weeks: [], seasons: [] } as unknown as DataFile;

describe('the last results kept on the device', () => {
    beforeEach(() => {
        const m = new Map<string, string>();
        vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v), removeItem: (k: string) => m.delete(k) });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('comes back for the same login only', () => {
        writeResults('leader:A', data, [], 1000);
        expect(readResults('leader:A', 2000)?.at).toBe(1000);
        expect(readResults('leader:B', 2000)).toBeNull();
        expect(readResults('admin', 2000)).toBeNull();
    });

    it('a very old copy is not shown', () => {
        writeResults('admin', data, [], 0);
        expect(readResults('admin', CACHE_MAX_AGE + 1)).toBeNull();
    });

    it('logout removes it', () => {
        writeResults('admin', data, [], 0);
        clearResults();
        expect(readResults('admin', 1)).toBeNull();
    });

    it('never throws when storage is blocked', () => {
        vi.stubGlobal('localStorage', undefined);
        expect(() => writeResults('admin', data, [])).not.toThrow();
        expect(readResults('admin')).toBeNull();
    });
});
