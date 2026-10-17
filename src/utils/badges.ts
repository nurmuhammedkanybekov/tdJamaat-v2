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
import { t } from '../i18n';
import { metricLabel } from './metrics';

export type Tier = 'bronze' | 'silver' | 'gold' | 'seal';
export type BadgeIcon =
    | 'star' | 'podium' | 'target' | 'flame' | 'chain5' | 'zap' | 'leap' | 'steady' | 'rising'
    | 'crown' | 'moon' | 'unity' | 'card' | 'rocket' | 'tunduk' | 'medallion';

export const TIER_LABEL: Record<Tier, string> = { bronze: t('Коло'), silver: t('Күмүш'), gold: t('Алтын'), seal: t('Мөөр') };

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

// A "strong week" (for the consistency medals): the house's week counts and
// at least STRONG_METRICS of the 8 metrics reached their plan. Before Oct 2026
// these medals only needed "some score", which nearly everyone has every week,
// so the whole jamaat got them at once and they meant nothing.
export const STRONG_METRICS = 6;
export const metricsAtPlan = (w: MemberWeek) =>
    METRICS.filter(m => (w.member.target[m] || 0) > 0 && w.pct[m] >= 100).length;
export const strongWeek = (w: MemberWeek) => w.submitted && metricsAtPlan(w) >= STRONG_METRICS;

