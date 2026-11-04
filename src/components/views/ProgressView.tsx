import React, { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, usePlotArea, useYAxisDomain } from 'recharts';
import { Columns2 } from 'lucide-react';
import { useIsPhone, useMediaQuery } from '../../hooks/useMediaQuery';
import type { DataFile } from '../../types';
import type { Insights } from '../../utils/insights';
import { ROLE_LABEL, weekOf } from '../../utils/insights';
import { TEAM_COLORS } from '../../utils/scoring';
import { Avatar } from '../Avatar';
import { ChartTooltip, SectionHeader, Sparkline } from '../ui';
import { axisTick, scoreDomain } from '../../utils/style';
import { placeSuffix, t } from '../../i18n';

interface ProgressViewProps {
    data: DataFile;
    insights: Insights;
    onOpenProfile: (memberId: string) => void;
    onCompare: (kind: 'person' | 'house') => void;
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

interface EndLabel { id: string; name: string; value: number; color: string; stale: boolean; dim: boolean }

// House names written at the right end of the chart, level with each line's
// last point, so nobody has to match colours against the legend. Labels that
// would touch are pushed apart, keeping their order.
const EndLabels: React.FC<{ items: EndLabel[] }> = ({ items }) => {
    const area = usePlotArea();
    const domain = useYAxisDomain();
    if (!area || !domain || items.length === 0) return null;
    const lo = Number(domain[0]), hi = Number(domain[domain.length - 1]);
    const span = hi - lo || 1;
    const gap = 15, top = area.y, bottom = area.y + area.height;
    const placed = items
        .map(it => ({ ...it, y: top + ((hi - it.value) / span) * area.height }))
        .sort((a, b) => a.y - b.y);
    for (let i = 1; i < placed.length; i++) placed[i].y = Math.max(placed[i].y, placed[i - 1].y + gap);
    const over = placed[placed.length - 1].y - bottom;
    if (over > 0) {
        placed[placed.length - 1].y -= over;
        for (let i = placed.length - 2; i >= 0; i--) placed[i].y = Math.min(placed[i].y, placed[i + 1].y - gap);
    }
    return (
        <g aria-hidden="true">
            {placed.map(p => (
                <text key={p.id} x={area.x + area.width + 12} y={p.y} dy="0.35em" fill={p.color} fontSize={10.5} letterSpacing="0.14em"
                    style={{ fontFamily: 'Spectral, Georgia, serif', textTransform: 'uppercase', opacity: p.dim ? 0.18 : p.stale ? 0.6 : 1, transition: 'opacity 250ms ease' }}>
                    {p.name}
                </text>
            ))}
        </g>
    );
};

export const ProgressView: React.FC<ProgressViewProps> = ({ data, insights, onOpenProfile, onCompare }) => {
    const isPhone = useIsPhone();
    const calm = useMediaQuery('(prefers-reduced-motion: reduce)');
    // The house whose legend chip is under the pointer (or focused): its line
    // stays, the others step back.
    const [focus, setFocus] = useState<string | null>(null);
    const houses = useMemo(() => [...insights.houses.values()].sort((a, b) => a.colorIndex - b.colorIndex), [insights]);
    const [hidden, setHidden] = useState<Set<string>>(new Set());
    const toggle = (id: string) => setHidden(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const scoreData = data.weeks.map((w, i) => {
        const point: Record<string, number | string | null> = { week: t('{0}-апта', w.weekNumber) };
        houses.forEach(h => { const hw = weekOf(h.weeks, i); point[h.id] = hw && hw.submitted ? hw.avg : null; });
        return point;
    });
    const rankData = data.weeks.map((w, i) => {
        const point: Record<string, number | string | null> = { week: t('{0}-апта', w.weekNumber) };
        houses.forEach(h => { const hw = weekOf(h.weeks, i); point[h.id] = hw?.rank ?? null; });
        return point;
    });

    const lastIndex = data.weeks.length - 1;

    // Where each visible line ends: its last entered week.
    const endLabels: EndLabel[] = houses.filter(h => !hidden.has(h.id)).flatMap(h => {
        for (let i = scoreData.length - 1; i >= 0; i--) {
            const v = scoreData[i][h.id];
            if (typeof v === 'number') return [{ id: h.id, name: h.name, value: v, color: TEAM_COLORS[h.colorIndex % TEAM_COLORS.length], stale: i < lastIndex, dim: !!focus && focus !== h.id }];
        }
        return [];
    });
    // Room on the right for the longest house name.
    const labelRoom = Math.min(130, 30 + Math.max(0, ...endLabels.map(l => l.name.length)) * 8);
    // The latest week is still open and this house hasn't entered it yet.
    const latestOpenMissing = (h: (typeof houses)[number]) => {
        const hw = weekOf(h.weeks, lastIndex);
        return !!hw && !hw.submitted;
    };
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
                    <button key={h.id} className="legend-chip" onClick={() => toggle(h.id)} aria-pressed={!off}
                        onMouseEnter={() => !off && setFocus(h.id)} onMouseLeave={() => setFocus(null)} onFocus={() => !off && setFocus(h.id)} onBlur={() => setFocus(null)}
                        style={off ? { opacity: 0.4, textDecoration: 'line-through' } : undefined}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TEAM_COLORS[h.colorIndex % TEAM_COLORS.length] }} />
                        {h.name}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-12 sm:space-y-16">
            <section className="card card-pad">
                <SectionHeader title={t('Рейтинг апта сайын')} action={<button className="btn btn-ghost" onClick={() => onCompare('house')}><Columns2 className="w-3.5 h-3.5" />  {t('Салыштыруу')}</button>} />
                {legend}
                <div className="mt-4 -ml-3 sm:ml-0">
                    <ResponsiveContainer width="100%" height={isPhone ? 280 : 420}>
                        <LineChart data={scoreData} margin={{ top: 10, right: isPhone ? 16 : labelRoom, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="var(--gridline)" vertical={false} />
                            <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} />
                            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} domain={scoreDomain} allowDecimals={false} />
                            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
                            {houses.filter(h => !hidden.has(h.id)).map(h => {
                                const dim = !!focus && focus !== h.id;
                                return (
                                    <Line key={h.id} type="monotone" dataKey={h.id} name={h.name} stroke={TEAM_COLORS[h.colorIndex % TEAM_COLORS.length]}
                                        strokeWidth={focus === h.id ? 2.4 : 1.6} strokeOpacity={dim ? 0.15 : 1} style={{ transition: 'stroke-opacity 250ms ease, stroke-width 250ms ease' }}
                                        dot={{ r: 2.75, strokeWidth: 1.3, fill: 'var(--surface)', opacity: dim ? 0.15 : 1 }} activeDot={{ r: 4.5, strokeWidth: 0 }}
                                        connectNulls isAnimationActive={!calm} animationDuration={900} />
                                );
                            })}
                            {!isPhone && <EndLabels items={endLabels} />}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                <section className="card card-pad">
                    <SectionHeader title={t('Орундардын жарышы')} />
                    <div className="-ml-3 sm:ml-0">
                        <ResponsiveContainer width="100%" height={isPhone ? 240 : 300}>
                            <LineChart data={rankData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke="var(--gridline)" vertical={false} />
                                <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} />
                                <YAxis reversed domain={[1, Math.max(1, houses.length)]} ticks={Array.from({ length: Math.max(1, houses.length) }, (_, i) => i + 1)} interval={0} padding={{ top: 10, bottom: 10 }} allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={30} tickFormatter={v => `${v}`} />
                                <Tooltip content={<ChartTooltip unit={placeSuffix} />} cursor={{ stroke: 'var(--border-strong)' }} />
                                {houses.filter(h => !hidden.has(h.id)).map(h => (
                                    <Line key={h.id} type="monotone" dataKey={h.id} name={h.name} stroke={TEAM_COLORS[h.colorIndex % TEAM_COLORS.length]} strokeWidth={focus === h.id ? 2.4 : 1.6}
                                        strokeOpacity={focus && focus !== h.id ? 0.15 : 1} style={{ transition: 'stroke-opacity 250ms ease' }}
                                        dot={{ r: 2.75, strokeWidth: 0, fill: TEAM_COLORS[h.colorIndex % TEAM_COLORS.length], opacity: focus && focus !== h.id ? 0.15 : 1 }} connectNulls isAnimationActive={!calm} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className="card card-pad">
                    <SectionHeader eyebrow={t('{0}-апта', data.weeks[lastIndex].weekNumber)} title={t('Эң көп өскөндөр')} />
                    {risers.length === 0 ? (
                        <p className="text-[0.88rem]" style={{ color: 'var(--text-muted)' }}>{t('Салыштыруу үчүн эки апталык маалымат керек.')}</p>
                    ) : (
                        <ol className="stagger">
                            {risers.map(({ s, now, delta }, i) => (
                                <li key={s.id}>
                                    <button onClick={() => onOpenProfile(s.id)} className="row-link w-[calc(100%+1rem)] flex items-center gap-3 py-2.5 px-2 -mx-2 text-left" style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                                        <Avatar name={s.name} role={now.member.role} photoUrl={s.photoUrl} size="sm" />
                                        <span className="flex-1 min-w-0">
                                            <span className="block font-bold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                                            <span className="block text-[0.75rem] truncate" style={{ color: 'var(--text-muted)' }}>{now.houseName} · <i>{ROLE_LABEL[now.member.role]}</i></span>
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
                <SectionHeader title={t('Ар бир үй')} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
                    {houses.map(h => {
                        const counted = h.weeks.filter(w => w.submitted);
                        const cur = counted[counted.length - 1];
                        const prev = counted[counted.length - 2];
                        const change = cur && prev ? cur.avg - prev.avg : 0;
                        const best = counted.reduce((b, w) => Math.max(b, w.avg), 0);
                        const color = TEAM_COLORS[h.colorIndex % TEAM_COLORS.length];
                        return (
                            <div key={h.id} className="card lift p-4 sm:p-5 relative overflow-hidden">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-display text-[1.45rem] truncate flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}><span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />{h.name}</h3>
                                        <div className="text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>{t('{0} аптага катышты', counted.length)}</div>
                                    </div>
                                    <Sparkline values={counted.map(w => w.avg)} color={color} width={80} height={30} />
                                </div>
                                <dl className="grid grid-cols-3 gap-2 mt-4">
                                    <div><dt className="eyebrow">{cur ? t('{0}-апта', cur.weekNumber) : t('Акыркы апта')}</dt><dd className="font-display font-bold text-[1.35rem] tabular" style={{ color: 'var(--text-primary)' }}>{cur ? fmt(cur.avg) : '—'}</dd></div>
                                    <div><dt className="eyebrow">{t('Өзгөрүү')}</dt><dd className="font-display font-bold text-[1.35rem] tabular" style={{ color: change > 0 ? 'var(--success)' : change < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{prev ? `${change > 0 ? '+' : ''}${fmt(change)}` : '—'}</dd></div>
                                    <div><dt className="eyebrow">{t('Рекорд')}</dt><dd className="font-display font-bold text-[1.35rem] tabular" style={{ color: 'var(--text-primary)' }}>{counted.length ? fmt(best) : '—'}</dd></div>
                                </dl>
                                <p className="text-[0.75rem] italic mt-2" style={{ color: 'var(--text-muted)' }}>
                                    {prev ? t('Өзгөрүү: {0}-аптага караганда.', prev.weekNumber) : t('Өзгөрүү эки аптадан кийин көрүнөт.')}
                                    {latestOpenMissing(h) && t(' {0}-апта али киргизиле элек.', data.weeks[data.weeks.length - 1].weekNumber)}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};
