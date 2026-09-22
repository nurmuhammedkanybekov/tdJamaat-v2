import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Info } from 'lucide-react';
import type { WeekData, Role } from '../../types';
import { calculateMemberScore, COLORS } from '../../utils/scoring';
import { getOverallTeamRankings } from '../../utils/rankings';
import { Avatar } from '../Avatar';

const ROLE_LABEL: Record<Role, string> = { imam: 'Имам', zam: 'Орун басар', member: 'Мүчө' };
const ROLE_FILTER_LABEL: Record<'all' | Role, string> = { all: 'Бардыгы', imam: 'Имамдар', zam: 'Орун басарлар', member: 'Мүчөлөр' };
const RANK_BG = ['#f5c518', '#c9ccd1', '#e0913f'];

interface OverviewViewProps {
    currentWeekData: WeekData;
    isDark: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ currentWeekData, isDark }) => {
    const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');

    const teamRankings = getOverallTeamRankings(currentWeekData.teams);
    const teamChartData = teamRankings.map(team => ({
        name: team.name,
        avgScore: team.avgMemberScore,
        totalScore: team.totalScore
    }));

    const allIndividuals = currentWeekData.teams.flatMap(team =>
        team.members.map(member => ({ ...member, team: team.name, score: calculateMemberScore(member) }))
    );
    const sortedIndividuals = [...allIndividuals].sort((a, b) => b.score - a.score);
    const filteredIndividuals = roleFilter === 'all' ? sortedIndividuals : sortedIndividuals.filter(m => m.role === roleFilter);

    const gridStroke = isDark ? '#2c2c2a' : '#e1e0d9';
    const axisColor = isDark ? '#c3c2b7' : '#52514e';
    const tooltipStyle = {
        backgroundColor: isDark ? '#1a1a19' : '#ffffff',
        border: `1px solid ${isDark ? '#2c2c2a' : '#e1e0d9'}`,
        borderRadius: 8,
        color: isDark ? '#ffffff' : '#0b0b0b'
    };

    const rankBadgeStyle = (idx: number): React.CSSProperties =>
        idx < 3
            ? { backgroundColor: RANK_BG[idx], color: '#171412' }
            : { backgroundColor: 'color-mix(in oklab, var(--accent) 14%, transparent)', color: 'var(--accent)' };

    const roleBadgeStyle = (role: Role): React.CSSProperties => ({
        backgroundColor: `color-mix(in oklab, ${COLORS[role]} 16%, transparent)`,
        color: COLORS[role]
    });

    return (
        <>
            <div className="rounded-2xl p-4 mb-6 border" style={{ backgroundColor: 'color-mix(in oklab, #eda100 12%, var(--surface))', borderColor: '#eda100' }}>
                <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#eda100' }} />
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        <p className="font-semibold mb-1">Рейтинг орточо упайга негизделген</p>
                        <p style={{ color: 'var(--text-secondary)' }}>Үйлөрдүн саны ар башка болгондуктан, адилеттүүлүк үчүн рейтинг орточо упайга негизделген (жалпы упайга эмес). Орточо упай = Жалпы упай ÷ Мүчөлөрдүн саны</p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl shadow-sm border p-6 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Бардык катышуучулардын рейтинги</h2>

                <div className="flex flex-wrap gap-2 mb-4">
                    {(['all', 'imam', 'zam', 'member'] as const).map(roleType => (
                        <button
                            key={roleType}
                            onClick={() => setRoleFilter(roleType)}
                            className="px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
                            style={roleFilter === roleType
                                ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                                : { backgroundColor: 'var(--page-plane)', color: 'var(--text-secondary)' }}
                        >
                            {ROLE_FILTER_LABEL[roleType]}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                        <thead style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 8%, transparent)' }}>
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>№</th>
                                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Аты</th>
                                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Үй</th>
                                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Ролу</th>
                                <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Упай ⭐</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {filteredIndividuals.map((member, idx) => (
                                <tr key={member.id} className="transition-colors hover:brightness-95">
                                    <td className="px-3 py-2">
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm" style={rankBadgeStyle(idx)}>
                                            {idx + 1}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <Avatar name={member.name} role={member.role} photoUrl={member.photoUrl} size="sm" />
                                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{member.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{member.team}</td>
                                    <td className="px-3 py-2">
                                        <span className="px-2 py-1 rounded-lg text-xs font-semibold" style={roleBadgeStyle(member.role)}>
                                            {ROLE_LABEL[member.role]}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold" style={{ color: 'var(--accent)' }}>{member.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={filteredIndividuals.slice(0, 15)}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                        <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} />
                        <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: tooltipStyle.color }} />
                        <Bar dataKey="score" name="Упай" radius={[6, 6, 0, 0]}>
                            {filteredIndividuals.slice(0, 15).map((member, index) => (
                                <Cell key={index} fill={COLORS[member.role]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="rounded-2xl shadow-sm border p-6 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Үйлөрдүн жалпы рейтинги</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 8%, transparent)' }}>
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Рейтинг</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Үй</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Мүчөлөр</th>
                                <th className="px-6 py-3 text-right text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Орточо упай ⭐</th>
                                <th className="px-6 py-3 text-right text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Жалпы упай</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {teamRankings.map(team => (
                                <tr key={team.index} className="transition-colors hover:brightness-95">
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold" style={rankBadgeStyle(team.rank - 1)}>
                                            {team.rank}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{team.name}</td>
                                    <td className="px-6 py-4 text-center" style={{ color: 'var(--text-secondary)' }}>{team.memberCount}</td>
                                    <td className="px-6 py-4 text-right font-bold text-lg" style={{ color: 'var(--accent)' }}>{team.avgMemberScore}</td>
                                    <td className="px-6 py-4 text-right" style={{ color: 'var(--text-muted)' }}>{team.totalScore}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-2xl shadow-sm border p-6 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Үйлөрдүн көрсөткүчтөрү</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={teamChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                        <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} />
                        <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: tooltipStyle.color }} />
                        <Bar dataKey="avgScore" fill="#2a78d6" name="Орточо упай (Рейтинг)" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="totalScore" fill={isDark ? '#4a4a47' : '#cbd5e1'} name="Жалпы упай" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};
