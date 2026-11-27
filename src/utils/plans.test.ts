import { describe, expect, it } from 'vitest';
import { attention, planView, suggestDue } from './plans';
import type { JattooGoal, JattooRecord } from './jattoo';

const goal = (o: Partial<JattooGoal>): JattooGoal => ({ id: 1, memberId: 'm', category: 'quran', title: 'Al-Mulk', surah: 67, ayahFrom: 1, ayahTo: 30, target: 30, dueDate: null, startDate: '2026-11-01', track: 'hifz', status: 'active', ...o });
const rec = (o: Partial<JattooRecord>): JattooRecord => ({ id: 1, memberId: 'm', houseId: 'h', category: 'quran', title: 'Al-Mulk', surah: 67, ayahFrom: 1, ayahTo: 10, amount: 10, recitedOn: '2026-11-20', note: null, verified: true, ...o });

describe('plans', () => {
    it('hifz counts heard ayahs; noted ones wait for the captain', () => {
        const v = planView(goal({}), [rec({}), rec({ id: 2, ayahFrom: 11, ayahTo: 15, verified: false })], [], '2026-11-27');
        expect(v.done).toBe(10);
        expect(v.pending).toBe(5);
        expect(attention(v)).toBe(40);
    });
    it('reading counts distinct pages inside the plan', () => {
        const g = goal({ track: 'reading', category: 'other', surah: null, pageFrom: 1, pageTo: 20, target: 20 });
        const log = [
            { id: 1, goalId: 1, memberId: 'm', track: 'reading' as const, title: null, amount: 10, pageFrom: 1, pageTo: 10, onDay: '2026-11-20', note: null },
            { id: 2, goalId: 1, memberId: 'm', track: 'reading' as const, title: null, amount: 10, pageFrom: 5, pageTo: 14, onDay: '2026-11-21', note: null }
        ];
        expect(planView(g, [], log, '2026-11-27').done).toBe(14);
    });
    it('past the due date and not done is overdue; paused stays paused', () => {
        expect(planView(goal({ dueDate: '2026-11-20' }), [rec({})], [], '2026-11-27').state).toBe('overdue');
        expect(planView(goal({ dueDate: '2026-11-20', status: 'paused' }), [], [], '2026-11-27').state).toBe('paused');
    });
    it('a quiet running plan is stalled after three weeks', () => {
        expect(planView(goal({ startDate: '2026-10-01' }), [], [], '2026-11-27').state).toBe('stalled');
    });
    it('suggests a new due date at the pace so far', () => {
        const v = planView(goal({ startDate: '2026-11-17' }), [rec({ recitedOn: '2026-11-20' })], [], '2026-11-27');
        expect(suggestDue(v, '2026-11-27')).toBe('2026-12-17');
    });
});
