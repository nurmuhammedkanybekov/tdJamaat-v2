import React, { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Columns2, Share2, X } from 'lucide-react';
import type { DataFile } from '../types';
import type { Insights, MemberSeries } from '../utils/insights';
import { METRICS, PLAN_SCORE, ROLE_LABEL, movement, seasonSummary, streakUntil, weekOf } from '../utils/insights';
import type { Award } from '../utils/badges';
import { TIER_LABEL, bestPerfectStreak, groupAwards } from '../utils/badges';
import { useModal } from '../hooks/useModal';
import { Avatar } from './Avatar';
import { BadgeMedal } from './BadgeMedal';
import { Corners } from './Ornament';
import { ChartTooltip, Movement, ProgressBar } from './ui';
import { axisTick, perfColor } from '../utils/style';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

interface ProfileSheetProps {
    series: MemberSeries;
    data: DataFile;
    insights: Insights;
    awards: Award[];
    weekIndex: number;
    seasonName: string;
    seasonFinished: boolean;
    onShare: (card: 'week' | 'season') => void;
    onCompare: () => void;
    onClose: () => void;
}

const H3: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
    <div className="flex items-baseline justify-between gap-3 mb-5">
        <h3 className="font-display text-[1.6rem]" style={{ color: 'var(--text-primary)' }}>{children}</h3>
        {aside}
    </div>
);

