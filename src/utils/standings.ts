// Overview lists: the selected week or the whole season so far, optionally
// for one city only.
import type { HouseSeries, HouseWeek, Insights, MemberSeries, MemberWeek } from './insights';
import { weekOf } from './insights';
import { houseDisplayName } from './houseName';
import { t } from '../i18n';

// Houses by city (Nur, Oct 2026): Pannonia, Damjanich and Mester are in
// Budapest; every other house is in Debrecen. A new Budapest house needs
// adding here.
export type City = 'budapest' | 'debrecen';
const BUDAPEST = new Set(['pannonia', 'damjanich', 'mester']);
export const CITIES: { id: City; label: string }[] = [
    { id: 'budapest', label: t('Будапешт') },
    { id: 'debrecen', label: t('Дебрецен') }
];
export const houseCity = (houseName: string): City =>
    BUDAPEST.has(houseDisplayName(houseName).trim().toLowerCase()) ? 'budapest' : 'debrecen';

export type Scope = 'week' | 'season';

export interface HouseStanding {
    h: HouseSeries;
    /** Place within the list shown (null: not ranked). */
    rank: number | null;
    /** Week: that week's rating. Season: the average over its counted weeks. */
    value: number | null;
    /** Counted weeks (season scope). */
    weeks: number;
    week?: HouseWeek;
}

export interface PersonStanding {
    s: MemberSeries;
    rank: number | null;
    value: number | null;
    weeks: number;
    week?: MemberWeek;
    excused: boolean;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Places 1, 2, 3… in list order for the ranked rows; equal values share a place. */
const placeRanks = <T extends { rank: number | null; value: number | null }>(rows: T[], ranked: (r: T) => boolean): T[] => {
    let place = 0, seen = 0, last: number | null = null;
    return rows.map(r => {
        if (!ranked(r)) return { ...r, rank: null };
        seen += 1;
        if (r.value !== last) { place = seen; last = r.value; }
        return { ...r, rank: place };
    });
};

/** Houses, best first. Week: by that week's rating. Season: by the average
 *  rating over the weeks that counted, up to and including weekIndex. */
export const houseStandings = (insights: Insights, weekIndex: number, scope: Scope, city: City | 'all'): HouseStanding[] => {
    const rows = [...insights.houses.values()]
        .filter(h => city === 'all' || houseCity(h.name) === city)
        .map((h): HouseStanding | null => {
            if (scope === 'week') {
                const w = weekOf(h.weeks, weekIndex);
                if (!w) return null;
                return { h, rank: null, value: w.submitted ? w.avg : null, weeks: w.submitted ? 1 : 0, week: w };
            }
            const ws = h.weeks.filter(w => w.weekIndex <= weekIndex && w.submitted);
            if (!h.weeks.some(w => w.weekIndex <= weekIndex)) return null;
            return { h, rank: null, value: ws.length ? round1(avg(ws.map(w => w.avg))) : null, weeks: ws.length };
        })
        .filter((x): x is HouseStanding => x !== null)
        .sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || a.h.name.localeCompare(b.h.name));
    // The plain weekly list keeps the ranks used everywhere else on the site.
    if (scope === 'week' && city === 'all') return rows.map(r => ({ ...r, rank: r.week?.rank ?? null }));
    return placeRanks(rows, r => r.value !== null);
};

/** People, best first. Season: average score over their counted weeks; to
 *  get a place they need at least half of the weeks so far (like the Hall
 *  of Fame), so one great week can't top a whole season. */
export const personStandings = (insights: Insights, weekIndex: number, scope: Scope, city: City | 'all', weeksSoFar: number): PersonStanding[] => {
    const minWeeks = Math.max(1, Math.ceil(weeksSoFar / 2));
    const rows = [...insights.members.values()]
        .map((s): PersonStanding | null => {
            if (scope === 'week') {
                const w = weekOf(s.weeks, weekIndex);
                if (!w) return null;
                if (city !== 'all' && houseCity(w.houseName) !== city) return null;
                return { s, rank: null, value: w.submitted ? w.score : null, weeks: w.submitted ? 1 : 0, week: w, excused: w.excused };
            }
            const upTo = s.weeks.filter(w => w.weekIndex <= weekIndex);
            if (upTo.length === 0) return null;
            // City: the house they were in at the selected week (or their latest one).
            const at = weekOf(s.weeks, weekIndex) ?? upTo[upTo.length - 1];
            if (city !== 'all' && houseCity(at.houseName) !== city) return null;
            const ws = upTo.filter(w => w.submitted);
            return { s, rank: null, value: ws.length ? round1(avg(ws.map(w => w.score))) : null, weeks: ws.length, week: at, excused: false };
        })
        .filter((x): x is PersonStanding => x !== null);
    const eligible = (r: PersonStanding) => r.value !== null && (scope === 'week' || r.weeks >= minWeeks);
    rows.sort((a, b) => Number(eligible(b)) - Number(eligible(a)) || (b.value ?? -1) - (a.value ?? -1) || a.s.name.localeCompare(b.s.name));
    if (scope === 'week' && city === 'all') return rows.map(r => ({ ...r, rank: r.week?.rank ?? null }));
    return placeRanks(rows, eligible);
};
