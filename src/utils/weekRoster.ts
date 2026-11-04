// Who belongs on a house's data-entry form for a given week.
//
// People move between houses and leave during a season, so "today's roster"
// is only right for the newest week. For any week:
//   - everyone already saved under this house that week (including people
//     who have since moved out or left — it is their week in this house);
//   - today's people of the house, if the house hasn't saved that week yet,
//     or it is the newest week (someone added this week must still appear) —
//     except anyone whose week is already saved under another house.
// A person who joins later therefore never turns up as a false zero in an
// earlier, already saved week. Without the per-week house (before
// supabase/seasons-2026-10.sql) it falls back to today's roster.
import type { Member, Role } from '../types';

export interface SavedWeekRow {
    memberId: string;
    weekNumber: number;
    houseId: string | null;
    role: Role | null;
}

export interface RosterEntry {
    member: Member;
    /** Role the week counts under (the saved one, else today's). */
    role: Role;
    /** The person has since moved to another house (or left): their house today, or null. */
    nowElsewhere: { houseId: string; active: boolean } | null;
}

export const rosterForWeek = (
    houseId: string,
    week: number,
    isNewestWeek: boolean,
    members: Member[],
    rows: SavedWeekRow[]
): RosterEntry[] => {
    const byId = new Map(members.map(m => [m.id, m]));
    const current = members.filter(m => m.houseId === houseId && m.active);
    const entry = (member: Member, role: Role | null): RosterEntry => ({
        member,
        role: role ?? member.role,
        nowElsewhere: member.houseId !== houseId || !member.active ? { houseId: member.houseId, active: member.active } : null
    });

    if (!rows.some(r => r.houseId !== null)) return current.map(m => entry(m, null));

    const thisWeek = rows.filter(r => r.weekNumber === week);
    const savedHere = thisWeek.filter(r => r.houseId === houseId && byId.has(r.memberId));
    const out = savedHere.map(r => entry(byId.get(r.memberId)!, r.role));
    if (savedHere.length === 0 || isNewestWeek) {
        const taken = new Set(out.map(e => e.member.id));
        const elsewhere = new Set(thisWeek.filter(r => r.houseId !== null && r.houseId !== houseId).map(r => r.memberId));
        current.filter(m => !taken.has(m.id) && !elsewhere.has(m.id)).forEach(m => out.push(entry(m, null)));
    }
    return out.sort((a, b) =>
        Number(!!a.nowElsewhere) - Number(!!b.nowElsewhere) || a.member.displayOrder - b.member.displayOrder || a.member.name.localeCompare(b.member.name));
};
