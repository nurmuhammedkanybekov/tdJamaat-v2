import React, { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronLeft, ChevronRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useIsPhone } from '../../hooks/useMediaQuery';
import type { DataFile } from '../../types';
import { TEAM_COLORS } from '../../utils/scoring';
import { houseWeekRating, reportRows } from '../../utils/reports';
import type { Trend } from '../../utils/reports';
import { ChartTooltip, SectionHeader } from '../ui';
import { axisTick, scoreDomain } from '../../utils/style';
import { t } from '../../i18n';

interface ReportsViewProps {
    data: DataFile;
    selectedPeriod: number;
    setSelectedPeriod: (p: number) => void;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const pad2 = (n: number) => String(n).padStart(2, '0');
const TOTAL_FROM_WEEK = 5;

const TREND: Record<Trend, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    up: { label: t('Өсүш'), icon: TrendingUp, color: 'var(--success)' },
    down: { label: t('Төмөндөө'), icon: TrendingDown, color: 'var(--danger)' },
    stable: { label: t('Туруктуу'), icon: Minus, color: 'var(--accent)' }
};

export const ReportsView: React.FC<ReportsViewProps> = ({ data, selectedPeriod, setSelectedPeriod }) => {
    const [mode, setMode] = useState<'period' | 'total'>('period');
    return (
        <div className="space-y-6">
            <div className="flex w-full sm:inline-flex sm:w-auto p-1 rounded-full" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} role="tablist">
                {([['period', t('4 апталык отчет')], ['total', t('Жалпы рейтинг')]] as const).map(([k, label]) => (
                    <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`chip flex-1 sm:flex-none justify-center whitespace-nowrap ${mode === k ? 'is-active' : ''}`} style={{ border: 'none', padding: '0.5rem 0.6rem', letterSpacing: '0.12em' }}>{label}</button>
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

    const rows = reportRows(weeks, teams);

    const rising = rows.filter(r => r.trend === 'up').sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0];
    const chartData = weeks.map(w => {
        const p: Record<string, number | string | null> = { week: t('{0}-апта', w.weekNumber) };
        w.teams.forEach(it => { p[it.id] = houseWeekRating(w, it.id); });
        return p;
    });

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="card px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                <button className="btn btn-ghost btn-icon rounded-full" onClick={() => setSelectedPeriod(Math.max(0, period - 1))} disabled={period === 0} aria-label={t('Мурунку мезгил')} style={{ opacity: period === 0 ? 0.35 : 1 }}>
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <div className="eyebrow">{t('{0}-мезгил / {1}', period + 1, totalPeriods)}</div>
                    <div className="font-display font-bold text-[1.6rem] tabular" style={{ color: 'var(--text-primary)' }}>{t('{0}–{1}-апталар', first, last)}</div>
                </div>
                <button className="btn btn-ghost btn-icon rounded-full" onClick={() => setSelectedPeriod(Math.min(totalPeriods - 1, period + 1))} disabled={period >= totalPeriods - 1} aria-label={t('Кийинки мезгил')} style={{ opacity: period >= totalPeriods - 1 ? 0.35 : 1 }}>
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3 stagger">
                {[
                    { label: t('Эң мыкты үй'), value: rows[0]?.name ?? '—', sub: rows[0] ? t('Рейтинг: {0}', rows[0].average) : '' },
                    { label: t('Эң тез өсүү'), value: rising?.name ?? '—', sub: rising ? `${rising.scores[0]} → ${rising.scores.at(-1)}` : t('Өсүү байкалган жок') },
                    { label: t('Мезгил'), value: t('{0} апта', weeks.length), sub: t('{0} үй катышты', rows.length) }
                ].map(s => (
                    <div key={s.label} className="card card-pad">
                        <div className="eyebrow">{s.label}</div>
                        <div className="font-display font-bold text-[1.6rem] mt-1 truncate" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                        <div className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <section className="card overflow-hidden">
                <div className="card-pad pb-0 sm:pb-0"><SectionHeader eyebrow={t('Үй рейтинги боюнча')} title={t('Мезгилдин рейтинги')} /></div>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: '1.25rem' }}>#</th>
                                <th>{t('Үй')}</th>
                                {weeks.map(w => <th key={w.weekNumber} className="hidden md:table-cell" style={{ textAlign: 'center' }}>{t('{0}-апта', w.weekNumber)}</th>)}
                                <th style={{ textAlign: 'right' }}>{t('Рейтинг')}</th>
                                <th className="hidden sm:table-cell" style={{ textAlign: 'right' }}>{t('Эң жакшы')}</th>
                                <th className="hidden sm:table-cell" style={{ textAlign: 'right' }}>{t('Эң начар')}</th>
                                <th style={{ textAlign: 'right', paddingRight: '1.25rem' }} title={t('Мезгилдин акыркы эсептелген аптасы биринчисине салыштырмалуу')}>{t('Мезгил ичинде')}</th>
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
                                        {weeks.map((w, k) => <td key={w.weekNumber} className="hidden md:table-cell tabular" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{r.cells[k] !== null ? r.cells[k]!.toFixed(1) : '—'}</td>)}
                                        <td className="font-display font-bold text-[1.2rem] tabular" style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{r.average}</td>
                                        <td className="hidden sm:table-cell tabular font-bold" style={{ textAlign: 'right', color: 'var(--success)' }}>{r.best !== null ? r.best.toFixed(1) : '—'}</td>
                                        <td className="hidden sm:table-cell tabular font-bold" style={{ textAlign: 'right', color: 'var(--danger)' }}>{r.worst !== null ? r.worst.toFixed(1) : '—'}</td>
                                        <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                                            <span className="inline-flex items-center gap-1 font-bold text-[0.82rem] tabular whitespace-nowrap" style={{ color: r.change === null ? 'var(--text-muted)' : T.color }} title={T.label}>
                                                {r.change === null ? '—' : <><T.icon className="w-4 h-4" />{r.change > 0 ? '+' : ''}{r.change.toFixed(1)}</>}
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
                    <SectionHeader title={t('{0}–{1}-апталар боюнча график', first, last)} />
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
    const rows = teams.map((it, colorIndex) => {
        const scores = relevant.map(w => houseWeekRating(w, it.id)).filter((x): x is number => x !== null);
        const total = round1(scores.reduce((a, b) => a + b, 0));
        return { id: it.id, name: it.name, colorIndex, weeks: scores.length, total, average: scores.length ? round1(total / scores.length) : 0 };
    }).sort((a, b) => b.total - a.total);
    const max = Math.max(1, ...rows.map(r => r.total));

    return (
        <section className="card card-pad">
            <SectionHeader
                eyebrow={t('Сезондун жыйынтыгы')}
                title={t('Жалпы рейтинг ({0}-аптадан)', TOTAL_FROM_WEEK)}
                sub={t('{0}-аптадан баштап акыркы аптага чейинки апталык рейтингдердин суммасы.', TOTAL_FROM_WEEK)}
            />
            {relevant.length === 0 ? (
                <p className="text-center py-10 font-display text-[1.3rem]" style={{ color: 'var(--text-muted)' }}>{t('{0}-аптадан баштап маалымат азырынча жок.', TOTAL_FROM_WEEK)}</p>
            ) : (
                <ol className="stagger">
                    {rows.map((r, i) => (
                        <li key={r.id} className="py-3" style={{ borderTop: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-3">
                                <span className="w-7 font-display font-bold text-[1.2rem] tabular" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-muted)' }}>{pad2(i + 1)}</span>
                                <span className="flex-1 min-w-0">
                                    <span className="block font-bold truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                                    <span className="block text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>{t('{0} апта · орточо {1}', r.weeks, r.average)}</span>
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