export const BADGES: Record<string, BadgeDef> = {
    'week-star': { id: 'week-star', scope: 'person', name: t('Апта жылдызы'), tier: 'gold', icon: 'star', rule: t('Аптанын эң жогорку жеке упайы — бардык катышуучулардын ичинен 1-орун.') },
    'podium': { id: 'podium', scope: 'person', name: t('Сыйлык тепкичи'), tier: 'silver', icon: 'podium', rule: t('Аптанын жеке рейтингинде 2- же 3-орун.') },
    'perfect': { id: 'perfect', scope: 'person', name: t('Толук план'), tier: 'bronze', icon: 'target', rule: t('Бир аптада 8 көрсөткүчтүн баарында планды аткаруу.') },
    'iron-3': { id: 'iron-3', scope: 'person', name: t('Темир тартип'), tier: 'silver', icon: 'flame', rule: t('Толук планды катары менен 3 апта аткаруу.') },
    'iron-5': { id: 'iron-5', scope: 'person', name: t('Болот тартип'), tier: 'gold', icon: 'chain5', rule: t('Толук планды катары менен 5 апта аткаруу.') },
    'double': { id: 'double', scope: 'person', name: t('Эки эсе'), tier: 'bronze', icon: 'zap', rule: t('Бир көрсөткүч боюнча планды эки эсе ашыра аткаруу (СВТ жана ИСТГ эсепке кирбейт — алардын максаты чоң сан, тез көбөйөт).') },
    'leap': { id: 'leap', scope: 'person', name: t('Чоң секирик'), tier: 'silver', icon: 'leap', rule: t('Аптанын эң чоң өсүшү: мурунку аптага караганда эң көп упай кошкон адам (кеминде +10).') },
    'rising': { id: 'rising', scope: 'person', name: t('Өсүү жолу'), tier: 'bronze', icon: 'rising', rule: t('Упай катары менен 3 апта өстү.') },
    'steady-4': { id: 'steady-4', scope: 'person', name: t('Туруктуу'), tier: 'bronze', icon: 'steady', rule: t('Катары менен 4 күчтүү апта: ар бир аптада 8 көрсөткүчтүн кеминде {0}ында план аткарылды.', STRONG_METRICS) },
    'steady-8': { id: 'steady-8', scope: 'person', name: t('Ишенимдүү'), tier: 'silver', icon: 'steady', rule: t('Катары менен 8 күчтүү апта (кеминде {0}/8 көрсөткүч планда).', STRONG_METRICS) },
    'steady-16': { id: 'steady-16', scope: 'person', name: t('Ак ниет'), tier: 'gold', icon: 'steady', rule: t('Катары менен 16 күчтүү апта (кеминде {0}/8 көрсөткүч планда).', STRONG_METRICS) },
    'full-season': { id: 'full-season', scope: 'person', name: t('Толук сезон'), tier: 'seal', icon: 'tunduk', rule: t('Сезон аяктаганда берилет: сезондун ар бир аптасы күчтүү болгон адамга (кеминде {0}/8 көрсөткүч планда).', STRONG_METRICS) },

    'house-week': { id: 'house-week', scope: 'house', name: t('Аптанын үйү'), tier: 'gold', icon: 'crown', rule: t('Аптанын үйлөр рейтингинде 1-орун.') },
    'house-month': { id: 'house-month', scope: 'house', name: t('Айдын үйү'), tier: 'seal', icon: 'moon', rule: t('Бүткөн 4-апталык мезгилде эң жогорку орточо рейтинг.') },
    'house-unity': { id: 'house-unity', scope: 'house', name: t('Бир жүрөк'), tier: 'gold', icon: 'unity', rule: t('Бир аптада үйдүн ар бир мүчөсү толук планды аткарды.') },
    'house-card': { id: 'house-card', scope: 'house', name: t('Мини-карта устаты'), tier: 'silver', icon: 'card', rule: t('Бир аптада мини-картанын 7 ишинин баарында план аткарылды.') },
    'house-season': { id: 'house-season', scope: 'house', name: t('Сезондун үйү'), tier: 'seal', icon: 'medallion', rule: t('Сезон аяктаганда берилет: бүт сезондогу эң жогорку орточо рейтинг.') },
    'house-leap': { id: 'house-leap', scope: 'house', name: t('Үйдүн секириги'), tier: 'bronze', icon: 'rocket', rule: t('Аптанын эң чоң рейтинг өсүшү (кеминде +5).') }
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
            give('week-star', r.p.id, r.p.name, r.w.houseName, r.w, t('{0}-апта: бардык катышуучулардын ичинен эң жогорку упай — {1}.', n, fmt(r.w.score))));
        rows.filter(r => (r.w.rank === 2 || r.w.rank === 3) && r.w.score > 0).forEach(r =>
            give('podium', r.p.id, r.p.name, r.w.houseName, r.w, t('{0}-апта: жеке рейтингде {1}-орун, {2} упай.', n, r.w.rank, fmt(r.w.score))));

        rows.forEach(({ p, w }) => {
            if (w.perfect) give('perfect', p.id, p.name, w.houseName, w, t('{0}-апта: 8 көрсөткүчтүн баарында план аткарылды.', n));

            const perfectRun = streakUntil(p.weeks, weekIndex, x => x.perfect);
            if (perfectRun === 3) give('iron-3', p.id, p.name, w.houseName, w, t('{0}–{1}-апталар: толук план катары менен 3 апта.', n - 2, n));
            if (perfectRun === 5) give('iron-5', p.id, p.name, w.houseName, w, t('{0}–{1}-апталар: толук план катары менен 5 апта.', n - 4, n));

            // Best "double" this week (one award per person per week)
            const doubles = METRICS
                .filter(m => !DOUBLE_EXCLUDED.includes(m) && (w.member.target[m] || 0) >= DOUBLE_MIN_TARGET && w.pct[m] >= 200)
                .sort((a, b) => w.pct[b] - w.pct[a]);
            if (doubles.length) {
                const m = doubles[0];
                give('double', p.id, p.name, w.houseName, w, t('{0}-апта: {1} боюнча {2} / {3} — планды {4} эсе аткарды.', n, metricLabel(m), w.member.actual[m], w.member.target[m], fmt(w.pct[m] / 100)));
            }

            const strongRun = streakUntil(p.weeks, weekIndex, strongWeek);
            if (strongRun === 4) give('steady-4', p.id, p.name, w.houseName, w, t('{0}–{1}-апталар: катары менен 4 күчтүү апта (ар биринде кеминде {2}/8 көрсөткүч планда).', n - 3, n, STRONG_METRICS));
            if (strongRun === 8) give('steady-8', p.id, p.name, w.houseName, w, t('{0}–{1}-апталар: катары менен 8 күчтүү апта.', n - 7, n));
            if (strongRun === 16) give('steady-16', p.id, p.name, w.houseName, w, t('{0}–{1}-апталар: катары менен 16 күчтүү апта.', n - 15, n));

            // Rising: score up three weeks running (4 consecutive submitted weeks, each higher)
            const last4 = [3, 2, 1, 0].map(k => weekOf(p.weeks, weekIndex - k));
            if (last4.every(x => x && x.submitted) && last4.every((x, i) => i === 0 || x!.score > last4[i - 1]!.score)) {
                const prevRising = [4, 3, 2, 1].map(k => weekOf(p.weeks, weekIndex - k));
                const alreadyRising = prevRising.every(x => x && x.submitted) && prevRising.every((x, i) => i === 0 || x!.score > prevRising[i - 1]!.score);
                if (!alreadyRising) give('rising', p.id, p.name, w.houseName, w, t('{0}–{1}-апталар: {2}.', n - 3, n, last4.map(x => fmt(x!.score)).join(' → ')));
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
                give('leap', l.p.id, l.p.name, l.w.houseName, l.w, t('{0}-апта: +{1} упай ({2} → {3}).', n, fmt(l.delta), fmt(l.prev!.score), fmt(l.w.score))));
        }

        // Houses
        const hrows = houses.map(h => ({ h, w: weekOf(h.weeks, weekIndex) })).filter((x): x is { h: HouseSeries; w: HouseWeek } => !!x.w && x.w.submitted);
        hrows.filter(x => x.w.rank === 1 && x.w.avg > 0).forEach(x =>
            give('house-week', x.h.id, x.h.name, x.h.name, x.w, t('{0}-апта: үйлөрдүн ичинен 1-орун, рейтинг {1} упай.', n, fmt(x.w.avg))));
        hrows.filter(x => x.w.allPerfect).forEach(x =>
            give('house-unity', x.h.id, x.h.name, x.h.name, x.w, t('{0}-апта: {1} мүчөнүн баары толук планды аткарды.', n, x.w.memberCount)));
        hrows.filter(x => x.w.miniCardComplete).forEach(x =>
            give('house-card', x.h.id, x.h.name, x.h.name, x.w, t('{0}-апта: мини-картанын 7 ишинин баары аткарылды.', n)));
        const hleaps = hrows
            .map(x => ({ ...x, prev: weekOf(x.h.weeks, weekIndex - 1) }))
            .filter(x => x.prev && x.prev.submitted)
            .map(x => ({ ...x, delta: x.w.avg - x.prev!.avg }))
            .sort((a, b) => b.delta - a.delta);
        if (hleaps[0] && hleaps[0].delta >= 5) {
            const top = hleaps[0].delta;
            hleaps.filter(x => x.delta === top).forEach(x =>
                give('house-leap', x.h.id, x.h.name, x.h.name, x.w, t('{0}-апта: рейтинг +{1} ({2} → {3}).', n, fmt(x.delta), fmt(x.prev!.avg), fmt(x.w.avg))));
        }

        // House of the month: when a 4-week period completes
        if ((weekIndex + 1) % 4 === 0) {
            const period = [0, 1, 2, 3].map(k => weekIndex - 3 + k);
            const totals = houses.map(h => {
                const ws = period.map(i => weekOf(h.weeks, i)).filter(x => x && x.submitted);
                return { h, avg: ws.length ? ws.reduce((s, x) => s + x!.avg, 0) / ws.length : 0, count: ws.length };
            }).filter(it => it.count > 0).sort((a, b) => b.avg - a.avg);
            if (totals[0] && totals[0].avg > 0) {
                const top = totals[0].avg;
                const first = data.weeks[period[0]].weekNumber;
                totals.filter(it => it.avg === top).forEach(it =>
                    give('house-month', it.h.id, it.h.name, it.h.name, { weekIndex, weekNumber: n }, t('{0}–{1}-апталар: орточо рейтинг {2} — мезгилдин эң мыкты үйү.', first, n, fmt(it.avg))));
            }
        }
    });

    // Season finale — only once the admin has ended the season, because
    // nobody knows in advance how many weeks a season will have.
    if (opts.seasonClosed && data.weeks.length > 0) {
        const lastIndex = data.weeks.length - 1;
        const last = { weekIndex: lastIndex, weekNumber: data.weeks[lastIndex].weekNumber };
        const label = opts.seasonName ? t('«{0}» сезону', opts.seasonName) : t('Сезон');
        const total = data.weeks.length;
        people.forEach(p => {
            // Excused weeks (sick, travelling) are passed over, but at least one strong week is needed.
            const strong = data.weeks.every((_, i) => { const w = weekOf(p.weeks, i); return !!w && (w.excused || strongWeek(w)); })
                && p.weeks.some(strongWeek);
            if (strong) give('full-season', p.id, p.name, p.houseName, last, t('{0}: {1} аптанын баары күчтүү апта болду.', label, total));
        });
        const season = houses.map(h => {
            const ws = h.weeks.filter(w => w.submitted);
            return { h, avg: ws.length ? ws.reduce((s2, w) => s2 + w.avg, 0) / ws.length : 0, count: ws.length };
        }).filter(x => x.count > 0).sort((a, b) => b.avg - a.avg);
        if (season[0] && season[0].avg > 0) {
            const top = season[0].avg;
            season.filter(x => x.avg === top).forEach(x =>
                give('house-season', x.h.id, x.h.name, x.h.name, last, t('{0}: орточо рейтинг {1} — эң мыкты үй.', label, fmt(x.avg))));
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
