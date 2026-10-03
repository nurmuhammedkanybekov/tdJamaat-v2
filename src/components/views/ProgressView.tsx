import React, { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Columns2 } from 'lucide-react';
import { useIsPhone } from '../../hooks/useMediaQuery';
import type { DataFile } from '../../types';
import type { Insights } from '../../utils/insights';
import { ROLE_LABEL, weekOf } from '../../utils/insights';
import { TEAM_COLORS } from '../../utils/scoring';
import { Avatar } from '../Avatar';
import { ChartTooltip, SectionHeader, Sparkline } from '../ui';
import { axisTick, scoreDomain } from '../../utils/style';

interface ProgressViewProps {
    data: DataFile;
    insights: Insights;
    onOpenProfile: (memberId: string) => void;
    onCompare: (kind: 'person' | 'house') => void;
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

export const ProgressView: React.FC<ProgressViewProps> = ({ data, insights, onOpenProfile, onCompare }) => {
    const isPhone = useIsPhone();
    const houses = useMemo(() => [...insights.houses.values()].sort((a, b) => a.colorIndex - b.colorIndex), [insights]);
    const [hidden, setHidden] = useState<Set<string>>(new Set());
    const toggle = (id: string) => setHidden(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const scoreData = data.weeks.map((w, i) => {
        const point: Record<string, number | string | null> = { week: `${w.weekNumber}-апта` };
        houses.forEach(h => { const hw = weekOf(h.weeks, i); point[h.id] = hw && hw.submitted ? hw.avg : null; });
        return point;
    });
    const rankData = data.weeks.map((w, i) => {
        const point: Record<string, number | string | null> = { week: `${w.weekNumber}-апта` };
        houses.forEach(h => { const hw = weekOf(h.weeks, i); point[h.id] = hw?.rank ?? null; });
        return point;
    });

    const lastIndex = data.weeks.length - 1;
    // People who gained the most since the previous week
    const risers = [...insights.members.values()]
        .map(s => {
            const now = weekOf(s.weeks, lastIndex), prev = weekOf(s.weeks, lastIndex - 1);
            return now && prev && now.submitted && prev.submitted ? { s, now, delta: now.score - prev.score } : null;
        })
        .filter((x): x is NonNullable<typeof x> => !!x && x.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 5);

    const legend = (
        <div className="flex flex-wrap gap-1.5">
            {houses.map(h => {
                const off = hidden.has(h.id);
                return (
                    <button key={h.id} className="chip" onClick={() => toggle(h.id)} aria-pressed={!off} style={off ? { opacity: 0.45 } : { borderColor: 'var(--border-strong)' }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TEAM_COLORS[h.colorIndex % TEAM_COLORS.length] }} />
                        {h.name}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-8 sm:space-y-10">
            <section className="card card-pad">
                <SectionHeader eyebrow="Үй рейтинги" title="Үйлөрдүн апталык прогресси" sub="Үйдү жашыруу же көрсөтүү үчүн атын басыңыз." action={<button className="btn btn-ghost" onClick={() => onCompare('house')}><Columns2 className="w-3.5 h-3.5" /> Салыштыруу</button>} />
                {legend}
                <div className="mt-4 -ml-3 sm:ml-0">
                    <ResponsiveContainer width="100%" height={isPhone ? 280 : 420}>
                        <LineChart data={scoreData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="var(--gridline)" vertical={false} />
                            <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} />
                            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} domain={scoreDomain} allowDecimals={false} />
                            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
                            {houses.filter(h => !hidden.has(h.id)).map(h => (
                                <Line key={h.id} type="monotone" dataKey={h.id} name={h.name} stroke={TEAM_COLORS[h.colorIndex % TEAM_COLORS.length]} strokeWidth={1.4}
                                    dot={{ r: 2.5, strokeWidth: 1.2, fill: 'var(--page-plane)' }} activeDot={{ r: 4 }} connectNulls isAnimationActive />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <div className="grid gap-8 xl:grid-cols-2">
                <section className="card card-pad">
                    <SectionHeader eyebrow="Ар бир аптадагы орун" title="Орундардын жарышы" />
                    <div className="-ml-3 sm:ml-0">
                        <ResponsiveContainer width="100%" height={isPhone ? 240 : 300}>
                            <LineChart data={rankData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke="var(--gridline)" vertical={false} />
                                <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} />
                                <YAxis reversed domain={[1, Math.max(1, houses.length)]} allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={30} tickFormatter={v => `${v}`} />
                                <Tooltip content={<ChartTooltip unit="-орун" />} cursor={{ stroke: 'var(--border-strong)' }} />
                                {houses.filter(h => !hidden.has(h.id)).map(h => (
                                    <Line key={h.id} type="monotone" dataKey={h.id} name={h.name} stroke={TEAM_COLORS[h.colorIndex % TEAM_COLORS.length]} strokeWidth={1.4} dot={{ r: 2.5, strokeWidth: 0, fill: TEAM_COLORS[h.colorIndex % TEAM_COLORS.length] }} connectNulls />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className="card card-pad">
                    <SectionHeader eyebrow={`${data.weeks[lastIndex].weekNumber}-апта`} title="Эң көп өскөндөр" sub="Мурунку аптага караганда эң көп упай кошкондор." />
                    {risers.length === 0 ? (
                        <p className="text-[0.88rem]" style={{ color: 'var(--text-muted)' }}>Салыштыруу үчүн эки апталык маалымат керек.</p>
                    ) : (
                        <ol className="stagger">
                            {risers.map(({ s, now, delta }, i) => (
                                <li key={s.id}>
                                    <button onClick={() => onOpenProfile(s.id)} className="row-link w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-[8px] text-left" style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                                        <Avatar name={s.name} role={s.role} photoUrl={s.photoUrl} size="sm" />
                                        <span className="flex-1 min-w-0">
                                            <span className="block font-bold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                                            <span className="block text-[0.75rem] truncate" style={{ color: 'var(--text-muted)' }}>{now.houseName} · <i>{ROLE_LABEL[s.role]}</i></span>
                                        </span>
                                        <span className="font-display font-bold text-[1.25rem] tabular" style={{ color: 'var(--success)' }}>+{fmt(delta)}</span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>

            <section>
                <SectionHeader eyebrow="Үйлөр" title="Апталар боюнча статистика" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
                    {houses.map(h => {
                        const counted = h.weeks.filter(w => w.submitted);
                        const cur = counted[counted.length - 1];
                        const prev = counted[counted.length - 2];
                        const change = cur && prev ? cur.avg - prev.avg : 0;
                        const best = counted.reduce((b, w) => Math.max(b, w.avg), 0);
                        const color = TEAM_COLORS[h.colorIndex % TEAM_COLORS.length];
                        return (
                            <div key={h.id} className="card p-4 sm:p-5 relative overflow-hidden">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-display text-[1.45rem] truncate flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}><span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />{h.name}</h3>
                                        <div className="text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>{counted.length} апта катышты</div>
                                    </div>
                                    <Sparkline values={counted.map(w => w.avg)} color={color} width={80} height={30} />
                                </div>
                                <dl className="grid grid-cols-3 gap-2 mt-4">
                                    <div><dt className="eyebrow">Азыр</dt><dd className="font-display font-bold text-[1.35rem] tabular" style={{ color: 'var(--text-primary)' }}>{cur ? fmt(cur.avg) : '—'}</dd></div>
                                    <div><dt className="eyebrow">Өзгөрүү</dt><dd className="font-display font-bold text-[1.35rem] tabular" style={{ color: change > 0 ? 'var(--success)' : change < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{change > 0 ? '+' : ''}{fmt(change)}</dd></div>
                                    <div><dt className="eyebrow">Рекорд</dt><dd className="font-display font-bold text-[1.35rem] tabular" style={{ color: 'var(--text-primary)' }}>{fmt(best)}</dd></div>
                                </dl>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};
