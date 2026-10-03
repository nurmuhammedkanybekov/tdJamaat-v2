// Season awards ("сыйлыктар") — Strava-style badges for people and houses.
//
// Every badge is earned from the real weekly numbers, never granted by hand,
// and every award carries a concrete reason ("5-апта: 8 көрсөткүчтүн баарында
// план аткарылды") so anyone can see exactly why it was given. Only weeks a
// house actually submitted count — nobody earns or loses anything because a
// house hasn't entered its numbers yet.
import type { DataFile, MetricValues } from '../types';
import type { HouseSeries, HouseWeek, Insights, MemberSeries, MemberWeek } from './insights';
import { METRICS, longestStreak, streakUntil, weekOf } from './insights';

export type Tier = 'bronze' | 'silver' | 'gold' | 'seal';
export type BadgeIcon =
    | 'star' | 'podium' | 'target' | 'flame' | 'chain5' | 'zap' | 'leap' | 'steady' | 'rising'
    | 'crown' | 'moon' | 'unity' | 'card' | 'rocket' | 'tunduk' | 'medallion';

export const TIER_LABEL: Record<Tier, string> = { bronze: 'Коло', silver: 'Күмүш', gold: 'Алтын', seal: 'Мөөр' };

export interface BadgeDef {
    id: string;
    scope: 'person' | 'house';
    name: string;
    tier: Tier;
    icon: BadgeIcon;
    /** The rule, in one sentence — shown in the awards gallery. */
    rule: string;
}

export interface Award {
    def: BadgeDef;
    holderId: string;
    holderName: string;
    houseName: string;
    weekIndex: number;
    weekNumber: number;
    /** Why this specific award was given. */
    reason: string;
}

// Metrics where "double the plan" is a real achievement. СВТ and ИСТГ are
// excluded on purpose: their targets are big counts that are quick to
// multiply, so 2× there isn't comparable to 2× pages read.
const DOUBLE_MIN_TARGET = 5;
const DOUBLE_EXCLUDED: Array<keyof MetricValues> = ['СВТ', 'ИСТГ'];

