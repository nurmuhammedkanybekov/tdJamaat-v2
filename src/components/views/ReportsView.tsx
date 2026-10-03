import React, { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronLeft, ChevronRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useIsPhone } from '../../hooks/useMediaQuery';
import type { DataFile } from '../../types';
import { calculateHouseRating, TEAM_COLORS } from '../../utils/scoring';
import { ChartTooltip, SectionHeader } from '../ui';
import { axisTick, scoreDomain } from '../../utils/style';

interface ReportsViewProps {
    data: DataFile;
    selectedPeriod: number;
    setSelectedPeriod: (p: number) => void;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const pad2 = (n: number) => String(n).padStart(2, '0');
const TOTAL_FROM_WEEK = 5;

// A house's rating for one week (same rule as everywhere: member average +
// mini-card bonus; a week the house hasn't filled counts its roster at 0).
const weekAvg = (team: DataFile['weeks'][number]['teams'][number]) =>
    team.members.length ? calculateHouseRating(team) : null;

type Trend = 'up' | 'down' | 'stable';
const TREND: Record<Trend, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    up: { label: 'Өсүш', icon: TrendingUp, color: 'var(--success)' },
    down: { label: 'Төмөндөш', icon: TrendingDown, color: 'var(--danger)' },
    stable: { label: 'Туруктуу', icon: Minus, color: 'var(--accent)' }
};

export const ReportsView: React.FC<ReportsViewProps> = ({ data, selectedPeriod, setSelectedPeriod }) => {
    const [mode, setMode] = useState<'period' | 'total'>('period');
    return (
        <div className="space-y-6">
            <div className="flex w-full sm:inline-flex sm:w-auto p-1 rounded-full" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} role="tablist">
                {([['period', '4-апталык отчёт'], ['total', 'Жалпы рейтинг']] as const).map(([k, label]) => (
                    <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`chip flex-1 sm:flex-none justify-center whitespace-nowrap ${mode === k ? 'is-active' : ''}`} style={{ border: 'none', padding: '0.5rem 0.6rem', letterSpacing: '0.1em' }}>{label}</button>
                ))}
            </div>
            {mode === 'period' ? <PeriodReport data={data} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} /> : <TotalReport data={data} />}
        </div>
    );
};

