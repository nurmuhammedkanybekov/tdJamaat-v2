import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Settings } from 'lucide-react';
import type { WeekData, MetricValues } from '../../types';
import { COLORS, weights } from '../../utils/scoring';
import { getTeamMemberRankings } from '../../utils/rankings';
import { Avatar } from '../Avatar';

const ROLE_LABEL = { imam: 'Имам', zam: 'Орун басар', member: 'Мүчө' } as const;
const RANK_BG = ['#f5c518', '#c9ccd1', '#e0913f'];

interface TeamsViewProps {
    currentWeekData: WeekData;
    canEdit: boolean;
    onEditHouse: (houseId: string) => void;
    isDark: boolean;
}

const perfColor = (perf: number) =>
    perf >= 100 ? '#1baf7a' : perf >= 75 ? 'var(--accent)' : perf >= 50 ? '#eda100' : '#e34948';

export const TeamsView: React.FC<TeamsViewProps> = ({ currentWeekData, canEdit, onEditHouse, isDark }) => {
    const [activeTeamIdx, setActiveTeamIdx] = useState(0);
    const team = currentWeekData.teams[Math.min(activeTeamIdx, currentWeekData.teams.length - 1)];
    if (!team) return null;

    const rankings = getTeamMemberRankings(team);
    const memberChartData = rankings.map(member => ({ name: member.name, score: member.score, role: member.role }));

    const gridStroke = isDark ? '#2c2c2a' : '#e1e0d9';
    const axisColor = isDark ? '#c3c2b7' : '#52514e';
    const tooltipStyle = {
        backgroundColor: isDark ? '#1a1a19' : '#ffffff',
        border: `1px solid ${isDark ? '#2c2c2a' : '#e1e0d9'}`,
        borderRadius: 8,
        color: isDark ? '#ffffff' : '#0b0b0b'
    };

    const rankBadgeStyle = (rank: number): React.CSSProperties =>
        rank <= 3
            ? { backgroundColor: RANK_BG[rank - 1], color: '#171412' }
            : { backgroundColor: 'color-mix(in oklab, var(--accent) 14%, transparent)', color: 'var(--accent)' };

    const roleBadgeStyle = (role: keyof typeof COLORS): React.CSSProperties => ({
        backgroundColor: `color-mix(in oklab, ${COLORS[role]} 16%, transparent)`,
        color: COLORS[role]
    });

    return (
        <>
            <div className="rounded-2xl shadow-sm border p-4 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex gap-2 flex-wrap">
                    {currentWeekData.teams.map((t, idx) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTeamIdx(idx)}
                            className="px-6 py-3 rounded-xl font-semibold transition-colors"
                            style={activeTeamIdx === idx
                                ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                                : { backgroundColor: 'var(--page-plane)', color: 'var(--text-secondary)' }}
                        >
                            {t.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl shadow-sm border p-6 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="rounded-2xl p-6 mb-6 border relative" style={{ backgroundColor: 'var(--page-plane)', borderColor: 'var(--border)' }}>
                    {canEdit && (
                        <button
                            onClick={() => onEditHouse(team.id)}
                            className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium text-sm transition-colors"
                            style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 14%, transparent)', color: 'var(--accent)' }}
                        >
                            <Settings className="w-4 h-4" /> Өзгөртүү
                        </button>
                    )}
                    <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Үйдүн активдүүлүк көрсөткүчтөрү</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {Object.entries(team.miniCard).map(([key, value]) => {
                            const percent = value.target > 0 ? (value.actual / value.target) * 100 : 0;
                            return (
                                <div key={key} className="rounded-xl shadow-sm p-4 flex flex-col items-center justify-center border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                    <span className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{key}</span>
                                    <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{value.actual}/{value.target}</p>
                                    <p className="text-sm font-semibold mt-1" style={{ color: perfColor(percent) }}>
                                        {percent.toFixed(0)}%
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{team.name} — Мүчөлөрдүн рейтинги</h2>
                <div className="mb-4 flex gap-4 text-sm">
                    {(['imam', 'zam', 'member'] as const).map(role => (
                        <div key={role} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[role] }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{ROLE_LABEL[role]}</span>
                        </div>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 8%, transparent)' }}>
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>№</th>
                                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Аты</th>
                                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Ролу</th>
                                {(Object.keys(weights) as Array<keyof MetricValues>).map(metric => (
                                    <th key={metric} className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>{metric} %</th>
                                ))}
                                <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Упай</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {rankings.map(member => (
                                <tr key={member.id} className="transition-colors hover:brightness-95">
                                    <td className="px-3 py-3">
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm" style={rankBadgeStyle(member.rank)}>
                                            {member.rank}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-2">
                                            <Avatar name={member.name} role={member.role} photoUrl={member.photoUrl} size="sm" />
                                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{member.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className="px-2 py-1 rounded-lg text-xs font-semibold" style={roleBadgeStyle(member.role)}>
                                            {ROLE_LABEL[member.role]}
                                        </span>
                                    </td>
                                    {(Object.keys(weights) as Array<keyof MetricValues>).map(metric => {
                                        const perf = member.performancePercentages[metric];
                                        return (
                                            <td key={metric} className="px-3 py-3 text-right">
                                                <span className="font-semibold" style={{ color: perfColor(perf) }}>
                                                    {perf.toFixed(0)}%
                                                </span>
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-3 text-right font-bold" style={{ color: 'var(--accent)' }}>{member.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-2xl shadow-sm border p-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Мүчөлөрдүн көрсөткүчтөрү</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={memberChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                        <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} />
                        <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: tooltipStyle.color }} />
                        <Legend wrapperStyle={{ color: axisColor }} />
                        <Bar dataKey="score" name="Упай" radius={[6, 6, 0, 0]}>
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
