import React, { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Flame, Trophy, X } from 'lucide-react';
import type { DataFile } from '../types';
import type { Insights, MemberSeries } from '../utils/insights';
import { METRICS, PLAN_SCORE, ROLE_LABEL, movement, streakUntil, weekOf } from '../utils/insights';
import type { Award } from '../utils/badges';
import { TIER_LABEL, bestPerfectStreak, groupAwards } from '../utils/badges';
import { useModal } from '../hooks/useModal';
import { Avatar } from './Avatar';
import { BadgeMedal } from './BadgeMedal';
import { ChartTooltip, Movement, ProgressBar } from './ui';
import { axisTick, perfColor } from '../utils/style';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

interface ProfileSheetProps {
    series: MemberSeries;
    data: DataFile;
    insights: Insights;
    awards: Award[];
    weekIndex: number;
    onClose: () => void;
}

export const ProfileSheet: React.FC<ProfileSheetProps> = ({ series, data, awards, weekIndex, onClose }) => {
    useModal(onClose);
    const [openBadge, setOpenBadge] = useState<string | null>(null);

    // Show the selected week if they were on a roster then, else their latest.
    const current = weekOf(series.weeks, weekIndex) ?? series.weeks[series.weeks.length - 1];
    const counted = series.weeks.filter(w => w.submitted);
    const best = counted.reduce<typeof counted[number] | null>((b, w) => (!b || w.score > b.score ? w : b), null);
    const avg = counted.length ? counted.reduce((s, w) => s + w.score, 0) / counted.length : 0;
    const perfectNow = streakUntil(series.weeks, current.weekIndex, w => w.perfect);
    const perfectBest = bestPerfectStreak(series.weeks);
    const perfectCount = counted.filter(w => w.perfect).length;
    const grouped = useMemo(() => groupAwards(awards), [awards]);

    const chartData = counted.map(w => ({ week: `${w.weekNumber}-апта`, score: Math.round(w.score * 10) / 10 }));
    const latestWeekIndex = data.weeks.length - 1;

    const stats = [
        { label: `${current.weekNumber}-апта`, value: current.submitted ? fmt(current.score) : '—', sub: current.rank ? `${current.rank}-орун` : 'маалымат жок', extra: <Movement delta={movement(series.weeks, current.weekIndex)} size="md" onDark /> },
        { label: 'Эң мыкты апта', value: best ? fmt(best.score) : '—', sub: best ? `${best.weekNumber}-апта` : '' },
        { label: 'Орточо', value: counted.length ? fmt(avg) : '—', sub: `${counted.length} апта` },
        { label: 'Толук план', value: String(perfectCount), sub: perfectNow > 0 ? `серия: ${perfectNow} апта` : perfectBest > 0 ? `рекорд: ${perfectBest}` : 'апта' }
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 animate-fade-in"
            style={{ backgroundColor: 'color-mix(in oklab, #0b141b 55%, transparent)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={series.name}
        >
            <div className="w-full max-w-[52rem] max-h-[94dvh] sm:max-h-[92vh] flex flex-col overflow-hidden rounded-t-[18px] sm:rounded-[16px] animate-sheet-up" style={{ backgroundColor: 'var(--page-plane)', boxShadow: 'var(--shadow-lift)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    {/* Profile hero */}
                    <div className="hero px-4 sm:px-8 pt-5 sm:pt-7 pb-6">
                        <button onClick={onClose} aria-label="Жабуу" className="btn btn-hero btn-icon rounded-full absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                            <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-4 sm:gap-5 pr-10">
                            <div className="rounded-full p-[3px] flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--tier-gold-1), var(--tier-gold-2))' }}>
                                <Avatar name={series.name} role={series.role} photoUrl={series.photoUrl} size="2xl" />
                            </div>
                            <div className="min-w-0">
                                <div className="eyebrow" style={{ color: 'var(--gold-bright)' }}>{ROLE_LABEL[series.role]} · {series.houseName}</div>
                                <h2 className="font-display font-bold text-[1.9rem] sm:text-[2.5rem] leading-[1.05] mt-1" style={{ color: 'var(--hero-ink)' }}>{series.name}</h2>
                                {grouped.length > 0 && (
                                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                                        {grouped.slice(0, 6).map(g => <BadgeMedal key={g.def.id} icon={g.def.icon} tier={g.def.tier} size={30} title={g.def.name} />)}
                                        {grouped.length > 6 && <span className="text-[0.75rem] ml-1" style={{ color: 'var(--hero-muted)' }}>+{grouped.length - 6}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <dl className="grid grid-cols-2 sm:grid-cols-4 mt-6 rounded-[12px] overflow-hidden" style={{ border: '1px solid rgba(233,205,150,0.18)', background: 'rgba(255,255,255,0.04)' }}>
                            {stats.map((s, i) => (
                                <div key={s.label} className="px-3 sm:px-4 py-3 min-w-0" style={{ borderLeft: i % 2 === 1 || i > 0 ? '1px solid rgba(233,205,150,0.12)' : undefined, borderTop: i >= 2 ? '1px solid rgba(233,205,150,0.12)' : undefined }}>
                                    <dt className="eyebrow truncate" style={{ color: 'var(--hero-muted)' }}>{s.label}</dt>
                                    <dd className="flex items-baseline gap-2 mt-1">
                                        <span className="font-display font-bold text-[1.7rem] leading-none tabular" style={{ color: 'var(--hero-ink)' }}>{s.value}</span>
                                        {s.extra}
                                    </dd>
                                    <div className="text-[0.72rem] mt-1 truncate" style={{ color: 'var(--hero-muted)' }}>{s.sub}</div>
                                </div>
                            ))}
                        </dl>
                    </div>

                    <div className="px-4 sm:px-8 py-6 space-y-8">
                        {/* Trend */}
                        <section>
                            <div className="flex items-baseline justify-between mb-3">
                                <h3 className="font-display font-bold text-[1.45rem]" style={{ color: 'var(--text-primary)' }}>Упай динамикасы</h3>
                                <span className="text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>– – план 100% = {PLAN_SCORE}</span>
                            </div>
                            {chartData.length >= 2 ? (
                                <div className="card p-2 sm:p-4">
                                    <ResponsiveContainer width="100%" height={220}>
                                        <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="profileArea" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                                                    <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid stroke="var(--gridline)" vertical={false} />
                                            <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} />
                                            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
                                            <ReferenceLine y={PLAN_SCORE} stroke="var(--text-muted)" strokeDasharray="4 4" />
                                            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
                                            <Area type="monotone" dataKey="score" name="Упай" stroke="var(--gold)" strokeWidth={2.4} fill="url(#profileArea)" dot={{ r: 3.5, fill: 'var(--surface)', stroke: 'var(--gold)', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="text-[0.88rem] card card-pad" style={{ color: 'var(--text-muted)' }}>Динамика эки аптадан кийин көрүнөт.</p>
                            )}
                        </section>

                        {/* Targets this week */}
                        <section>
                            <h3 className="font-display font-bold text-[1.45rem] mb-1" style={{ color: 'var(--text-primary)' }}>{current.weekNumber}-апта: планга карата</h3>
                            <p className="text-[0.8rem] mb-3" style={{ color: 'var(--text-muted)' }}>{current.perfect ? 'Бул аптада бардык план аткарылды!' : current.submitted ? 'Ар бир көрсөткүч: факт / план.' : 'Бул апта үчүн маалымат азырынча киргизиле элек.'}</p>
                            <div className="card card-pad grid gap-x-8 gap-y-4 sm:grid-cols-2">
                                {METRICS.map(m => {
                                    const pct = current.pct[m];
                                    return (
                                        <div key={m}>
                                            <div className="flex items-baseline justify-between gap-2 mb-1.5">
                                                <span className="font-bold text-[0.9rem]" style={{ color: 'var(--text-primary)' }}>{m}</span>
                                                <span className="text-[0.8rem] tabular" style={{ color: 'var(--text-muted)' }}>
                                                    {current.member.actual[m]} / {current.member.target[m]}
                                                    <b className="ml-2" style={{ color: perfColor(pct) }}>{Math.round(pct)}%</b>
                                                </span>
                                            </div>
                                            <ProgressBar pct={pct} />
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Awards */}
                        <section>
                            <h3 className="font-display font-bold text-[1.45rem] mb-3" style={{ color: 'var(--text-primary)' }}>Сыйлыктар</h3>
                            {grouped.length === 0 ? (
                                <p className="card card-pad text-[0.88rem]" style={{ color: 'var(--text-muted)' }}>Азырынча сыйлык жок — биринчиси жакында болот!</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {grouped.map(g => {
                                        const open = openBadge === g.def.id;
                                        return (
                                            <button
                                                key={g.def.id}
                                                onClick={() => setOpenBadge(open ? null : g.def.id)}
                                                aria-expanded={open}
                                                className={`card p-3 text-center flex flex-col items-center transition-shadow hover:shadow-[var(--shadow-lift)] ${open ? 'col-span-2 sm:col-span-3 text-left items-stretch' : ''}`}
                                            >
                                                <div className={`flex items-center gap-3 ${open ? '' : 'flex-col'}`}>
                                                    <BadgeMedal icon={g.def.icon} tier={g.def.tier} size={open ? 64 : 70} count={g.awards.length} />
                                                    <div className={open ? 'min-w-0' : ''}>
                                                        <div className="font-display font-bold text-[1.1rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{g.def.name}</div>
                                                        <div className="text-[0.7rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>{TIER_LABEL[g.def.tier]}{g.awards.length > 1 ? ` · ${g.awards.length} жолу` : ''}</div>
                                                        {open && <p className="text-[0.82rem] mt-1.5" style={{ color: 'var(--text-secondary)' }}>{g.def.rule}</p>}
                                                    </div>
                                                </div>
                                                {open && (
                                                    <ul className="mt-3 space-y-1.5 text-[0.82rem]" style={{ color: 'var(--text-secondary)' }}>
                                                        {g.awards.map((a, i) => (
                                                            <li key={i} className="flex gap-2"><Trophy className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--gold)' }} />{a.reason}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Weekly history */}
                        <section>
                            <h3 className="font-display font-bold text-[1.45rem] mb-3" style={{ color: 'var(--text-primary)' }}>Апталар</h3>
                            <div className="card overflow-hidden">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ paddingTop: '0.8rem' }}>Апта</th>
                                            <th style={{ paddingTop: '0.8rem', textAlign: 'center' }}>Орун</th>
                                            <th style={{ paddingTop: '0.8rem', textAlign: 'center' }}>План</th>
                                            <th style={{ paddingTop: '0.8rem', textAlign: 'right' }}>Упай</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...series.weeks].reverse().map(w => (
                                            <tr key={w.weekIndex} style={w.weekIndex === current.weekIndex ? { backgroundColor: 'var(--gold-soft)' } : undefined}>
                                                <td className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                                    {w.weekNumber}-апта{w.weekIndex === latestWeekIndex && <span className="ml-2 text-[0.7rem] font-normal" style={{ color: 'var(--text-muted)' }}>акыркы</span>}
                                                </td>
                                                <td className="tabular" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                    <span className="inline-flex items-center gap-1.5">{w.rank ?? '—'} <Movement delta={movement(series.weeks, w.weekIndex)} /></span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {w.perfect ? <CheckCircle2 className="w-4 h-4 inline" style={{ color: 'var(--success)' }} aria-label="Толук план" /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                </td>
                                                <td className="font-display font-bold text-[1.1rem] tabular" style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{w.submitted ? fmt(w.score) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {perfectBest >= 2 && (
                                <p className="text-[0.8rem] mt-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                    <Flame className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} /> Эң узун толук план сериясы: <b style={{ color: 'var(--text-primary)' }}>{perfectBest} апта</b>
                                </p>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};