export const BADGES: Record<string, BadgeDef> = {
    'week-star': { id: 'week-star', scope: 'person', name: 'Апта жылдызы', tier: 'gold', icon: 'star', rule: 'Аптанын эң жогорку жеке упайы — бардык катышуучулардын ичинен 1-орун.' },
    'podium': { id: 'podium', scope: 'person', name: 'Сыйлык тепкичи', tier: 'silver', icon: 'podium', rule: 'Аптанын жеке рейтингинде 2- же 3-орун.' },
    'perfect': { id: 'perfect', scope: 'person', name: 'Толук план', tier: 'bronze', icon: 'target', rule: 'Бир аптада 8 көрсөткүчтүн баарында планды аткаруу.' },
    'iron-3': { id: 'iron-3', scope: 'person', name: 'Темир тартип', tier: 'silver', icon: 'flame', rule: 'Толук планды катары менен 3 апта аткаруу.' },
    'iron-5': { id: 'iron-5', scope: 'person', name: 'Болот тартип', tier: 'gold', icon: 'chain5', rule: 'Толук планды катары менен 5 апта аткаруу.' },
    'double': { id: 'double', scope: 'person', name: 'Эки эсе', tier: 'bronze', icon: 'zap', rule: 'Бир көрсөткүч боюнча планды эки эсе ашыра аткаруу (СВТ жана ИСТГ эсепке кирбейт — алардын максаты чоң сан, тез көбөйөт).' },
    'leap': { id: 'leap', scope: 'person', name: 'Чоң секирик', tier: 'silver', icon: 'leap', rule: 'Аптанын эң чоң өсүшү: мурунку аптага караганда эң көп упай кошкон адам (кеминде +10).' },
    'rising': { id: 'rising', scope: 'person', name: 'Өсүү жолу', tier: 'bronze', icon: 'rising', rule: 'Упай катары менен 3 апта өстү.' },
    'steady-4': { id: 'steady-4', scope: 'person', name: 'Туруктуу', tier: 'bronze', icon: 'steady', rule: 'Катары менен 4 апта активдүү (ар бир аптада упай бар).' },
    'steady-8': { id: 'steady-8', scope: 'person', name: 'Ишенимдүү', tier: 'silver', icon: 'steady', rule: 'Катары менен 8 апта активдүү.' },
    'steady-16': { id: 'steady-16', scope: 'person', name: 'Ак ниет', tier: 'gold', icon: 'steady', rule: 'Катары менен 16 апта активдүү.' },
    'full-season': { id: 'full-season', scope: 'person', name: 'Толук сезон', tier: 'seal', icon: 'tunduk', rule: 'Сезон аяктаганда берилет: сезондун ар бир аптасында активдүү болгон адамга.' },

    'house-week': { id: 'house-week', scope: 'house', name: 'Аптанын үйү', tier: 'gold', icon: 'crown', rule: 'Аптанын үйлөр рейтингинде 1-орун.' },
    'house-month': { id: 'house-month', scope: 'house', name: 'Айдын үйү', tier: 'seal', icon: 'moon', rule: 'Бүткөн 4-апталык мезгилде эң жогорку орточо рейтинг.' },
    'house-unity': { id: 'house-unity', scope: 'house', name: 'Бир жүрөк', tier: 'gold', icon: 'unity', rule: 'Бир аптада үйдүн ар бир мүчөсү толук планды аткарды.' },
    'house-card': { id: 'house-card', scope: 'house', name: 'Мини-карта устаты', tier: 'silver', icon: 'card', rule: 'Бир аптада мини-картанын 7 ишинин баарында план аткарылды.' },
    'house-season': { id: 'house-season', scope: 'house', name: 'Сезондун үйү', tier: 'seal', icon: 'medallion', rule: 'Сезон аяктаганда берилет: бүт сезондогу эң жогорку орточо рейтинг.' },
    'house-leap': { id: 'house-leap', scope: 'house', name: 'Үйдүн секириги', tier: 'bronze', icon: 'rocket', rule: 'Аптанын эң чоң рейтинг өсүшү (кеминде +5).' }
};

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

