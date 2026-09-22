import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DataFile, Team } from '../../types';
import { TEAM_COLORS } from '../../utils/scoring';
import { getProgressData } from '../../utils/rankings';

interface ProgressViewProps {
    data: DataFile;
    currentTeams: Team[];
    isDark: boolean;
}

export const ProgressView: React.FC<ProgressViewProps> = ({ data, currentTeams, isDark }) => {
    const progressData = getProgressData(data);
    const allWeeks = [...data.weeks.map(w => w.weekNumber)].sort((a, b) => a - b);

    const lineChartData = allWeeks.map(weekNum => {
        const point: Record<string, number | string | null> = { week: `Апта ${weekNum}` };
        Object.keys(progressData).forEach(teamName => {
            const wk = progressData[teamName].find(w => w.weekNumber === weekNum);
            point[teamName] = wk ? wk.score : null;
        });
        return point;
    });

    const gridStroke = isDark ? '#2c2c2a' : '#e1e0d9';
    const axisColor = isDark ? '#c3c2b7' : '#52514e';
    const tooltipStyle = {
        backgroundColor: isDark ? '#1a1a19' : '#ffffff',
        border: `1px solid ${isDark ? '#2c2c2a' : '#e1e0d9'}`,
        borderRadius: 8,
        color: isDark ? '#ffffff' : '#0b0b0b'
    };

    return (
        <>
            <div className="rounded-2xl shadow-sm border p-6 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Үйлөрдүн апталык прогресси</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>График орточо упайга негизделген (адилеттүү салыштыруу үчүн)</p>
                <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={lineChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                        <XAxis dataKey="week" tick={{ fill: axisColor, fontSize: 12 }} />
                        <YAxis label={{ value: 'Орточо упай', angle: -90, position: 'insideLeft', fill: axisColor }} tick={{ fill: axisColor, fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: tooltipStyle.color }} />
                        <Legend wrapperStyle={{ color: axisColor }} />
                        {currentTeams.map((team, idx) => (
                            <Line
                                key={team.id}
                                type="monotone"
                                dataKey={team.name}
                                stroke={TEAM_COLORS[idx % TEAM_COLORS.length]}
                                strokeWidth={3}
                                name={team.name}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="rounded-2xl shadow-sm border p-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Апталар боюнча статистика</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentTeams.map((team, idx) => {
                        const teamProgress = progressData[team.name] || [];
                        const currentScore = teamProgress[teamProgress.length - 1]?.score || 0;
                        const previousScore = teamProgress[teamProgress.length - 2]?.score || 0;
                        const change = currentScore - previousScore;
                        const teamColor = TEAM_COLORS[idx % TEAM_COLORS.length];

                        return (
                            <div key={team.id} className="p-4 rounded-xl border-2" style={{ backgroundColor: 'var(--page-plane)', borderColor: teamColor }}>
                                <h3 className="font-bold text-lg mb-2" style={{ color: teamColor }}>{team.name}</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>Азыркы орточо:</span>
                                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{currentScore.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>Өзгөрүү:</span>
                                        <span className="font-semibold" style={{ color: change >= 0 ? '#1baf7a' : '#e34948' }}>
                                            {change >= 0 ? '+' : ''}{change.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>Апталар:</span>
                                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{teamProgress.length}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
};
