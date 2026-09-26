import { useIsPhone } from '../../hooks/useMediaQuery';
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
    const isPhone = useIsPhone();
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
            <div className="mb-12">
                <h2 className="font-serif text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Үйлөрдүн апталык прогресси</h2>
                <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>График орточо упайга негизделген (адилеттүү салыштыруу үчүн)</p>
                <ResponsiveContainer width="100%" height={isPhone ? 300 : 460}>
                    <LineChart data={lineChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="week" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridStroke }} tickLine={false} />
                        <YAxis label={{ value: 'Орточо упай', angle: -90, position: 'insideLeft', fill: axisColor, fontSize: 12 }} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: tooltipStyle.color }} />
                        <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
                        {currentTeams.map((team, idx) => (
                            <Line
                                key={team.id}
                                type="monotone"
                                dataKey={team.name}
                                stroke={TEAM_COLORS[idx % TEAM_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                name={team.name}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div>
                <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Апталар боюнча статистика</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                    {currentTeams.map((team, idx) => {
                        const teamProgress = progressData[team.name] || [];
                        const currentScore = teamProgress[teamProgress.length - 1]?.score || 0;
                        const previousScore = teamProgress[teamProgress.length - 2]?.score || 0;
                        const change = currentScore - previousScore;
                        const teamColor = TEAM_COLORS[idx % TEAM_COLORS.length];

                        return (
                            <div key={team.id} className="pl-3" style={{ borderLeft: `2px solid ${teamColor}` }}>
                                <h3 className="font-serif font-semibold mb-2" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{team.name}</h3>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Азыркы орточо</span>
                                        <span className="font-semibold font-variant-tabular" style={{ color: 'var(--text-primary)' }}>{currentScore.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Өзгөрүү</span>
                                        <span className="font-semibold font-variant-tabular" style={{ color: change >= 0 ? (isDark ? '#199e70' : '#1baf7a') : (isDark ? '#e66767' : '#e34948') }}>
                                            {change >= 0 ? '+' : ''}{change.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Апталар</span>
                                        <span className="font-semibold font-variant-tabular" style={{ color: 'var(--text-primary)' }}>{teamProgress.length}</span>
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