export const computeAwards = (data: DataFile, insights: Insights, opts: { seasonClosed?: boolean; seasonName?: string } = {}): Award[] => {
    const awards: Award[] = [];
    const people = [...insights.members.values()];
    const houses = [...insights.houses.values()];

    const give = (id: string, holderId: string, holderName: string, houseName: string, w: { weekIndex: number; weekNumber: number }, reason: string) =>
        awards.push({ def: BADGES[id], holderId, holderName, houseName, weekIndex: w.weekIndex, weekNumber: w.weekNumber, reason });

    data.weeks.forEach((week, weekIndex) => {
        const n = week.weekNumber;
        const rows = people.map(p => ({ p, w: weekOf(p.weeks, weekIndex) })).filter((x): x is { p: MemberSeries; w: MemberWeek } => !!x.w && x.w.submitted);
        if (rows.length === 0) return;

        // Podium (only if somebody actually scored)
        rows.filter(r => r.w.rank === 1 && r.w.score > 0).forEach(r =>
            give('week-star', r.p.id, r.p.name, r.w.houseName, r.w, `${n}-апта: бардык катышуучулардын ичинен эң жогорку упай — ${fmt(r.w.score)}.`));
        rows.filter(r => (r.w.rank === 2 || r.w.rank === 3) && r.w.score > 0).forEach(r =>
            give('podium', r.p.id, r.p.name, r.w.houseName, r.w, `${n}-апта: жеке рейтингде ${r.w.rank}-орун, ${fmt(r.w.score)} упай.`));

        rows.forEach(({ p, w }) => {
            if (w.perfect) give('perfect', p.id, p.name, w.houseName, w, `${n}-апта: 8 көрсөткүчтүн баарында план аткарылды.`);

            const perfectRun = streakUntil(p.weeks, weekIndex, x => x.perfect);
            if (perfectRun === 3) give('iron-3', p.id, p.name, w.houseName, w, `${n - 2}–${n}-апталар: толук план катары менен 3 апта.`);
            if (perfectRun === 5) give('iron-5', p.id, p.name, w.houseName, w, `${n - 4}–${n}-апталар: толук план катары менен 5 апта.`);

            // Best "double" this week (one award per person per week)
            const doubles = METRICS
                .filter(m => !DOUBLE_EXCLUDED.includes(m) && (w.member.target[m] || 0) >= DOUBLE_MIN_TARGET && w.pct[m] >= 200)
                .sort((a, b) => w.pct[b] - w.pct[a]);
            if (doubles.length) {
                const m = doubles[0];
                give('double', p.id, p.name, w.houseName, w, `${n}-апта: ${m} боюнча ${w.member.actual[m]} / ${w.member.target[m]} — планды ${fmt(w.pct[m] / 100)} эсе аткарды.`);
            }

            const activeRun = streakUntil(p.weeks, weekIndex, x => x.submitted && x.score > 0);
            if (activeRun === 4) give('steady-4', p.id, p.name, w.houseName, w, `${n - 3}–${n}-апталар: 4 апта катары менен активдүү.`);
            if (activeRun === 8) give('steady-8', p.id, p.name, w.houseName, w, `${n - 7}–${n}-апталар: 8 апта катары менен активдүү.`);
            if (activeRun === 16) give('steady-16', p.id, p.name, w.houseName, w, `${n - 15}–${n}-апталар: 16 апта катары менен активдүү.`);

            // Rising: score up three weeks running (4 consecutive submitted weeks, each higher)
            const last4 = [3, 2, 1, 0].map(k => weekOf(p.weeks, weekIndex - k));
            if (last4.every(x => x && x.submitted) && last4.every((x, i) => i === 0 || x!.score > last4[i - 1]!.score)) {
                const prevRising = [4, 3, 2, 1].map(k => weekOf(p.weeks, weekIndex - k));
                const alreadyRising = prevRising.every(x => x && x.submitted) && prevRising.every((x, i) => i === 0 || x!.score > prevRising[i - 1]!.score);
                if (!alreadyRising) give('rising', p.id, p.name, w.houseName, w, `${n - 3}–${n}-апталар: ${last4.map(x => fmt(x!.score)).join(' → ')}.`);
            }
        });

        // Biggest leap this week
        const leaps = rows
            .map(r => ({ ...r, prev: weekOf(r.p.weeks, weekIndex - 1) }))
            .filter(r => r.prev && r.prev.submitted)
            .map(r => ({ ...r, delta: r.w.score - r.prev!.score }))
            .sort((a, b) => b.delta - a.delta);
        if (leaps[0] && leaps[0].delta >= 10) {
            const top = leaps[0].delta;
            leaps.filter(l => l.delta === top).forEach(l =>
                give('leap', l.p.id, l.p.name, l.w.houseName, l.w, `${n}-апта: +${fmt(l.delta)} упай (${fmt(l.prev!.score)} → ${fmt(l.w.score)}).`));
        }

        // Houses
        const hrows = houses.map(h => ({ h, w: weekOf(h.weeks, weekIndex) })).filter((x): x is { h: HouseSeries; w: HouseWeek } => !!x.w && x.w.submitted);
        hrows.filter(x => x.w.rank === 1 && x.w.avg > 0).forEach(x =>
            give('house-week', x.h.id, x.h.name, x.h.name, x.w, `${n}-апта: үйлөрдүн ичинен 1-орун, рейтинг ${fmt(x.w.avg)} упай.`));
        hrows.filter(x => x.w.allPerfect).forEach(x =>
            give('house-unity', x.h.id, x.h.name, x.h.name, x.w, `${n}-апта: ${x.w.memberCount} мүчөнүн баары толук планды аткарды.`));
        hrows.filter(x => x.w.miniCardComplete).forEach(x =>
            give('house-card', x.h.id, x.h.name, x.h.name, x.w, `${n}-апта: мини-картанын 7 ишинин баары аткарылды.`));
        const hleaps = hrows
            .map(x => ({ ...x, prev: weekOf(x.h.weeks, weekIndex - 1) }))
            .filter(x => x.prev && x.prev.submitted)
            .map(x => ({ ...x, delta: x.w.avg - x.prev!.avg }))
            .sort((a, b) => b.delta - a.delta);
        if (hleaps[0] && hleaps[0].delta >= 5) {
            const top = hleaps[0].delta;
            hleaps.filter(x => x.delta === top).forEach(x =>
                give('house-leap', x.h.id, x.h.name, x.h.name, x.w, `${n}-апта: рейтинг +${fmt(x.delta)} (${fmt(x.prev!.avg)} → ${fmt(x.w.avg)}).`));
        }

        // House of the month: when a 4-week period completes
        if ((weekIndex + 1) % 4 === 0) {
            const period = [0, 1, 2, 3].map(k => weekIndex - 3 + k);
            const totals = houses.map(h => {
                const ws = period.map(i => weekOf(h.weeks, i)).filter(x => x && x.submitted);
                return { h, avg: ws.length ? ws.reduce((s, x) => s + x!.avg, 0) / ws.length : 0, count: ws.length };
            }).filter(t => t.count > 0).sort((a, b) => b.avg - a.avg);
            if (totals[0] && totals[0].avg > 0) {
                const top = totals[0].avg;
                const first = data.weeks[period[0]].weekNumber;
                totals.filter(t => t.avg === top).forEach(t =>
                    give('house-month', t.h.id, t.h.name, t.h.name, { weekIndex, weekNumber: n }, `${first}–${n}-апталар: орточо рейтинг ${fmt(t.avg)} — мезгилдин эң мыкты үйү.`));
            }
        }
    });

    // Season finale — only once the admin has ended the season, because
    // nobody knows in advance how many weeks a season will have.
    if (opts.seasonClosed && data.weeks.length > 0) {
        const lastIndex = data.weeks.length - 1;
        const last = { weekIndex: lastIndex, weekNumber: data.weeks[lastIndex].weekNumber };
        const label = opts.seasonName ? `«${opts.seasonName}» сезону` : 'Сезон';
        const total = data.weeks.length;
        people.forEach(p => {
            const active = data.weeks.every((_, i) => { const w = weekOf(p.weeks, i); return !!w && w.submitted && w.score > 0; });
            if (active) give('full-season', p.id, p.name, p.houseName, last, `${label}: ${total} аптанын баарында активдүү.`);
        });
        const season = houses.map(h => {
            const ws = h.weeks.filter(w => w.submitted);
            return { h, avg: ws.length ? ws.reduce((s2, w) => s2 + w.avg, 0) / ws.length : 0, count: ws.length };
        }).filter(x => x.count > 0).sort((a, b) => b.avg - a.avg);
        if (season[0] && season[0].avg > 0) {
            const top = season[0].avg;
            season.filter(x => x.avg === top).forEach(x =>
                give('house-season', x.h.id, x.h.name, x.h.name, last, `${label}: орточо рейтинг ${fmt(x.avg)} — эң мыкты үй.`));
        }
    }

    return awards;
};

/** Longest perfect-week streak — shown on profiles. */
export const bestPerfectStreak = (weeks: MemberWeek[]) => longestStreak(weeks, w => w.perfect);

/** Group awards by badge for a holder: [{def, awards}] most prestigious first. */
const TIER_ORDER: Record<Tier, number> = { seal: 0, gold: 1, silver: 2, bronze: 3 };
export const groupAwards = (awards: Award[]) => {
    const map = new Map<string, Award[]>();
    awards.forEach(a => map.set(a.def.id, [...(map.get(a.def.id) ?? []), a]));
    return [...map.entries()]
        .map(([id, list]) => ({ def: BADGES[id], awards: list.sort((a, b) => b.weekIndex - a.weekIndex) }))
        .sort((a, b) => TIER_ORDER[a.def.tier] - TIER_ORDER[b.def.tier] || b.awards.length - a.awards.length);
};
