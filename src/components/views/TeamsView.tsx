import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, PenLine } from 'lucide-react';
import type { DataFile } from '../../types';
import type { Insights, MemberSeries, MemberWeek } from '../../utils/insights';
import { METRICS, PLAN_SCORE, movement, ROLE_LABEL, weekOf } from '../../utils/insights';
import { TEAM_COLORS, calculatePerformancePercentage } from '../../utils/scoring';
import { Avatar } from '../Avatar';
import { CountUp } from '../motion';
import { Movement, ProgressBar, SectionHeader, Sparkline } from '../ui';
import { perfColor, heatBg } from '../../utils/style';
import { t } from '../../i18n';
import { houseBreakdown } from '../../utils/breakdown';
import { PointsBreakdown } from '../PointsBreakdown';
import { cardLabel, cardName, metricLabel, metricName } from '../../utils/metrics';

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
            {/* House switcher */}
            <div className="-mx-4 sm:mx-0">
                <div className="scroll-row scroll-fade flex gap-2 px-4 sm:px-0 sm:flex-wrap pb-1" role="tablist" aria-label={t('Үйлөр')}>
                    {week.teams.map(it => {
                        const hs = insights.houses.get(it.id);
                        const c = TEAM_COLORS[(hs?.colorIndex ?? 0) % TEAM_COLORS.length];
                        const active = it.id === team.id;
                        return (
                            <button key={it.id} role="tab" aria-selected={active} onClick={() => setHouseId(it.id)} className={`chip ${active ? 'is-active' : ''}`} style={{ padding: '0.5rem 0.95rem', fontSize: '0.85rem' }}>
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c, boxShadow: active ? `0 0 0 3px color-mix(in oklab, ${c} 22%, transparent)` : undefined }} />
                                {it.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* House summary, in the house's own colour. */}
            <section key={team.id} className="card overflow-hidden animate-view-in" style={{ borderTop: `3px solid ${color}`, backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${color} 7%, transparent), transparent 70%)` }}>
                <div className="card-pad flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <div className="flex-1 min-w-0">
                        <div className="eyebrow flex items-center gap-2" style={{ color: 'var(--gold)' }}>{t('{0} · {1}-апта', hw?.rank ? t('{0}-орун', hw.rank) : t('Рейтингде жок'), week.weekNumber)}</div>
                        <h2 className="font-display font-bold text-[2.2rem] sm:text-[2.6rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{team.name}</h2>
                        <div className="flex items-center gap-3 mt-1 text-[0.82rem] flex-wrap" style={{ color: 'var(--text-muted)' }}>
                            <span>{t('{0} адам{1}', team.members.length, hw && hw.excusedCount > 0 ? t(' · {0} себептүү', hw.excusedCount) : '')}</span>
                            {team.submitted
                                ? <span className="inline-flex items-center gap-1" style={{ color: 'var(--success)' }}><CheckCircle2 className="w-3.5 h-3.5" />  {t('маалымат киргизилди')}</span>
                                : <span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />  {t('маалымат күтүлүүдө')}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-5 sm:gap-7">
                        <div>
                            <div className="eyebrow">{t('Үй рейтинги')}</div>
                            <div className="flex items-baseline gap-2 mt-1">
                                {hw?.submitted
                                    ? <CountUp key={`${team.id}-${weekIndex}`} value={hw.avg} className="font-display text-[2.6rem] leading-none tabular gold-sheen" />
                                    : <span className="font-display text-[2.6rem] leading-none tabular" style={{ color: 'var(--gold)' }}>—</span>}
                                {series && <Movement delta={movement(series.weeks, weekIndex)} size="md" />}
                            </div>
                            {hw?.submitted && (
                                <div className="text-[0.78rem] italic mt-1.5 tabular" style={{ color: 'var(--text-muted)' }}>{t('орточо {0} + мини-карта {1}', fmt(hw.memberAvg), fmt(hw.cardBonus))}</div>
                            )}
                        </div>
                        {series && <Sparkline values={series.weeks.filter(w => w.weekIndex <= weekIndex && w.submitted).map(w => w.avg)} color={color} width={110} height={40} />}
                    </div>
                    {canEditHouse(team.id) && (
                        <button onClick={() => onEditHouse(team.id)} className="btn btn-primary self-start sm:self-center">
                            <PenLine className="w-4 h-4" />  {t('Өзгөртүү')}
                        </button>
                    )}
                </div>
            </section>

            {/* Mini card */}
            <section>
                <SectionHeader eyebrow={t('Командалык иштер')} title={t('Мини-карта')} />
                {/* One engraved plate with hairline cells, not seven separate boxes. The
                    outer edges of the hairlines are clipped by the card. */}
                <div className="card overflow-hidden">
                    <div className="grid grid-cols-2 min-[460px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 stagger">
                        {cardKeys.map(key => {
                            const v = team.miniCard[key];
                            const pct = calculatePerformancePercentage(v.actual, v.target);
                            const done = pct >= 100;
                            return (
                                <div key={key} className="p-3.5 sm:p-5 flex flex-col" style={{ boxShadow: '1px 0 0 var(--border), 0 1px 0 var(--border)' }}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="eyebrow" style={{ letterSpacing: '0.18em', color: done ? 'var(--gold)' : 'var(--text-muted)' }} title={cardName(key)}>{cardLabel(key)}</span>
                                        {done && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--gold)' }} aria-hidden="true" />}
                                    </div>
                                    <div className="font-display text-[1.75rem] sm:text-[2rem] tabular leading-none mt-2.5 sm:mt-3" style={{ color: done ? 'var(--gold)' : 'var(--text-primary)' }}>
                                        {v.actual}<span className="text-[1rem]" style={{ color: 'var(--text-muted)' }}> / {v.target}</span>
                                    </div>
                                    <div className="mt-auto pt-3 sm:pt-4"><ProgressBar pct={pct} height={2} /></div>
                                    <div className="text-[0.72rem] mt-1.5 tabular" style={{ color: perfColor(pct) }}>{Math.round(pct)}%</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Members */}
            <section>
                <SectionHeader
                    eyebrow={team.name}
                    title={t('Мүчөлөрдүн рейтинги')}
                />

                {/* Phone & tablet: cards */}
                <ol className="lg:hidden space-y-3 stagger">
                    {members.map(({ s, w }, i) => (
                        <li key={s.id}>
                            <MemberCard s={s} w={w} place={i + 1} weekIndex={weekIndex} onOpen={() => onOpenProfile(s.id)} />
                        </li>
                    ))}
                </ol>

                {/* Desktop: table */}
                <div className="hidden lg:block card overflow-hidden">
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
                                    <td className="font-display font-bold text-[1.1rem] tabular" style={{ paddingLeft: '1.5rem', color: i < 3 && !w.excused ? 'var(--gold)' : 'var(--text-muted)' }}>{w.excused ? '—' : pad2(i + 1)}</td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={s.name} role={w.member.role} photoUrl={w.member.photoUrl} size="sm" />
                                            <div className="min-w-0">
                                                <div className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{w.member.name}</div>
                                                <div className="text-[0.75rem] italic" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[w.member.role]}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {METRICS.map(m => (
                                        <td key={m} style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }} title={`${w.member.actual[m]} / ${w.member.target[m]}`}>
                                            <span className="inline-block min-w-[3.6rem] px-2 py-1.5 rounded-md tabular text-[0.86rem] font-medium" style={{ backgroundColor: heatBg(w.pct[m]), color: w.pct[m] >= 100 ? 'var(--text-primary)' : perfColor(w.pct[m]) }}>
                                                {Math.round(w.pct[m])}%
                                            </span>
                                        </td>
                                    ))}
                                    <td className="font-display font-bold text-[1.3rem] tabular" style={{ textAlign: 'right', paddingRight: '1.5rem', color: 'var(--text-primary)' }}>{w.excused ? <span className="text-[0.8rem] italic" style={{ color: 'var(--text-muted)' }}>{t('себептүү')}</span> : fmt(w.score)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Where the house's points came from */}
            <section>
                <SectionHeader
                    eyebrow={t('{0}-апта', week.weekNumber)}
                    title={t('Үйдүн упайы кайдан келди')}
                    sub={breakdown ? t('Бир адамга орточо, {0}', t('{0} адам', breakdown.people)) : undefined}
                />
                {breakdown && hw?.submitted ? (
                    <div className="card card-pad">
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
        </div>
    );
};

const MemberCard: React.FC<{ s: MemberSeries; w: MemberWeek; place: number; weekIndex: number; onOpen: () => void }> = ({ s, w, place, weekIndex, onOpen }) => (
    <button onClick={onOpen} className="card lift w-full text-left p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
            <span className="w-6 font-display font-bold text-[1.1rem] tabular" style={{ color: place <= 3 && !w.excused ? 'var(--gold)' : 'var(--text-muted)' }}>{w.excused ? '—' : pad2(place)}</span>
            <Avatar name={s.name} role={w.member.role} photoUrl={w.member.photoUrl} size="md" />
            <div className="flex-1 min-w-0">
                <div className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{w.member.name}</div>
                <div className="text-[0.75rem] italic" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[w.member.role]}</div>
            </div>
            <div className="text-right">
                <div className="font-display font-bold text-[1.5rem] leading-none tabular" style={{ color: 'var(--text-primary)' }}>{w.excused ? <span className="text-[0.8rem] italic" style={{ color: 'var(--text-muted)' }}>{t('себептүү')}</span> : fmt(w.score)}</div>
                <div className="mt-1 flex justify-end"><Movement delta={movement(s.weeks, weekIndex)} /></div>
            </div>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-x-2 gap-y-2.5 mt-3.5 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            {METRICS.map(m => (
                <div key={m} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-1 text-[0.72rem]">
                        <span style={{ color: 'var(--text-muted)' }} title={metricName(m)}>{metricLabel(m)}</span>
                        <span className="font-bold tabular" style={{ color: perfColor(w.pct[m]) }}>{Math.round(w.pct[m])}%</span>
                    </div>
                    <div className="mt-1"><ProgressBar pct={w.pct[m]} height={3} /></div>
                </div>
            ))}
        </div>
    </button>
);
