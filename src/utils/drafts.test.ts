import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DRAFT_TTL, clearDraft, pruneDrafts, readDraft, writeDraft } from './drafts';
import type { MiniCard } from '../types';

class MemoryStorage {
    private m = new Map<string, string>();
    get length() { return this.m.size; }
    key(i: number) { return [...this.m.keys()][i] ?? null; }
    getItem(k: string) { return this.m.get(k) ?? null; }
    setItem(k: string, v: string) { this.m.set(k, v); }
    removeItem(k: string) { this.m.delete(k); }
}

const card = {} as MiniCard;
const draft = { drafts: {}, miniCard: card };

describe('data entry drafts', () => {
    beforeEach(() => { (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage(); });
    afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; });

    it('keeps a draft per house and week until it is cleared', () => {
        writeDraft('h1', 5, draft, 1000);
        expect(readDraft('h1', 5, 2000)).not.toBeNull();
        expect(readDraft('h1', 4, 2000)).toBeNull();
        expect(readDraft('h2', 5, 2000)).toBeNull();
        clearDraft('h1', 5);
        expect(readDraft('h1', 5, 2000)).toBeNull();
    });

    it('a draft older than a week is ignored, and pruning removes it (only drafts)', () => {
        writeDraft('h1', 5, draft, 0);
        writeDraft('h1', 6, draft, DRAFT_TTL);
        localStorage.setItem('tdjamaat-draft:h1:7', '{broken');
        localStorage.setItem('tdjamaat-theme', 'dark');
        expect(readDraft('h1', 5, DRAFT_TTL + 1)).toBeNull();
        expect(pruneDrafts(DRAFT_TTL + 1)).toBe(2);
        expect(readDraft('h1', 6, DRAFT_TTL + 1)).not.toBeNull();
        expect(localStorage.getItem('tdjamaat-theme')).toBe('dark');
    });

    it('never throws when storage is blocked', () => {
        delete (globalThis as { localStorage?: unknown }).localStorage;
        expect(() => writeDraft('h1', 1, draft)).not.toThrow();
        expect(readDraft('h1', 1)).toBeNull();
        expect(pruneDrafts()).toBe(0);
    });
});