const PeriodReport: React.FC<ReportsViewProps> = ({ data, selectedPeriod, setSelectedPeriod }) => {
    const isPhone = useIsPhone();
    const totalPeriods = Math.max(1, Math.ceil(data.weeks.length / 4));
    const period = Math.min(selectedPeriod, totalPeriods - 1);
    const weeks = data.weeks.slice(period * 4, period * 4 + 4);
    const first = weeks[0]?.weekNumber ?? 1;
    const last = weeks[weeks.length - 1]?.weekNumber ?? first;
    const teams = data.weeks[0]?.teams ?? [];

    const rows = teams.map((t, colorIndex) => {
        const scores = weeks.map(w => w.teams.find(x => x.id === t.id)).map(x => (x ? weekAvg(x) : null)).filter((x): x is number => x !== null);
        const average = scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const firstHalf = scores.slice(0, Math.ceil(scores.length / 2)).reduce((a, b) => a + b, 0);
        const secondHalf = scores.slice(Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0);
        const trend: Trend = secondHalf > firstHalf ? 'up' : secondHalf < firstHalf ? 'down' : 'stable';
        return { id: t.id, name: t.name, colorIndex, scores, average, best: scores.length ? Math.max(...scores) : 0, worst: scores.length ? Math.min(...scores) : 0, trend };
    }).sort((a, b) => b.average - a.average);

    const rising = rows.filter(r => r.trend === 'up' && r.scores.length > 1).sort((a, b) => (b.scores.at(-1)! - b.scores[0]) - (a.scores.at(-1)! - a.scores[0]))[0];
    const chartData = weeks.map(w => {
        const p: Record<string, number | string | null> = { week: `${w.weekNumber}-апта` };
        w.teams.forEach(t => { p[t.id] = weekAvg(t); });
        return p;
    });

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="card px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                <button className="btn btn-ghost btn-icon rounded-full" onClick={() => setSelectedPeriod(Math.max(0, period - 1))} disabled={period === 0} aria-label="Мурунку мезгил" style={{ opacity: period === 0 ? 0.35 : 1 }}>
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <div className="eyebrow">{period + 1}-мезгил / {totalPeriods}</div>
                    <div className="font-display font-bold text-[1.6rem] tabular" style={{ color: 'var(--text-primary)' }}>{first}–{last}-апталар</div>
                </div>
                <button className="btn btn-ghost btn-icon rounded-full" onClick={() => setSelectedPeriod(Math.min(totalPeriods - 1, period + 1))} disabled={period >= totalPeriods - 1} aria-label="Кийинки мезгил" style={{ opacity: period >= totalPeriods - 1 ? 0.35 : 1 }}>
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3 stagger">
                {[
                    { label: 'Эң мыкты үй', value: rows[0]?.name ?? '—', sub: rows[0] ? `Рейтинг: ${rows[0].average}` : '' },
                    { label: 'Эң тез өсүү', value: rising?.name ?? '—', sub: rising ? `${rising.scores[0]} → ${rising.scores.at(-1)}` : 'Өсүш тенденциясы жок' },
                    { label: 'Мезгил', value: `${weeks.length} апта`, sub: `${rows.length} үй катышты` }
                ].map(s => (
                    <div key={s.label} className="card card-pad">
                        <div className="eyebrow">{s.label}</div>
                        <div className="font-display font-bold text-[1.6rem] mt-1 truncate" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                        <div className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <section className="card overflow-hidden">
                <div className="card-pad pb-0 sm:pb-0"><SectionHeader eyebrow="Үй рейтинги боюнча" title="Мезгилдин рейтинги" /></div>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: '1.25rem' }}>#</th>
                                <th>Үй</th>
                                {weeks.map(w => <th key={w.weekNumber} className="hidden md:table-cell" style={{ textAlign: 'center' }}>{w.weekNumber}-апта</th>)}
                                <th style={{ textAlign: 'right' }}>Рейтинг</th>
                                <th className="hidden sm:table-cell" style={{ textAlign: 'right' }}>Эң жакшы</th>
                                <th className="hidden sm:table-cell" style={{ textAlign: 'right' }}>Эң начар</th>
                                <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>Тенденция</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => {
                                const T = TREND[r.trend];
                                return (
                                    <tr key={r.id}>
                                        <td className="font-display font-bold text-[1.1rem] tabular" style={{ paddingLeft: '1.25rem', color: i === 0 ? 'var(--gold)' : 'var(--text-muted)' }}>{pad2(i + 1)}</td>
                                        <td className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                            <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: TEAM_COLORS[r.colorIndex % TEAM_COLORS.length] }} />{r.name}</span>
                                        </td>
                                        {weeks.map((w, k) => <td key={w.weekNumber} className="hidden md:table-cell tabular" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{r.scores[k] !== undefined ? r.scores[k].toFixed(1) : '—'}</td>)}
                                        <td className="font-display font-bold text-[1.2rem] tabular" style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{r.average}</td>
                                        <td className="hidden sm:table-cell tabular font-bold" style={{ textAlign: 'right', color: 'var(--success)' }}>{r.best}</td>
                                        <td className="hidden sm:table-cell tabular font-bold" style={{ textAlign: 'right', color: 'var(--danger)' }}>{r.worst}</td>
                                        <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                                            <span className="inline-flex items-center gap-1 font-bold text-[0.82rem]" style={{ color: T.color }} title={T.label}>
                                                <T.icon className="w-4 h-4" /><span className="hidden sm:inline">{T.label}</span>
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {weeks.length > 1 && (
                <section className="card card-pad">
                    <SectionHeader title={`${first}–${last}-апталар боюнча график`} />
                    <div className="-ml-3 sm:ml-0">
                        <ResponsiveContainer width="100%" height={isPhone ? 260 : 340}>
                            <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke="var(--gridline)" vertical={false} />
                                <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} />
                                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} domain={scoreDomain} allowDecimals={false} />
                                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
                                {rows.map(r => (
                                    <Line key={r.id} type="monotone" dataKey={r.id} name={r.name} stroke={TEAM_COLORS[r.colorIndex % TEAM_COLORS.length]} strokeWidth={1.4} dot={{ r: 2.5, strokeWidth: 1.2, fill: 'var(--page-plane)' }} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            )}
        </div>
    );
};

const TotalReport: React.FC<{ data: DataFile }> = ({ data }) => {
    const relevant = data.weeks.filter(w => w.weekNumber >= TOTAL_FROM_WEEK);
    const teams = data.weeks[0]?.teams ?? [];
    const rows = teams.map((t, colorIndex) => {
        const scores = relevant.map(w => w.teams.find(x => x.id === t.id)).map(x => (x ? weekAvg(x) : null)).filter((x): x is number => x !== null);
        const total = round1(scores.reduce((a, b) => a + b, 0));
        return { id: t.id, name: t.name, colorIndex, weeks: scores.length, total, average: scores.length ? round1(total / scores.length) : 0 };
    }).sort((a, b) => b.total - a.total);
    const max = Math.max(1, ...rows.map(r => r.total));

    return (
        <section className="card card-pad">
            <SectionHeader
                eyebrow="Сезондун жыйынтыгы"
                title={`Жалпы рейтинг (${TOTAL_FROM_WEEK}-аптадан)`}
                sub={`${TOTAL_FROM_WEEK}-аптадан баштап акыркы аптага чейинки апталык рейтингдердин суммасы.`}
            />
            {relevant.length === 0 ? (
                <p className="text-center py-10 font-display text-[1.3rem]" style={{ color: 'var(--text-muted)' }}>{TOTAL_FROM_WEEK}-аптадан баштап маалымат азырынча жок.</p>
            ) : (
                <ol className="stagger">
                    {rows.map((r, i) => (
                        <li key={r.id} className="py-3" style={{ borderTop: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-3">
                                <span className="w-7 font-display font-bold text-[1.2rem] tabular" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-muted)' }}>{pad2(i + 1)}</span>
                                <span className="flex-1 min-w-0">
                                    <span className="block font-bold truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                                    <span className="block text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>{r.weeks} апта · орточо {r.average}</span>
                                </span>
                                <span className="font-display font-bold text-[1.5rem] tabular" style={{ color: 'var(--text-primary)' }}>{r.total}</span>
                            </div>
                            <div className="mt-2 ml-10 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--gridline)' }}>
                                <div className="h-full rounded-full animate-grow-x" style={{ width: `${(r.total / max) * 100}%`, backgroundColor: TEAM_COLORS[r.colorIndex % TEAM_COLORS.length] }} />
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
};
