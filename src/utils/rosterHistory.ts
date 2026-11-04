// "Who changed house or role this season, and do their saved weeks agree?"
// For the admin's roster tab. A move or new role made before per-week history
// existed (or without choosing a week) changes only the person's CURRENT house
// and role; their saved weeks keep whatever they were saved with. This lays the
// season's saved weeks out as runs, so the admin can see it and correct it:
//   - weeks saved under another house or role than today's (fine if that is
//     where they were earned; a mistake if the change should have counted);
//   - weeks saved under today's role but with another role's targets
//     (a captain's week saved with the deputy's easier plan).
import type { Member, MetricValues, Role, WeekData } from '../types';
import { METRICS } from './insights';

export interface HistoryRun {
    /** Season week numbers (what people see) and the first global week (what the data uses). */
    from: number;
    to: number;
    fromGlobal: number;
    toGlobal: number;
    houseId: string;
    houseName: string;
    role: Role;
    /** Saved with targets that are not this role's plan. */
    offPlan: boolean;
}

export interface RosterHistory {
    member: Member;
    runs: HistoryRun[];
    /**
     * 'plan': the latest weeks are saved under today's role but with another
     *         role's targets — a mistake, to correct.
     * 'move': the latest saved weeks are under the previous house/role — right
     *         if the change starts with a later week, a mistake otherwise
     *         (only the admin knows which).
     * 'ok':   the latest weeks match today.
     */
    status: 'plan' | 'move' | 'ok';
    /** Suggested first week to correct: the start of the wrongly planned
     *  weeks, or (for a move) only the newest saved week — never more. */
    suggestedFrom: number;
}

const samePlan = (a: MetricValues, b: MetricValues | undefined) =>
    !!b && METRICS.every(m => Math.abs((a[m] || 0) - (b[m] || 0)) < 1e-9);

export const rosterHistory = (weeks: WeekData[], members: Member[], roleTargets: Record<Role, MetricValues> | null, includeAll = false): RosterHistory[] => {
    const out: RosterHistory[] = [];
    for (const member of members.filter(m => m.active)) {
        const runs: HistoryRun[] = [];
        for (const week of weeks) {
            const team = week.teams.find(it => it.members.some(p => p.id === member.id));
            const saved = team?.members.find(p => p.id === member.id);
            if (!team || !saved || !team.submitted) continue;
            const offPlan = !!roleTargets && !samePlan(saved.target, roleTargets[saved.role]);
            const last = runs[runs.length - 1];
            if (last && last.houseId === team.id && last.role === saved.role && last.offPlan === offPlan) { last.to = week.seasonWeek; last.toGlobal = week.globalWeek; }
            else runs.push({ from: week.seasonWeek, to: week.seasonWeek, fromGlobal: week.globalWeek, toGlobal: week.globalWeek, houseId: team.id, houseName: team.name, role: saved.role, offPlan });
        }
        if (runs.length === 0) continue;
        const matches = (r: HistoryRun): boolean => r.houseId === member.houseId && r.role === member.role && !r.offPlan;
        // Only people who actually changed house or role this season.
        if (!includeAll && !runs.some(r => r.houseId !== member.houseId || r.role !== member.role)) continue;
        // Only the latest run is suggested: earlier runs under another house or
        // role are usually real history (the admin can pick an earlier week).
        const latest = runs[runs.length - 1];
        const status = matches(latest) ? 'ok' : latest.houseId === member.houseId && latest.role === member.role ? 'plan' : 'move';
        out.push({ member, runs, status, suggestedFrom: status === 'move' ? latest.toGlobal : latest.fromGlobal });
    }
    const order = { plan: 0, move: 1, ok: 2 };
    return out.sort((a, b) => order[a.status] - order[b.status] || a.member.name.localeCompare(b.member.name));
};
