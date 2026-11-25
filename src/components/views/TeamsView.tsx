import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, PenLine } from 'lucide-react';
import type { DataFile } from '../../types';
import type { Insights, MemberSeries, MemberWeek } from '../../utils/insights';
import { METRICS, PLAN_SCORE, movement, ROLE_LABEL, weekOf } from '../../utils/insights';
import { MINI_CARD_POINTS, TEAM_COLORS, calculatePerformancePercentage } from '../../utils/scoring';
import { TAZALYK_MAX } from '../../utils/tazalyk';
import { Avatar } from '../Avatar';
import { CountUp } from '../motion';
import { Beads, Movement, Plate, SectionHeader, Skyline } from '../ui';
import { perfBarColor, perfColor } from '../../utils/style';
import { t } from '../../i18n';

import { houseBreakdown } from '../../utils/breakdown';
import { PointsBreakdown } from '../PointsBreakdown';
import { cardLabel, cardName, metricLabel, metricName } from '../../utils/metrics';
import { JattooHouse } from '../Jattoo';
import { SumTerm, Trajectory } from '../HouseParts';
import { Corners } from '../Ornament';
import { ROMAN } from '../../utils/roman';

const TAZ_WHO: Record<string, string> = { inspector: t('Тазалык текшерүүчү'), leader: t('Капитан'), admin: t('Админ') };

