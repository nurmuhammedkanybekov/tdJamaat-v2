import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Award, TrendingUp, Users, Info } from 'lucide-react';
import type { DataFile } from '../../types';
import { calculateMemberScore, TEAM_COLORS } from '../../utils/scoring';

interface FourWeekReportViewProps {
    data: DataFile;
    selectedPeriod: number;
    isDark: boolean;
}

interface FourWeekRow {
    teamName: string;
    weeklyScores: number[];
    averageScore: number;
    bestWeek: number;
    worstWeek: number;
    trends: 'up' | 'down' | 'stable';
    ranking: number;
    periodStart: number;
    periodEnd: number;
}

const RANK_BG = ['#f5c518', '#c9ccd1', '#e0913f'];

export const FourWeekReportView: React.FC<FourWeekReportViewProps> = ({ data, selectedPeriod, isDark }) => {
    if (data.weeks.length === 0) return null;

    const totalWeeks = data.weeks.length;
    const startWeekIndex = selectedPeriod * 4;
    const endWeekIndex = Math.min(startWeekIndex + 4, totalWeeks);
    const weeksForPeriod = data.weeks.slice(startWeekIndex, endWeekIndex);
    const actualStartWeek = weeksForPeriod[0]?.weekNumber ?? 1;
    const actualEndWeek = weeksForPeriod[weeksForPeriod.length - 1]?.weekNumber ?? 4;
    const teamNames = data.weeks[0]?.teams.map(t => t.name) ?? [];

    const rows: FourWeekRow[] = teamNames.map(teamName => {
        const weeklyScores: number[] = [];
        weeksForPeriod.forEach(weekData => {
            const team = weekData.teams.find(t => t.name === teamName);
            if (team && team.members.length > 0) {
                const avg = team.members.reduce((sum, m) => sum + calculateMemberScore(m), 0) / team.members.length;
                weeklyScores.push(Math.round(avg * 10) / 10);
            }
        });
        const averageScore = weeklyScores.length > 0 ? weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length : 0;
        const bestWeek = weeklyScores.length > 0 ? Math.max(...weeklyScores) : 0;
        const worstWeek = weeklyScores.length > 0 ? Math.min(...weeklyScores) : 0;
        const firstHalf = weeklyScores.slice(0, Math.ceil(weeklyScores.length / 2)).reduce((a, b) => a + b, 0);
        const secondHalf = weeklyScores.slice(Math.floor(weeklyScores.length / 2)).reduce((a, b) => a + b, 0);
        const trends: FourWeekRow['trends'] = secondHalf > firstHalf ? 'up' : secondHalf < firstHalf ? 'down' : 'stable';

        return {
            teamName, weeklyScores,
            averageScore: Math.round(averageScore * 10) / 10,
            bestWeek: Math.round(bestWeek * 10) / 10,
            worstWeek: Math.round(worstWeek * 10) / 10,
            trends, ranking: 0,
            periodStart: actualStartWeek, periodEnd: actualEndWeek
        };
    }).sort((a, b) => b.averageScore - a.averageScore)
        .map((row, idx) => ({ ...row, ranking: idx + 1 }));

    const fastestRising = rows.filter(t => t.trends === 'up')
        .sort((a, b) => (b.weeklyScores.at(-1)! - b.weeklyScores[0]) - (a.weeklyScores.at(-1)! - a.weeklyScores[0]))[0];

    const gridStroke = isDark ? '#2c2c2a' : '#e1e0d9';
    const axisColor = isDark ? '#c3c2b7' : '#52514e';
    const tooltipStyle = {
        backgroundColor: isDark ? '#1a1a19' : '#ffffff',
        border: `1px solid ${isDark ? '#2c2c2a' : '#e1e0d9'}`,
        borderRadius: 8,
        color: isDark ? '#ffffff' : '#0b0b0b'
    };

    const rankBadgeStyle = (ranking: number): React.CSSProperties =>
        ranking <= 3
            ? { backgroundColor: RANK_BG[ranking - 1], color: '#171412' }
            : { backgroundColor: 'color-mix(in oklab, var(--accent) 14%, transparent)', color: 'var(--accent)' };

    return (
        <div className="rounded-2xl shadow-sm border p-6 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 mb-6">
                <Award className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>4-Апталык отчет (Рейтинг)</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Үйлөрдүн 4 апта боюнча ортосундагы рейтинги</p>
                </div>
            </div>

            {rows.length > 0 && (
                <div className="rounded-2xl p-4 mb-6 border" style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 10%, var(--surface))', borderColor: 'var(--accent)' }}>
                    <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                        <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            <p className="font-semibold mb-1">Көрсөтүлгөн мезгил: Апта {actualStartWeek} - Апта {actualEndWeek}</p>
                            <p style={{ color: 'var(--text-secondary)' }}>Бул отчет тандалган 4 апта боюнча маалыматты көрсөтөт.</p>
                        </div>
                    </div>
                </div>
            )}

            {rows.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'color-mix(in oklab, #1baf7a 12%, var(--surface))', borderColor: '#1baf7a' }}>
                        <div className="flex items-center gap-3 mb-2">
                            <Award className="w-8 h-8" style={{ color: '#1baf7a' }} />
                            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Эң мыкты үй</h3>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: '#1baf7a' }}>{rows[0]?.teamName}</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Орточо упай: {rows[0]?.averageScore}</p>
                    </div>
                    <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 12%, var(--surface))', borderColor: 'var(--accent)' }}>
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Эң тез өсүү</h3>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{fastestRising?.teamName ?? 'Жок'}</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Ийгиликтуу тенденция</p>
                    </div>
                    <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'color-mix(in oklab, #4a3aa7 12%, var(--surface))', borderColor: '#4a3aa7' }}>
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="w-8 h-8" style={{ color: '#4a3aa7' }} />
                            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Жалпы статистика</h3>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: '#4a3aa7' }}>{rows.length} үй</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{actualStartWeek}-{actualEndWeek} апталар үчүн</p>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto mb-6">
                <table className="w-full">
                    <thead style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 8%, transparent)' }}>
                        <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Рейтинг</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Үй</th>
                            {rows[0]?.weeklyScores.map((_, idx) => (
                                <th key={idx} className="px-6 py-3 text-center text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Апта {actualStartWeek + idx}</th>
                            ))}
                            <th className="px-6 py-3 text-center text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Орточо упай</th>
                            <th className="px-6 py-3 text-center text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Эң жакшы</th>
                            <th className="px-6 py-3 text-center text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Эң начар</th>
                            <th className="px-6 py-3 text-center text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Тенденция</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {rows.map(row => (
                            <tr key={row.teamName} className="transition-colors hover:brightness-95">
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg" style={rankBadgeStyle(row.ranking)}>
                                        {row.ranking}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{row.teamName}</td>
                                {row.weeklyScores.map((score, i) => (
                                    <td key={i} className="px-6 py-4 text-center" style={{ color: 'var(--text-secondary)' }}>{score.toFixed(1)}</td>
                                ))}
                                <td className="px-6 py-4 text-center font-bold text-lg" style={{ color: 'var(--accent)' }}>{row.averageScore}</td>
                                <td className="px-6 py-4 text-center font-semibold" style={{ color: '#1baf7a' }}>{row.bestWeek}</td>
                                <td className="px-6 py-4 text-center font-semibold" style={{ color: '#e34948' }}>{row.worstWeek}</td>
                                <td className="px-6 py-4 text-center">
                                    {row.trends === 'up' && <span className="font-bold" style={{ color: '#1baf7a' }}>📈 Өсүш</span>}
                                    {row.trends === 'down' && <span className="font-bold" style={{ color: '#e34948' }}>📉 Төмөндөш</span>}
                                    {row.trends === 'stable' && <span className="font-bold" style={{ color: 'var(--accent)' }}>➡️ Туруктуулук</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {weeksForPeriod.length > 0 && (
                <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{actualStartWeek}-{actualEndWeek} апталар боюнча графика</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={weeksForPeriod.map(week => {
                            const point: Record<string, number | string> = { week: `Апта ${week.weekNumber}` };
                            week.teams.forEach(team => {
                                if (team.members.length === 0) return;
                                const avg = team.members.reduce((sum, m) => sum + calculateMemberScore(m), 0) / team.members.length;
                                point[team.name] = Math.round(avg * 10) / 10;
                            });
                            return point;
                        })}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                            <XAxis dataKey="week" tick={{ fill: axisColor, fontSize: 12 }} />
                            <YAxis label={{ value: 'Орточо упай', angle: -90, position: 'insideLeft', fill: axisColor }} tick={{ fill: axisColor, fontSize: 12 }} />
                            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: tooltipStyle.color }} />
                            <Legend wrapperStyle={{ color: axisColor }} />
                            {rows.map((row, idx) => (
                                <Line key={row.teamName} type="monotone" dataKey={row.teamName} stroke={TEAM_COLORS[idx % TEAM_COLORS.length]} strokeWidth={3} name={row.teamName} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
