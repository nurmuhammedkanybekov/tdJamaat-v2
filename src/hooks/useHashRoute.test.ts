import { describe, expect, it } from 'vitest';
import { hashFor, parseHash } from './useHashRoute';

describe('the view in the address', () => {
    it('reads the view and an open profile', () => {
        expect(parseHash('#/teams?m=abc')).toEqual({ view: 'teams', memberId: 'abc' });
        expect(parseHash('#/season')).toEqual({ view: 'season', memberId: null });
        expect(parseHash('#/progress')).toEqual({ view: 'season', memberId: null });   // old link
    });

    it('anything unknown (or nothing) is the overview', () => {
        expect(parseHash('')).toEqual({ view: 'overview', memberId: null });
        expect(parseHash('#/nope')).toEqual({ view: 'overview', memberId: null });
    });

    it('round-trips', () => {
        expect(parseHash(hashFor('awards', 'x1'))).toEqual({ view: 'awards', memberId: 'x1' });
        expect(hashFor('season')).toBe('#/season');
    });
});