interface TeamsViewProps {
    data: DataFile;
    weekIndex: number;
    insights: Insights;
    initialHouseId: string | null;
    canEditHouse: (houseId: string) => boolean;
    onEditHouse: (houseId: string) => void;
    onOpenProfile: (memberId: string) => void;
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const pad2 = (n: number) => String(n).padStart(2, '0');

export const TeamsView: React.FC<TeamsViewProps> = ({ data, weekIndex, insights, initialHouseId, canEditHouse, onEditHouse, onOpenProfile }) => {
    const week = data.weeks[weekIndex];
    const [houseId, setHouseId] = useState<string>(() => (initialHouseId && week.teams.some(it => it.id === initialHouseId) ? initialHouseId : week.teams[0]?.id ?? ''));
    const team = week.teams.find(it => it.id === houseId) ?? week.teams[0];
    const series = team ? insights.houses.get(team.id) : undefined;
    const hw = series ? weekOf(series.weeks, weekIndex) : undefined;
    const color = TEAM_COLORS[(series?.colorIndex ?? 0) % TEAM_COLORS.length];

    // Members of this house this week, ranked within the house.
    const members = useMemo(() => {
        if (!team) return [];
        return team.members
            .map(m => {
                const s = insights.members.get(m.id)!;
                return { s, w: weekOf(s.weeks, weekIndex)! };
            })
            .filter(x => x.s && x.w)
            // Excused people (sick, travelling) go last, without a place.
            .sort((a, b) => Number(a.w.excused) - Number(b.w.excused) || b.w.score - a.w.score);
    }, [team, insights, weekIndex]);

    const breakdown = useMemo(() => (team ? houseBreakdown(team) : null), [team]);

    if (!team) return null;

    const cardKeys = Object.keys(team.miniCard) as Array<keyof typeof team.miniCard>;

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* The houses as a scoreboard: each one's place and rating this
                week; the chosen one opens below. */}
            <div className="-mx-4 sm:mx-0">
                <div className="house-strip scroll-row px-4 sm:px-0" role="tablist" aria-label={t('Үйлөр')}>
                    {week.teams.map(it => {
                        const hs = insights.houses.get(it.id);
                        const c = TEAM_COLORS[(hs?.colorIndex ?? 0) % TEAM_COLORS.length];
                        const w = hs ? weekOf(hs.weeks, weekIndex) : undefined;
                        const active = it.id === team.id;
                        return (
                            <button key={it.id} role="tab" aria-selected={active} onClick={() => setHouseId(it.id)} className={`house-strip-item ${active ? 'is-active' : ''}`} style={{ '--house': c } as React.CSSProperties}>
                                <span className="eyebrow" style={{ color: active ? 'var(--gold)' : 'var(--text-muted)', letterSpacing: '0.24em' }}>{w?.rank ? t('{0}-орун', w.rank) : t('күтүлүүдө')}</span>
                                <span className="block font-display text-[1.35rem] leading-tight truncate mt-1" style={{ color: 'var(--text-primary)' }}>{it.name}</span>
                                <span className="block font-display text-[1rem] tabular mt-0.5" style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}>{w?.submitted ? fmt(w.avg) : '—'}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* The house itself: its place, its name, its number — and how the
                number is made, and how it has moved week by week. */}
            <section key={team.id} className="house-hero animate-view-in" style={{ '--house': color } as React.CSSProperties}>
                <Corners inset={8} size={26} />
                {canEditHouse(team.id) && (
                    <div className="house-hero-edit hidden sm:block">
                        <button onClick={() => onEditHouse(team.id)} className="btn btn-primary"><PenLine className="w-4 h-4" />  {team.submitted ? t('Өзгөртүү') : t('Киргизүү')}</button>
                    </div>
                )}

                <div className="relative grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-end gap-x-5 sm:gap-x-10 gap-y-5">
                    <div className="text-center">
                        {hw?.rank
                            ? <div className="font-display leading-[0.8] tabular house-hero-rank" style={{ color: 'var(--gold)' }}>{ROMAN[hw.rank - 1] ?? hw.rank}</div>
                            : <div className="house-hero-rank-empty" aria-label={t('Рейтингде жок')}><Clock3 className="w-7 h-7" strokeWidth={1.2} /></div>}
                        <div className="eyebrow mt-3">{t('орун')}</div>
                    </div>
                    <div className="min-w-0 pb-1">
                        <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('{0}-апта', week.weekNumber)}</div>
                        <h2 className="font-display leading-[0.95] mt-2 house-hero-name truncate" style={{ color: 'var(--text-primary)' }}>{team.name}</h2>
                        <div className="flex items-center gap-x-4 gap-y-1 mt-3 text-[0.85rem] flex-wrap" style={{ color: 'var(--text-muted)' }}>
                            <span className="inline-flex items-center gap-2"><span className="w-5 h-[2px]" style={{ backgroundColor: color }} />{t('{0} адам{1}', team.members.length, hw && hw.excusedCount > 0 ? t(' · {0} себептүү', hw.excusedCount) : '')}</span>
                            {team.submitted
                                ? <span className="inline-flex items-center gap-1.5 italic" style={{ color: 'var(--success)' }}><CheckCircle2 className="w-3.5 h-3.5" />{t('маалымат киргизилди')}</span>
                                : <span className="inline-flex items-center gap-1.5 italic"><Clock3 className="w-3.5 h-3.5" />{t('маалымат күтүлүүдө')}</span>}
                        </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 sm:text-right pb-1">
                        <div className="eyebrow">{t('Үй рейтинги')}</div>
                        <div className="flex items-baseline sm:justify-end gap-2 mt-2">
                            {hw?.submitted
                                ? <CountUp key={`${team.id}-${weekIndex}`} value={hw.avg} className="font-display leading-none tabular gold-sheen house-hero-score" />
                                : <span className="font-display text-[1.6rem] italic leading-none" style={{ color: 'var(--text-muted)' }}>{t('күтүлүүдө')}</span>}
                            {series && <Movement delta={movement(series.weeks, weekIndex)} size="md" />}
                        </div>
                    </div>
                </div>

                {/* The team: every member's portrait, in this week's order. */}
                <div className="team-row" aria-label={t('Мүчөлөр')}>
                    {members.map(({ s: m, w }, i) => (
                        <button key={m.id} onClick={() => onOpenProfile(m.id)} className="team-face" title={`${w.member.name} · ${w.excused ? t('себептүү') : fmt(w.score)}`} style={{ animationDelay: `${i * 60}ms` }}>
                            <span className={`team-face-ring ${i === 0 && !w.excused ? 'is-first' : ''}`}><Avatar name={m.name} role={w.member.role} photoUrl={w.member.photoUrl} size="md" /></span>
                            <span className="team-face-name">{w.member.name}</span>
                            <span className="team-face-score tabular">{w.excused ? '—' : fmt(w.score)}</span>
                        </button>
                    ))}
                </div>

                {/* How the number is made, as a sum. */}
                {hw?.submitted && (
                    <div className="house-sum">
                        <SumTerm value={fmt(hw.memberAvg)} label={t('мүчөлөрдүн орточосу')} />
                        <span className="house-sum-op">+</span>
                        <SumTerm value={fmt(hw.cardBonus)} of={MINI_CARD_POINTS * 7} label={t('мини-карта')} />
                        {hw.tazalyk !== null && <>
                            <span className="house-sum-op">+</span>
                            <SumTerm value={hw.tazalykPending ? '…' : fmt(hw.tazalyk)} of={TAZALYK_MAX} label={hw.tazalykPending ? t('тазалык күтүлүүдө') : t('тазалык')} />
                        </>}
                        <span className="house-sum-op">=</span>
                        <SumTerm value={fmt(hw.avg)} label={t('үй рейтинги')} strong />
                    </div>
                )}

                {series && <Trajectory weeks={series.weeks.filter(w => w.weekIndex <= weekIndex).slice(-10)} current={weekIndex} color={color} />}
                {canEditHouse(team.id) && (
                    <div className="mt-7 sm:hidden">
                        <button onClick={() => onEditHouse(team.id)} className="btn btn-primary w-full justify-center"><PenLine className="w-4 h-4" />  {team.submitted ? t('Өзгөртүү') : t('Киргизүү')}</button>
                    </div>
                )}
            </section>

            {/* The house's shared work: the mini-card and, in the weeks it
                counts, Тазалык — side by side. */}
            <div className={`grid grid-cols-1 gap-14 ${team.tazalyk !== undefined ? 'lg:grid-cols-[1.5fr_1fr] lg:gap-16' : ''}`}>
                <section className="min-w-0">
                    <div className="ledger-head">
                        <div>
                            <div className="eyebrow mb-2">{t('Командалык иштер')}</div>
                            <h2 className="section-title">{t('Мини-карта')}</h2>
                        </div>
                        {hw?.submitted && <span className="font-display text-[2.4rem] leading-none tabular" style={{ color: 'var(--gold)' }}>{fmt(hw.cardBonus)}<span className="text-[1rem]" style={{ color: 'var(--text-muted)' }}> / {MINI_CARD_POINTS * 7}</span></span>}
                    </div>
                    <div>
                        <ul className={`grid grid-cols-1 stagger ${team.tazalyk !== undefined ? '' : 'lg:grid-cols-2 lg:gap-x-12'}`}>
                            {cardKeys.map(key => {
                                const v = team.miniCard[key];
                                const pct = calculatePerformancePercentage(v.actual, v.target);
                                const done = pct >= 100;
                                return (
                                    <li key={key} className="ledger-row">
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[1rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{cardName(key)}</span>
                                            <span className="block eyebrow mt-1" style={{ letterSpacing: '0.18em', color: done ? 'var(--gold)' : 'var(--text-muted)' }}>{cardLabel(key)}{done && ' · ✓'}</span>
                                        </span>
                                        <Beads actual={v.actual} target={v.target} />
                                        <span className="w-[4.6rem] text-right font-display tabular leading-none text-[1.55rem]" style={{ color: done ? 'var(--gold)' : 'var(--text-primary)' }}>
                                            {v.actual}<span className="text-[0.85rem]" style={{ color: 'var(--text-muted)' }}> / {v.target}</span>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="text-[0.8rem] italic mt-3" style={{ color: 'var(--text-muted)' }}>{t('Ар бир иш 100% аткарылса {0} упай кошулат (эң көп {1}). Ашыкчасы эсептелбейт.', MINI_CARD_POINTS, MINI_CARD_POINTS * 7)}</p>
                    </div>
                </section>

                {team.tazalyk !== undefined && (
                    <section className="min-w-0">
                        <div className="ledger-head">
                            <div>
                                <div className="eyebrow mb-2">{t('Үйдүн тазалыгы')}</div>
                                <h2 className="section-title">{t('Тазалык')}</h2>
                            </div>
                            {team.tazalyk && <span className="font-display text-[2.4rem] leading-none tabular" style={{ color: 'var(--gold)' }}>{fmt(team.tazalyk.total)}<span className="text-[1rem]" style={{ color: 'var(--text-muted)' }}> / {TAZALYK_MAX}</span></span>}
                        </div>
                        {!team.tazalyk && <p className="text-[0.88rem] italic pt-4" style={{ color: 'var(--text-muted)' }}>{t('Бул апта азырынча бааланган жок.')}</p>}
                        {team.tazalyk && (
                            <div>
                                <ul>
                                    {Object.entries(team.tazalyk.scores).map(([item, v]) => (
                                        <li key={item} className="flex items-center justify-between gap-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                                            <span className="text-[0.95rem]" style={{ color: 'var(--text-secondary)' }}>{item}</span>
                                            <span className="inline-flex gap-[5px]" aria-label={`${v} / 5`}>
                                                {Array.from({ length: 5 }).map((_, k) => <span key={k} className="w-2.5 h-2.5 rotate-45" style={{ border: '1px solid var(--gold-dim)', backgroundColor: k < v ? 'var(--gold)' : 'transparent' }} />)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {team.tazalyk.note && <p className="text-[0.88rem] italic mt-3" style={{ color: 'var(--text-secondary)' }}>«{team.tazalyk.note}»</p>}
                                {team.tazalyk.by && <p className="text-[0.8rem] italic mt-1" style={{ color: 'var(--text-muted)' }}>{t('Баалаган: {0}', TAZ_WHO[team.tazalyk.by] ?? team.tazalyk.by)}</p>}
                            </div>
                        )}
                    </section>
                )}
            </div>

            {/* Members */}
            <section>
                <SectionHeader
                    eyebrow={team.name}
                    title={t('Мүчөлөрдүн рейтинги')}
                />

                {/* Phone & tablet: cards */}
                <Plate className="lg:hidden" tight>
                    <ol className="stagger">
                        {members.map(({ s, w }, i) => (
                            <li key={s.id} style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                                <MemberRow s={s} w={w} place={i + 1} weekIndex={weekIndex} onOpen={() => onOpenProfile(s.id)} />
                            </li>
                        ))}
                    </ol>
                </Plate>

                {/* Desktop: table */}
                <Plate className="hidden lg:block" tight>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ paddingTop: '1rem', paddingLeft: '1.5rem' }}>#</th>
                                <th style={{ paddingTop: '1rem' }}>{t('Аты')}</th>
                                {METRICS.map(m => <th key={m} style={{ paddingTop: '1rem', textAlign: 'center' }} title={metricName(m)}>{metricLabel(m)}</th>)}
                                <th style={{ paddingTop: '1rem', textAlign: 'right', paddingRight: '1.5rem' }}>{t('Упай')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(({ s, w }, i) => (
                                <tr key={s.id} className="row-link" onClick={() => onOpenProfile(s.id)}>
                                    <td className="font-display text-[1.1rem] tabular" style={{ paddingLeft: '1.5rem', color: i < 3 && !w.excused ? 'var(--gold)' : 'var(--text-muted)' }}>{w.excused ? '—' : pad2(i + 1)}</td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={s.name} role={w.member.role} photoUrl={w.member.photoUrl} size="sm" />
                                            <div className="min-w-0">
                                                <div className="font-display text-[1.15rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{w.member.name}</div>
                                                <div className="text-[0.75rem] italic" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[w.member.role]}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {METRICS.map(m => (
                                        <td key={m} style={{ textAlign: 'center', padding: '0.5rem 0.35rem' }} title={`${metricName(m)}: ${w.member.actual[m]} / ${w.member.target[m]}`}>
                                            {w.excused ? <span style={{ color: 'var(--text-muted)' }}>·</span> : <PctCell pct={w.pct[m]} />}
                                        </td>
                                    ))}
                                    <td className="font-display text-[1.3rem] tabular" style={{ textAlign: 'right', paddingRight: '1.5rem', color: 'var(--text-primary)' }}>{w.excused ? <span className="text-[0.8rem] italic" style={{ color: 'var(--text-muted)' }}>{t('себептүү')}</span> : fmt(w.score)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Plate>
            </section>

            {/* Where the house's points came from */}
            <section>
                <SectionHeader
                    eyebrow={t('{0}-апта', week.weekNumber)}
                    title={t('Үйдүн упайы кайдан келди')}
                    sub={breakdown ? t('Ар бир көрсөткүч боюнча бир адамга орточо упай ({0}). Үйдү эмне көтөрүп, эмне түшүрүп жатканын көрсөтөт.', t('{0} адам', breakdown.people)) : undefined}
                />
                {breakdown && hw?.submitted ? (
                    <div className="plate">
                        <PointsBreakdown
                            breakdown={breakdown}
                            totalLabel={t('Мүчөлөрдүн орточосу')}
                            planTotal={PLAN_SCORE}
                            note={m => {
                                const a = breakdown.atPlan[m];
                                return a.below.length === 0
                                    ? <span style={{ color: 'var(--success)' }}>{t('Баары планды аткарды ({0}/{1})', a.met, breakdown.people)}</span>
                                    : <span>{t('Планды аткаргандар: {0}/{1}', a.met, breakdown.people)}</span>;
                            }}
                            missedNote={breakdown.missed && breakdown.atPlan[breakdown.missed.row.metric].below.length > 0
                                ? t('Планга жетпегендер: {0}.', breakdown.atPlan[breakdown.missed.row.metric].below.join(', '))
                                : undefined}
                        />
                    </div>
                ) : (
                    <p className="italic" style={{ color: 'var(--text-muted)' }}>{t('Бул апта үчүн маалымат азырынча киргизиле элек.')}</p>
                )}
            </section>
            {team && <JattooHouse data={data} houseId={team.id} memberIds={team.members.map(m => m.id)} onOpenProfile={onOpenProfile} />}
        </div>
    );
};

const MemberRow: React.FC<{ s: MemberSeries; w: MemberWeek; place: number; weekIndex: number; onOpen: () => void }> = ({ s, w, place, weekIndex, onOpen }) => (
    <button onClick={onOpen} className="row-link w-full text-left py-4 px-1">
        <div className="flex items-center gap-3">
            <span className="w-7 font-display text-[1.35rem] tabular text-center" style={{ color: place <= 3 && !w.excused ? 'var(--gold)' : 'var(--text-muted)' }}>{w.excused ? '—' : place}</span>
            <Avatar name={s.name} role={w.member.role} photoUrl={w.member.photoUrl} size="md" />
            <div className="flex-1 min-w-0">
                <div className="font-display text-[1.25rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{w.member.name}</div>
                <div className="text-[0.78rem] italic" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[w.member.role]}</div>
            </div>
            <div className="text-right">
                <div className="font-display text-[1.7rem] leading-none tabular" style={{ color: 'var(--text-primary)' }}>{w.excused ? <span className="text-[0.85rem] italic" style={{ color: 'var(--text-muted)' }}>{t('себептүү')}</span> : fmt(w.score)}</div>
                <div className="mt-1 flex justify-end"><Movement delta={movement(s.weeks, weekIndex)} /></div>
            </div>
        </div>
        {!w.excused && (
            <div className="mt-3 pl-10">
                <Skyline items={METRICS.map(m => ({ label: metricLabel(m), title: metricName(m), pct: w.pct[m] }))} />
            </div>
        )}
    </button>
);

/** A member's share of the plan for one metric: the percent, and under it a
 *  hairline that fills to the plan (gold once the plan is met). */
const PctCell: React.FC<{ pct: number }> = ({ pct }) => {
    const met = pct >= 100;
    return (
        <span className="inline-flex flex-col items-center gap-1.5 w-[3.4rem]">
            <span className="tabular text-[0.9rem]" style={{ color: met ? 'var(--text-primary)' : perfColor(pct) }}>{Math.round(pct)}%</span>
            <span className="pct-track"><span style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: perfBarColor(pct) }} /></span>
        </span>
    );
};
