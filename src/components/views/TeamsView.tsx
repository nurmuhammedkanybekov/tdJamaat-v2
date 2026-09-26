import { useIsPhone } from '../../hooks/useMediaQuery';
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Settings } from 'lucide-react';
import type { WeekData, MetricValues } from '../../types';
import { COLORS, weights } from '../../utils/scoring';
import { getTeamMemberRankings } from '../../utils/rankings';
import { Avatar } from '../Avatar';

const ROLE_LABEL = { imam: 'Имам', zam: 'Орун басар', member: 'Мүчө' } as const;

interface TeamsViewProps {
    currentWeekData: WeekData;
    canEditHouse: (houseId: string) => boolean;
    onEditHouse: (houseId: string) => void;
    isDark: boolean;
}

const th: React.CSSProperties = {
    textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--text-muted)', fontWeight: 600, padding: '0 12px 10px', borderBottom: '1px solid var(--text-primary)'
};
const td: React.CSSProperties = { padding: '11px 12px', fontSize: '14px', borderBottom: '1px solid var(--border)' };
const scoreCell: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' };
const rankCell: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' };
const pad2 = (n: number) => String(n).padStart(2, '0');

const perfColor = (perf: number, isDark: boolean) =>
    perf >= 100 ? (isDark ? '#199e70' : '#1baf7a')
        : perf >= 75 ? 'var(--accent)'
        : perf >= 50 ? (isDark ? '#c98500' : '#eda100')
        : (isDark ? '#e66767' : '#e34948');

