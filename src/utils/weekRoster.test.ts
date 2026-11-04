import { describe, expect, it } from 'vitest';
import { rosterForWeek } from './weekRoster';
import type { SavedWeekRow } from './weekRoster';
import type { Member, Role } from '../types';

const D = 'damjanich', P = 'pannonia';
const m = (id: string, houseId: string, role: Role = 'member', active = true, displayOrder = 5): Member =>
    ({ id, name: id, houseId, role, active, displayOrder, photoUrl: null });
const row = (memberId: string, weekNumber: number, houseId: string | null, role: Role | null = 'member'): SavedWeekRow => ({ memberId, weekNumber, houseId, role });

// Weeks 1–2: Abdulazim (captain) and Muhammed in Damjanich, Daniar in Pannonia.
// From week 3: Abdulazim left, Adilet captain, Daniar ↔ Muhammed swapped, Chyngyz joined in week 3.
const members = [
    m('abdulazim', D, 'imam', false, 1), m('adilet', D, 'imam', true, 2), m('daniar', D), m('muhammed', P), m('baiel', D), m('chyngyz', D)
];
const rows = [
    ...[1, 2].flatMap(w => [row('abdulazim', w, D, 'imam'), row('adilet', w, D, 'zam'), row('muhammed', w, D), row('baiel', w, D), row('daniar', w, P)]),
    row('adilet', 3, D, 'imam'), row('daniar', 3, D), row('muhammed', 3, P)
];
const ids = (week: number, newest: boolean) => rosterForWeek(D, week, newest, members, rows).map(e => e.member.id);

describe('who is on a house form for a week', () => {
    it('a past, saved week shows exactly who was saved there, even people who left or moved out', () => {
        expect(ids(2, false).sort()).toEqual(['abdulazim', 'adilet', 'baiel', 'muhammed']);
    });

    it('someone who moved in does not appear in weeks before the move', () => {
        expect(ids(1, false)).not.toContain('daniar');
    });

    it('someone who joined later is not added as a false zero to a saved past week', () => {
        expect(ids(2, false)).not.toContain('chyngyz');
    });

    it('the newest week has today\'s people, minus anyone already saved in another house', () => {
        expect(ids(3, true).sort()).toEqual(['adilet', 'baiel', 'chyngyz', 'daniar']);
    });

    it('a week the house has not saved yet starts from today\'s roster', () => {
        expect(ids(4, true).sort()).toEqual(['adilet', 'baiel', 'chyngyz', 'daniar']);
    });

    it('uses the role the week was saved under, and marks people who are elsewhere now', () => {
        const w2 = rosterForWeek(D, 2, false, members, rows);
        expect(w2.find(e => e.member.id === 'adilet')!.role).toBe('zam');
        expect(w2.find(e => e.member.id === 'muhammed')!.nowElsewhere).toEqual({ houseId: P, active: true });
        expect(w2.find(e => e.member.id === 'abdulazim')!.nowElsewhere).toEqual({ houseId: D, active: false });
        expect(w2[w2.length - 1].nowElsewhere).not.toBeNull();   // people elsewhere now are listed last
    });

    it('without per-week houses (old database) it falls back to today\'s roster', () => {
        const old = rows.map(r => ({ ...r, houseId: null, role: null }));
        expect(rosterForWeek(D, 2, false, members, old).map(e => e.member.id).sort()).toEqual(['adilet', 'baiel', 'chyngyz', 'daniar']);
    });
});
