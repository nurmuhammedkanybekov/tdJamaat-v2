import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

const th: React.CSSProperties = {
    textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--text-muted)', fontWeight: 600, padding: '0 12px 10px', borderBottom: '1px solid var(--text-primary)'
};
const td: React.CSSProperties = { padding: '11px 12px', fontSize: '14px', borderBottom: '1px solid var(--border)' };
const rankCell: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' };
const pad2 = (n: number) => String(n).padStart(2, '0');

const TREND_LABEL: Record<FourWeekRow['trends'], string> = { up: '↑ Өсүш', down: '↓ Төмөндөш', stable: '→ Туруктуулук' };

export const FourWeekReportView: React.FC<FourWeekReportViewProps> = ({ data, selectedPeriod, isDark }) => {
    if (data.weeks.length === 0) return null;

    const good = isDark ? '#199e70' : '#1baf7a';
    const bad = isDark ? '#e66767' : '#e34948';

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
        <div>
            <div className="mb-1">
                <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>4-Апталык отчет (Рейтинг)</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Апта {actualStartWeek}&ndash;{actualEndWeek} — үйлөрдүн ортосундагы рейтинги
                </p>
            </div>

            {rows.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 my-8">
                    {[
                        { label: 'Эң мыкты үй', value: rows[0]?.teamName ?? '—', sub: `Орточо упай: ${rows[0]?.averageScore ?? '—'}` },
                        { label: 'Эң тез өсүү', value: fastestRising?.teamName ?? 'Жок', sub: 'Ийгиликтүү тенденция' },
                        { label: 'Жалпы статистика', value: `${rows.length} үй`, sub: `${actualStartWeek}–${actualEndWeek} апталар үчүн` }
                    ].map((stat, i) => (
                        <div key={stat.label} className="px-0 sm:px-6" style={i > 0 ? { borderLeft: '1px solid var(--border)' } : undefined}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{stat.label}</div>
                            <div className="font-serif" style={{ fontSize: '22px', fontWeight: 500, marginTop: '6px' }}>{stat.value}</div>
                            <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{stat.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="overflow-x-auto mb-10">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={th}>#</th>
                            <th style={th}>Үй</th>
                            {rows[0]?.weeklyScores.map((_, idx) => (
                                <th key={idx} style={{ ...th, textAlign: 'center' }}>Апта {actualStartWeek + idx}</th>
                            ))}
                            <th style={{ ...th, textAlign: 'center' }}>Орточо</th>
                            <th style={{ ...th, textAlign: 'center' }}>Эң жакшы</th>
                            <th style={{ ...th, textAlign: 'center' }}>Эң начар</th>
                            <th style={{ ...th, textAlign: 'center' }}>Тенденция</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.teamName}>
                                <td style={{ ...td, ...rankCell }}>{pad2(row.ranking)}</td>
                                <td style={{ ...td, fontWeight: 600, color: 'var(--text-primary)' }}>{row.teamName}</td>
                                {row.weeklyScores.map((score, i) => (
                                    <td key={i} style={{ ...td, textAlign: 'center', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{score.toFixed(1)}</td>
                                ))}
                                <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--font-serif)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{row.averageScore}</td>
                                <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: good, fontVariantNumeric: 'tabular-nums' }}>{row.bestWeek}</td>
                                <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: bad, fontVariantNumeric: 'tabular-nums' }}>{row.worstWeek}</td>
                                <td style={{ ...td, textAlign: 'center' }}>
                                    <span
                                        className="font-semibold text-sm"
                                        style={{ color: row.trends === 'up' ? good : row.trends === 'down' ? bad : 'var(--accent)' }}
                                    >
                                        {TREND_LABEL[row.trends]}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {weeksForPeriod.length > 0 && (
                <div>
                    <h3 className="font-serif text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{actualStartWeek}&ndash;{actualEndWeek} апталар боюнча графика</h3>
                    <ResponsiveContainer width="100%" height={360}>
                        <LineChart data={weeksForPeriod.map(week => {
                            const point: Record<string, number | string> = { week: `Апта ${week.weekNumber}` };
                            week.teams.forEach(team => {
                                if (team.members.length === 0) return;
                                const avg = team.members.reduce((sum, m) => sum + calculateMemberScore(m), 0) / team.members.length;
                                point[team.name] = Math.round(avg * 10) / 10;
                            });
                            return point;
                        })}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                            <XAxis dataKey="week" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridStroke }} tickLine={false} />
                            <YAxis label={{ value: 'Орточо упай', angle: -90, position: 'insideLeft', fill: axisColor, fontSize: 12 }} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: tooltipStyle.color }} />
                            <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
                            {rows.map((row, idx) => (
                                <Line key={row.teamName} type="monotone" dataKey={row.teamName} stroke={TEAM_COLORS[idx % TEAM_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} name={row.teamName} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
