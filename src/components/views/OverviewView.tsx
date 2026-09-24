import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { WeekData, Role } from '../../types';
import { calculateMemberScore, COLORS } from '../../utils/scoring';
import { getOverallTeamRankings } from '../../utils/rankings';
import { Avatar } from '../Avatar';

const ROLE_LABEL: Record<Role, string> = { imam: 'Имам', zam: 'Орун басар', member: 'Мүчө' };
const ROLE_FILTER_LABEL: Record<'all' | Role, string> = { all: 'Бардыгы', imam: 'Имамдар', zam: 'Орун басарлар', member: 'Мүчөлөр' };

interface OverviewViewProps {
    currentWeekData: WeekData;
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

    const avgScore = useMemo(() => {
        if (allIndividuals.length === 0) return 0;
        return Math.round((allIndividuals.reduce((sum, m) => sum + m.score, 0) / allIndividuals.length) * 10) / 10;
    }, [allIndividuals]);

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
            <div className="mb-8 pl-4" style={{ borderLeft: '2px solid var(--gold)' }}>
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Рейтинг орточо упайга негизделген</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Үйлөрдүн саны ар башка болгондуктан, адилеттүүлүк үчүн рейтинг орточо упайга негизделген (жалпы упайга эмес). Орточо упай = Жалпы упай ÷ Мүчөлөрдүн саны
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 mb-9">
                {[
                    { label: 'Мыкты үй', value: teamRankings[0]?.name ?? '—' },
                    { label: 'Катышуучулар', value: String(allIndividuals.length) },
                    { label: 'Орточо упай', value: String(avgScore) }
                ].map((stat, i) => (
                    <div key={stat.label} className="px-0 sm:px-6" style={i > 0 ? { borderLeft: '1px solid var(--border)' } : undefined}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{stat.label}</div>
                        <div className="font-serif" style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            <div className="mb-12">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Бардык катышуучулардын рейтинги</h2>
                    <div className="flex flex-wrap gap-1">
                        {(['all', 'imam', 'zam', 'member'] as const).map(roleType => (
                            <button
                                key={roleType}
                                onClick={() => setRoleFilter(roleType)}
                                className="px-3 py-1.5 text-xs font-semibold transition-colors"
                                style={roleFilter === roleType
                                    ? { border: '1px solid var(--text-primary)', color: 'var(--text-primary)', borderRadius: '3px' }
                                    : { border: '1px solid transparent', color: 'var(--text-muted)', borderRadius: '3px' }}
                            >
                                {ROLE_FILTER_LABEL[roleType]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto mb-7">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={th}>#</th>
                                <th style={th}>Аты</th>
                                <th style={th}>Үй</th>
                                <th style={th}>Ролу</th>
                                <th style={{ ...th, textAlign: 'right' }}>Упай</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIndividuals.map((member, idx) => (
                                <tr key={member.id}>
                                    <td style={{ ...td, ...rankCell }}>{pad2(idx + 1)}</td>
                                    <td style={td}>
                                        <div className="flex items-center gap-2.5">
                                            <Avatar name={member.name} role={member.role} photoUrl={member.photoUrl} size="sm" />
                                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{member.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ ...td, color: 'var(--text-secondary)' }}>{member.team}</td>
                                    <td style={{ ...td, fontSize: '12.5px', fontStyle: 'italic', color: 'var(--text-muted)' }}>{ROLE_LABEL[member.role]}</td>
                                    <td style={{ ...td, ...scoreCell, textAlign: 'right' }}>{member.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={filteredIndividuals.slice(0, 15)}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridStroke }} tickLine={false} />
                        <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: tooltipStyle.color }} cursor={{ fill: 'var(--gridline)', opacity: 0.4 }} />
                        <Bar dataKey="score" name="Упай" radius={[2, 2, 0, 0]}>
                            {filteredIndividuals.slice(0, 15).map((member, index) => (
                                <Cell key={index} fill={COLORS[member.role]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mb-12">
                <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Үйлөрдүн жалпы рейтинги</h2>
                <div className="overflow-x-auto">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={th}>#</th>
                                <th style={th}>Үй</th>
                                <th style={{ ...th, textAlign: 'center' }}>Мүчөлөр</th>
                                <th style={{ ...th, textAlign: 'right' }}>Орточо упай</th>
                                <th style={{ ...th, textAlign: 'right' }}>Жалпы упай</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamRankings.map(team => (
                                <tr key={team.index}>
                                    <td style={{ ...td, ...rankCell }}>{pad2(team.rank)}</td>
                                    <td style={{ ...td, fontWeight: 600, color: 'var(--text-primary)' }}>{team.name}</td>
                                    <td style={{ ...td, textAlign: 'center', color: 'var(--text-secondary)' }}>{team.memberCount}</td>
                                    <td style={{ ...td, ...scoreCell, textAlign: 'right', fontSize: '15px' }}>{team.avgMemberScore}</td>
                                    <td style={{ ...td, textAlign: 'right', color: 'var(--text-muted)' }}>{team.totalScore}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Үйлөрдүн көрсөткүчтөрү</h2>
                <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={teamChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridStroke }} tickLine={false} />
                        <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: tooltipStyle.color }} cursor={{ fill: 'var(--gridline)', opacity: 0.4 }} />
                        <Bar dataKey="avgScore" fill="var(--accent)" name="Орточо упай (Рейтинг)" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="totalScore" fill="var(--border)" name="Жалпы упай" radius={[2, 2, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};
