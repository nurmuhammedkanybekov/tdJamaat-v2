import { describe, expect, it } from 'vitest';
import { rosterHistory } from './rosterHistory';
import { TARGETS, house, person, week } from '../test/factory';
import type { Member, Role } from '../types';

const m = (id: string, houseId: string, role: Role = 'member'): Member => ({ id, name: id, houseId, role, active: true, displayOrder: 1, photoUrl: null });
// Adilet: deputy in weeks 1–2; made captain in the old app before week 3,
// so week 3 was saved as captain but with the deputy's plan carried forward.
const adiletW3 = { ...person('adilet', 'imam'), target: { ...TARGETS.zam } };
// Daniar: Pannonia weeks 1–2, moved to Damjanich before week 3.
const weeks = [
    week(1, [house('D', [person('adilet', 'zam')]), house('P', [person('daniar')])]),
    week(2, [house('D', [person('adilet', 'zam')]), house('P', [person('daniar')])]),
    week(3, [house('D', [adiletW3, person('daniar')]), house('P', [person('x')])])
];
const members = [m('adilet', 'D', 'imam'), m('daniar', 'D'), m('x', 'P')];

describe('roster history check', () => {
    const list = rosterHistory(weeks, members, TARGETS);
    const of = (id: string) => list.find(h => h.member.id === id)!;

    it('a new captain whose week was saved with the deputy plan is flagged, from that week', () => {
        const a = of('adilet');
        expect(a.runs.map(r => [r.from, r.to, r.role, r.offPlan])).toEqual([[1, 2, 'zam', false], [3, 3, 'imam', true]]);
        expect(a.status).toBe('plan');
        expect(a.suggestedFrom).toBe(3);
    });

    it('a move that is already right shows its history but needs nothing', () => {
        const d = of('daniar');
        expect(d.runs.map(r => [r.from, r.to, r.houseId])).toEqual([[1, 2, 'P'], [3, 3, 'D']]);
        expect(d.status).toBe('ok');
    });

    it('a move with every saved week in the old house suggests only the newest week, never the whole season', () => {
        const late = rosterHistory(weeks.slice(0, 2), [m('daniar', 'D')], TARGETS);
        expect(late[0].status).toBe('move');
        expect(late[0].suggestedFrom).toBe(2);
    });

    it('people who never changed are not listed', () => {
        expect(list.find(h => h.member.id === 'x')).toBeUndefined();
    });
});
