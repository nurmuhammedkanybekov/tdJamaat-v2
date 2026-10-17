// The whole jamaat together: season totals, this week vs last week, season
// records, and the Hall of Fame (per season). Pure functions over the same
// data the rest of the site uses, so every number matches the other pages.
import type { DataFile, MetricValues, MiniCard } from '../types';
import type { Award } from './badges';
import { strongWeek } from './badges';
import type { Insights, MemberSeries } from './insights';
import { METRICS, longestStreak, weekOf } from './insights';
import { t } from '../i18n';

const round1 = (n: number) => Math.round(n * 10) / 10;
const CARD_KEYS = (card: MiniCard) => Object.keys(card) as Array<keyof MiniCard>;

export interface Totals {
    metrics: MetricValues;
    card: Record<keyof MiniCard, number>;
    /** Person-weeks that were counted (house week counts, person not excused). */
    personWeeks: number;
    /** House-weeks that were counted. */
    houseWeeks: number;
}

const emptyTotals = (cardKeys: Array<keyof MiniCard>): Totals => ({
    metrics: Object.fromEntries(METRICS.map(m => [m, 0])) as unknown as MetricValues,
    card: Object.fromEntries(cardKeys.map(k => [k, 0])) as Record<keyof MiniCard, number>,
    personWeeks: 0,
    houseWeeks: 0
});

/** What the jamaat did in the given weeks (indexes into data.weeks), counted weeks only.
 *  `houseIds`: only these houses (to compare two weeks fairly). */
export const totalsFor = (data: DataFile, insights: Insights, weekIndexes: number[], houseIds?: Set<string>): Totals => {
    const firstTeam = data.weeks.find(w => w.teams.length)?.teams[0];
    const t = emptyTotals(firstTeam ? CARD_KEYS(firstTeam.miniCard) : []);
    const wanted = new Set(weekIndexes);
    insights.members.forEach(s => s.weeks.forEach(w => {
        if (!wanted.has(w.weekIndex) || !w.submitted || (houseIds && !houseIds.has(w.houseId))) return;
        METRICS.forEach(m => { t.metrics[m] += w.member.actual[m] || 0; });
        t.personWeeks++;
    }));
    weekIndexes.forEach(i => {
        const week = data.weeks[i];
        if (!week) return;
        week.teams.forEach(team => {
            if (houseIds && !houseIds.has(team.id)) return;
            const hw = weekOf(insights.houses.get(team.id)?.weeks ?? [], i);
            if (!hw || !hw.submitted || !team.submitted) return;
            CARD_KEYS(team.miniCard).forEach(k => { t.card[k] = (t.card[k] ?? 0) + Math.max(0, team.miniCard[k].actual || 0); });
            t.houseWeeks++;
        });
    });
    return t;
};

export const seasonTotals = (data: DataFile, insights: Insights) => totalsFor(data, insights, data.weeks.map((_, i) => i));

/** This week vs last week, fairly: only the houses whose week counts in BOTH
 *  (a house that hasn't entered this week yet would make every number look
 *  like a drop). */
export const weekOverWeek = (data: DataFile, insights: Insights, weekIndex: number) => {
    const counts = (i: number) => new Set(
        [...insights.houses.values()].filter(h => weekOf(h.weeks, i)?.submitted).map(h => h.id)
    );
    const now = counts(weekIndex);
    const before = weekIndex > 0 ? counts(weekIndex - 1) : new Set<string>();
    const both = new Set([...now].filter(id => before.has(id)));
    return {
        houses: both.size,
        thisWeek: totalsFor(data, insights, [weekIndex], both),
        lastWeek: totalsFor(data, insights, weekIndex > 0 ? [weekIndex - 1] : [], both)
    };
};