export const TeamsView: React.FC<TeamsViewProps> = ({ currentWeekData, canEditHouse, onEditHouse, isDark }) => {
    const isPhone = useIsPhone();
    const [activeTeamIdx, setActiveTeamIdx] = useState(0);
    const team = currentWeekData.teams[Math.min(activeTeamIdx, currentWeekData.teams.length - 1)];
    if (!team) return null;

    const rankings = getTeamMemberRankings(team);
    const memberChartData = rankings.map(member => ({ name: member.name, score: member.score, role: member.role }));

    const gridStroke = 'var(--gridline)';
    const axisColor = 'var(--text-muted)';
    const tooltipStyle: React.CSSProperties = {
        backgroundColor: isDark ? '#201f1b' : '#ffffff',
        border: `1px solid ${isDark ? '#33322c' : '#e7e4da'}`,
        borderRadius: 3,
        color: isDark ? '#f2f0e8' : '#1c1c1a',
        fontSize: 13
    };

    return (
        <>
            <div className="mb-7 -mx-4 sm:mx-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="scroll-row scroll-fade flex gap-5 px-4 sm:px-0">
                    {currentWeekData.teams.map((t, idx) => {
                        const active = activeTeamIdx === idx;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTeamIdx(idx)}
                                className="whitespace-nowrap flex-shrink-0 pb-3 pt-2 sm:pt-1"
                                style={{
                                    fontSize: '13px', fontWeight: 600, letterSpacing: '0.01em',
                                    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                                    borderBottom: active ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                                    marginBottom: '-1px'
                                }}
                            >
                                {t.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mb-10">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Үйдүн активдүүлүк көрсөткүчтөрү</h3>
                    {canEditHouse(team.id) && (
                        <button
                            onClick={() => onEditHouse(team.id)}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 min-h-9 sm:min-h-0 sm:py-1.5 text-xs font-semibold transition-colors"
                            style={{ border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-secondary)' }}
                        >
                            <Settings className="w-3.5 h-3.5" /> Өзгөртүү
                        </button>
                    )}
                </div>
                {/* Ruled grid: top/left rule on the container, right/bottom on each
                    cell — so dividers stay correct for any number of activities
                    (7 since БАБХ) and any column count, with no filled-in gap
                    where the last row is short. */}
                <div className="grid grid-cols-4 md:grid-cols-7" style={{ borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>
                    {Object.entries(team.miniCard).map(([key, value]) => {
                        const percent = value.target > 0 ? (value.actual / value.target) * 100 : 0;
                        return (
                            <div
                                key={key}
                                className="flex flex-col items-center justify-center text-center py-3 px-1.5 min-w-0"
                                style={{ borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
                            >
                                <span className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{key}</span>
                                <p className="font-serif" style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)' }}>{value.actual}/{value.target}</p>
                                <p className="text-xs font-semibold mt-1" style={{ color: perfColor(percent, isDark) }}>
                                    {percent.toFixed(0)}%
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mb-12">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{team.name} — Мүчөлөрдүн рейтинги</h2>
                    <div className="flex gap-4 text-xs">
                        {(['imam', 'zam', 'member'] as const).map(role => (
                            <div key={role} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[role] }} />
                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{ROLE_LABEL[role]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Phone & tablet: one card per member — score and all 8 metrics visible
                    without swiping a 10-column table sideways. */}
                <ol className="lg:hidden" style={{ borderTop: '1px solid var(--text-primary)' }}>
                    {rankings.map(member => (
                        <li key={member.id} className="py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-2.5">
                                <span className="w-6 flex-shrink-0 font-serif font-semibold text-[13px]" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{String(member.rank).padStart(2, '0')}</span>
                                <Avatar name={member.name} role={member.role} photoUrl={member.photoUrl} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{member.name}</div>
                                    <div className="text-[12px] italic" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[member.role]}</div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Упай</div>
                                    <div className="font-serif font-semibold text-lg" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{member.score}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 min-[360px]:grid-cols-4 md:grid-cols-8 gap-x-3 gap-y-1.5 mt-2.5 md:pl-[34px]">
                                {(Object.keys(weights) as Array<keyof MetricValues>).map(metric => {
                                    const perf = member.performancePercentages[metric];
                                    return (
                                        <div key={metric} className="flex items-baseline justify-between gap-1 min-w-0 text-[12px]">
                                            <span className="whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{metric}</span>
                                            <span className="font-semibold" style={{ color: perfColor(perf, isDark), fontVariantNumeric: 'tabular-nums' }}>{perf.toFixed(0)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </li>
                    ))}
                </ol>

                <div className="hidden lg:block overflow-x-auto">
                    <table className="data-table w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={th}>#</th>
                                <th style={th}>Аты</th>
                                <th style={th}>Ролу</th>
                                {(Object.keys(weights) as Array<keyof MetricValues>).map(metric => (
                                    <th key={metric} style={{ ...th, textAlign: 'right' }}>{metric}</th>
                                ))}
                                <th style={{ ...th, textAlign: 'right' }}>Упай</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankings.map(member => (
                                <tr key={member.id}>
                                    <td style={{ ...td, ...rankCell }}>{pad2(member.rank)}</td>
                                    <td style={td}>
                                        <div className="flex items-center gap-2.5">
                                            <Avatar name={member.name} role={member.role} photoUrl={member.photoUrl} size="sm" />
                                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{member.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ ...td, fontSize: '12.5px', fontStyle: 'italic', color: 'var(--text-muted)' }}>{ROLE_LABEL[member.role]}</td>
                                    {(Object.keys(weights) as Array<keyof MetricValues>).map(metric => {
                                        const perf = member.performancePercentages[metric];
                                        return (
                                            <td key={metric} style={{ ...td, textAlign: 'right' }}>
                                                <span className="font-semibold" style={{ color: perfColor(perf, isDark), fontVariantNumeric: 'tabular-nums' }}>
                                                    {perf.toFixed(0)}%
                                                </span>
                                            </td>
                                        );
                                    })}
                                    <td style={{ ...td, ...scoreCell, textAlign: 'right' }}>{member.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Мүчөлөрдүн көрсөткүчтөрү</h2>
                <ResponsiveContainer width="100%" height={isPhone ? 260 : 360}>
                    <BarChart data={memberChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridStroke }} tickLine={false} />
                        <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: tooltipStyle.color }} cursor={{ fill: 'var(--gridline)', opacity: 0.4 }} />
                        <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
                        <Bar dataKey="score" name="Упай" radius={[2, 2, 0, 0]}>
                            {memberChartData.map((entry, index) => (
                                <Cell key={index} fill={COLORS[entry.role as keyof typeof COLORS]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};