export const ProfileSheet: React.FC<ProfileSheetProps> = ({ series, data, insights, awards, weekIndex, seasonName, seasonFinished, onShare, onCompare, onClose }) => {
    useModal(onClose);
    const [openBadge, setOpenBadge] = useState<string | null>(null);

    const current = weekOf(series.weeks, weekIndex) ?? series.weeks[series.weeks.length - 1];
    const counted = series.weeks.filter(w => w.submitted);
    const best = counted.reduce<typeof counted[number] | null>((b, w) => (!b || w.score > b.score ? w : b), null);
    const avg = counted.length ? counted.reduce((s, w) => s + w.score, 0) / counted.length : 0;
    const perfectNow = streakUntil(series.weeks, current.weekIndex, w => w.perfect);
    const perfectBest = bestPerfectStreak(series.weeks);
    const perfectCount = counted.filter(w => w.perfect).length;
    const grouped = useMemo(() => groupAwards(awards), [awards]);
    const chartData = counted.map(w => ({ week: `${w.weekNumber}`, score: Math.round(w.score * 10) / 10 }));
    const latestWeekIndex = data.weeks.length - 1;
    const summary = useMemo(() => seasonSummary(series, insights, data.weeks.length), [series, insights, data.weeks.length]);

    const stats = [
        { label: `${current.weekNumber}-апта`, value: current.submitted ? fmt(current.score) : '—', sub: current.rank ? `${current.rank}-орун` : 'маалымат жок', extra: <Movement delta={movement(series.weeks, current.weekIndex)} /> },
        { label: 'Эң мыкты апта', value: best ? fmt(best.score) : '—', sub: best ? `${best.weekNumber}-апта` : '' },
        { label: 'Орточо', value: counted.length ? fmt(avg) : '—', sub: `${counted.length} апта` },
        { label: 'Толук план', value: String(perfectCount), sub: perfectNow > 1 ? `катары менен ${perfectNow} апта` : perfectBest > 1 ? `рекорд: ${perfectBest} апта` : 'жолу' }
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 animate-fade-in"
            style={{ backgroundColor: 'color-mix(in oklab, #000 66%, transparent)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={series.name}
        >
            <div className="w-full max-w-[54rem] max-h-[94dvh] sm:max-h-[92vh] flex flex-col overflow-hidden rounded-t-[6px] sm:rounded-[3px] animate-sheet-up" style={{ backgroundColor: 'var(--page-plane)', boxShadow: 'var(--shadow-lift)', border: '1px solid var(--border-strong)' }}>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    {/* Portrait */}
                    <div className="relative px-6 sm:px-12 pt-10 sm:pt-12 pb-10 text-center">
                        <Corners inset={14} size={30} />
                        <button onClick={onClose} aria-label="Жабуу" className="absolute top-4 right-4 sm:top-5 sm:right-5 w-10 h-10 inline-flex items-center justify-center z-10 transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}>
                            <X className="w-5 h-5" strokeWidth={1.3} />
                        </button>
                        <div className="inline-block rounded-full p-[6px]" style={{ border: '1px solid var(--gold)' }}>
                            <Avatar name={series.name} role={series.role} photoUrl={series.photoUrl} size="2xl" />
                        </div>
                        <h2 className="font-display text-[2.4rem] sm:text-[3rem] leading-none mt-5" style={{ color: 'var(--text-primary)' }}>{series.name}</h2>
                        <div className="eyebrow mt-3">{ROLE_LABEL[series.role]} · {series.houseName}</div>

                        <dl className="profile-stats grid grid-cols-2 sm:grid-cols-4 mt-9 text-center">
                            {stats.map((s, i) => (
                                <div key={s.label} className="py-4 px-2 min-w-0" style={{ borderLeft: i > 0 ? '1px solid var(--border)' : undefined }}>
                                    <dt className="eyebrow truncate">{s.label}</dt>
                                    <dd className="flex items-baseline justify-center gap-2 mt-2">
                                        <span className="font-display text-[2rem] leading-none tabular" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-primary)' }}>{s.value}</span>
                                        {s.extra}
                                    </dd>
                                    <div className="text-[0.78rem] italic mt-1.5 truncate" style={{ color: 'var(--text-muted)' }}>{s.sub}</div>
                                </div>
                            ))}
                        </dl>
                        <div className="flex flex-wrap justify-center gap-2 mt-7">
                            <button className="btn btn-ghost" onClick={() => onShare('week')}><Share2 className="w-3.5 h-3.5" /> Аптаны бөлүшүү</button>
                            <button className="btn btn-ghost" onClick={() => onShare('season')}><Share2 className="w-3.5 h-3.5" /> Сезонду бөлүшүү</button>
                            <button className="btn btn-ghost" onClick={onCompare}><Columns2 className="w-3.5 h-3.5" /> Салыштыруу</button>
                        </div>
                    </div>

                    <div className="px-6 sm:px-12 pb-12 space-y-14">
                        {/* Trend */}
                        <section>
                            <H3 aside={<span className="text-[0.78rem] italic" style={{ color: 'var(--text-muted)' }}>пунктир — план 100% ({PLAN_SCORE})</span>}>Упай динамикасы</H3>
                            {chartData.length >= 2 ? (
                                <div className="-ml-3">
                                    <ResponsiveContainer width="100%" height={210}>
                                        <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="profileArea" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.16} />
                                                    <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid stroke="var(--gridline)" vertical={false} />
                                            <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => `${v}-апта`} />
                                            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
                                            <ReferenceLine y={PLAN_SCORE} stroke="var(--gold-dim)" strokeDasharray="2 5" />
                                            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} labelFormatter={v => `${v}-апта`} />
                                            <Area type="monotone" dataKey="score" name="Упай" stroke="var(--gold)" strokeWidth={1.4} fill="url(#profileArea)" dot={{ r: 2.5, fill: 'var(--page-plane)', stroke: 'var(--gold)', strokeWidth: 1.2 }} activeDot={{ r: 4 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="italic" style={{ color: 'var(--text-muted)' }}>Динамика эки аптадан кийин көрүнөт.</p>
                            )}
                        </section>

                        {/* Season so far — "Wrapped" */}
                        <section>
                            <H3 aside={<span className="text-[0.78rem] italic" style={{ color: 'var(--text-muted)' }}>{seasonFinished ? 'сезон аяктады' : 'азырынча'}</span>}>Сезон {seasonName}</H3>
                            <div className="grid grid-cols-2 sm:grid-cols-3">
                                {[
                                    ['Орун', summary.rank ? `${summary.rank} / ${summary.of}` : '—'],
                                    ['Орточо упай', fmt(summary.average)],
                                    ['Эң мыкты апта', summary.best ? `${fmt(summary.best.score)}` : '—'],
                                    ['Активдүү апта', `${summary.weeksActive} / ${summary.weeksTotal}`],
                                    ['Толук план', String(summary.perfectWeeks)],
                                    ['Өсүш', summary.growth === null ? '—' : `${summary.growth > 0 ? '+' : ''}${fmt(summary.growth)}`]
                                ].map(([label, value], i) => (
                                    <div key={label} className="py-4 px-3 text-center" style={{ borderTop: i >= 2 ? '1px solid var(--border)' : undefined, borderLeft: i % 2 === 1 ? '1px solid var(--border)' : undefined }}>
                                        <div className="eyebrow">{label}</div>
                                        <div className="font-display text-[1.8rem] leading-none mt-2 tabular" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-primary)' }}>{value}</div>
                                    </div>
                                ))}
                            </div>
                            {summary.best && <p className="text-[0.82rem] italic text-center mt-3" style={{ color: 'var(--text-muted)' }}>Эң мыкты апта — {summary.best.weekNumber}-апта. Орун сезондогу орточо упай боюнча.</p>}
                        </section>

                        {/* Targets */}
                        <section>
                            <H3 aside={<span className="text-[0.78rem] italic" style={{ color: 'var(--text-muted)' }}>{current.perfect ? 'бардык план аткарылды' : 'факт / план'}</span>}>{current.weekNumber}-апта: планга карата</H3>
                            {current.submitted ? (
                                <div className="grid grid-cols-1 gap-x-12 gap-y-5 sm:grid-cols-2">
                                    {METRICS.map(m => {
                                        const pct = current.pct[m];
                                        return (
                                            <div key={m}>
                                                <div className="flex items-baseline gap-3 mb-2">
                                                    <span className="text-[0.95rem]" style={{ color: 'var(--text-primary)' }}>{m}</span>
                                                    <span className="leader" />
                                                    <span className="text-[0.85rem] tabular" style={{ color: 'var(--text-muted)' }}>{current.member.actual[m]} / {current.member.target[m]}</span>
                                                    <span className="font-display text-[1.05rem] w-12 text-right tabular" style={{ color: perfColor(pct) }}>{Math.round(pct)}%</span>
                                                </div>
                                                <ProgressBar pct={pct} />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="italic" style={{ color: 'var(--text-muted)' }}>Бул апта үчүн маалымат азырынча киргизиле элек.</p>
                            )}
                        </section>

                        {/* Medals */}
                        <section>
                            <H3>Сыйлыктар</H3>
                            {grouped.length === 0 ? (
                                <p className="italic" style={{ color: 'var(--text-muted)' }}>Азырынча сыйлык жок — биринчиси жакында болот.</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-8">
                                        {grouped.map(g => (
                                            <button key={g.def.id} onClick={() => setOpenBadge(openBadge === g.def.id ? null : g.def.id)} aria-expanded={openBadge === g.def.id} className="group flex flex-col items-center text-center">
                                                <span className="transition-transform duration-500 group-hover:scale-[1.04]">
                                                    <BadgeMedal icon={g.def.icon} tier={g.def.tier} size={104} label={g.def.name} count={g.awards.length} />
                                                </span>
                                                <span className="font-display text-[1.1rem] mt-2 leading-tight" style={{ color: openBadge === g.def.id ? 'var(--gold)' : 'var(--text-primary)' }}>{g.def.name}</span>
                                                <span className="eyebrow mt-1">{TIER_LABEL[g.def.tier]}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {openBadge && (() => {
                                        const g = grouped.find(x => x.def.id === openBadge);
                                        if (!g) return null;
                                        return (
                                            <div className="mt-8 pt-6 animate-fade-up" style={{ borderTop: '1px solid var(--border)' }}>
                                                <p className="italic text-[0.9rem] mb-3" style={{ color: 'var(--text-secondary)' }}>{g.def.rule}</p>
                                                <ul className="space-y-1.5 text-[0.9rem]" style={{ color: 'var(--text-primary)' }}>
                                                    {g.awards.map((a, i) => <li key={i} className="flex gap-3"><span style={{ color: 'var(--gold)' }}>—</span>{a.reason}</li>)}
                                                </ul>
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                        </section>

                        {/* History */}
                        <section>
                            <H3 aside={perfectBest >= 2 ? <span className="text-[0.78rem] italic" style={{ color: 'var(--text-muted)' }}>эң узун серия: {perfectBest} апта</span> : undefined}>Апталар</H3>
                            <ol>
                                {[...series.weeks].reverse().map(w => (
                                    <li key={w.weekIndex} className="flex items-baseline gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                                        <span className="text-[0.95rem] w-24" style={{ color: w.weekIndex === current.weekIndex ? 'var(--gold)' : 'var(--text-primary)' }}>{w.weekNumber}-апта</span>
                                        <span className="text-[0.8rem] italic flex-1" style={{ color: 'var(--text-muted)' }}>
                                            {w.rank ? `${w.rank}-орун` : 'маалымат жок'}{w.perfect ? ' · толук план' : ''}{w.weekIndex === latestWeekIndex ? ' · акыркы' : ''}
                                        </span>
                                        <Movement delta={movement(series.weeks, w.weekIndex)} />
                                        <span className="font-display text-[1.3rem] w-14 text-right tabular" style={{ color: 'var(--text-primary)' }}>{w.submitted ? fmt(w.score) : '—'}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};