export interface SeasonRecord {
    label: string;
    value: string;
    who: string;
    detail: string;
    memberId?: string;
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

/** Season records. Each is null when there is nothing to show yet. */
export const seasonRecords = (insights: Insights, awards: Award[]): SeasonRecord[] => {
    const people = [...insights.members.values()];
    const out: SeasonRecord[] = [];

    const bestWeek = people.flatMap(s => s.weeks.filter(w => w.submitted).map(w => ({ s, w })))
        .sort((a, b) => b.w.score - a.w.score)[0];
    if (bestWeek && bestWeek.w.score > 0)
        out.push({ label: t('Эң жогорку жеке апта'), value: fmt(bestWeek.w.score), who: bestWeek.s.name, detail: t('{0}-апта · {1}', bestWeek.w.weekNumber, bestWeek.w.houseName), memberId: bestWeek.s.id });

    const bestHouse = [...insights.houses.values()].flatMap(h => h.weeks.filter(w => w.submitted).map(w => ({ h, w })))
        .sort((a, b) => b.w.avg - a.w.avg)[0];
    if (bestHouse && bestHouse.w.avg > 0)
        out.push({ label: t('Эң жогорку үй рейтинги'), value: fmt(bestHouse.w.avg), who: bestHouse.h.name, detail: t('{0}-апта', bestHouse.w.weekNumber) });

    const streak = people.map(s => ({ s, n: longestStreak(s.weeks, strongWeek) })).sort((a, b) => b.n - a.n)[0];
    if (streak && streak.n >= 2)
        out.push({ label: t('Эң узун күчтүү серия'), value: t('{0} апта', streak.n), who: streak.s.name, detail: t('катары менен, кеминде 6/8 көрсөткүч планда'), memberId: streak.s.id });

    const medals = new Map<string, number>();
    awards.filter(a => a.def.scope === 'person').forEach(a => medals.set(a.holderId, (medals.get(a.holderId) ?? 0) + 1));
    const topMedals = [...medals.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topMedals) {
        const s = insights.members.get(topMedals[0]);
        if (s) out.push({ label: t('Эң көп медаль'), value: String(topMedals[1]), who: s.name, detail: s.houseName, memberId: s.id });
    }

    const leap = people.flatMap(s => s.weeks.filter(w => w.submitted).map(w => {
        const prev = weekOf(s.weeks, w.weekIndex - 1);
        return prev && prev.submitted ? { s, w, d: w.score - prev.score } : null;
    })).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => b.d - a.d)[0];
    if (leap && leap.d > 0)
        out.push({ label: t('Эң чоң секирик'), value: `+${fmt(leap.d)}`, who: leap.s.name, detail: t('{0}-апта', leap.w.weekNumber), memberId: leap.s.id });

    return out;
};

export interface HallOfFame {
    seasonId: number;
    seasonName: string;
    finished: boolean;
    weeks: number;
    house: { id: string; name: string; avg: number } | null;
    people: Array<{ id: string; name: string; houseName: string; avg: number; weeks: number }>;
    medals: { id: string; name: string; count: number } | null;
    streak: { id: string; name: string; weeks: number } | null;
}

/** One season's Hall of Fame. People need at least half of the season's weeks
 *  counted, so one great week can't beat a whole season of work. */
export const hallOfFame = (
    season: { id: number; name: string; lastWeek: number | null },
    data: DataFile,
    insights: Insights,
    awards: Award[]
): HallOfFame => {
    const weeks = data.weeks.length;
    const minWeeks = Math.max(1, Math.ceil(weeks / 2));
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

    const house = [...insights.houses.values()]
        .map(h => { const ws = h.weeks.filter(w => w.submitted); return { id: h.id, name: h.name, avg: round1(avg(ws.map(w => w.avg))), n: ws.length }; })
        .filter(h => h.n > 0 && h.avg > 0)
        .sort((a, b) => b.avg - a.avg)[0] ?? null;

    const people = [...insights.members.values()]
        .map((s: MemberSeries) => { const ws = s.weeks.filter(w => w.submitted); return { id: s.id, name: s.name, houseName: s.houseName, avg: round1(avg(ws.map(w => w.score))), weeks: ws.length }; })
        .filter(p => p.weeks >= minWeeks && p.avg > 0)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3);

    const counts = new Map<string, number>();
    awards.filter(a => a.def.scope === 'person').forEach(a => counts.set(a.holderId, (counts.get(a.holderId) ?? 0) + 1));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const medals = top && insights.members.get(top[0]) ? { id: top[0], name: insights.members.get(top[0])!.name, count: top[1] } : null;

    const st = [...insights.members.values()].map(s => ({ id: s.id, name: s.name, weeks: longestStreak(s.weeks, strongWeek) })).sort((a, b) => b.weeks - a.weeks)[0];
    const streak = st && st.weeks >= 2 ? st : null;

    return { seasonId: season.id, seasonName: season.name, finished: season.lastWeek !== null, weeks, house: house ? { id: house.id, name: house.name, avg: house.avg } : null, people, medals, streak };
};
