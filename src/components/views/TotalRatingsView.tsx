import React from 'react';
import type { DataFile } from '../../types';
import { calculateMemberScore } from '../../utils/scoring';

interface TotalRatingsViewProps {
    data: DataFile;
    fromWeek?: number;
}

const th: React.CSSProperties = {
    textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--text-muted)', fontWeight: 600, padding: '0 12px 10px', borderBottom: '1px solid var(--text-primary)'
};
const td: React.CSSProperties = { padding: '11px 12px', fontSize: '14px', borderBottom: '1px solid var(--border)' };
const rankCell: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' };
const pad2 = (n: number) => String(n).padStart(2, '0');

export const TotalRatingsView: React.FC<TotalRatingsViewProps> = ({ data, fromWeek = 5 }) => {
    const relevantWeeks = data.weeks.filter(w => w.weekNumber >= fromWeek);

    const teamNames = data.weeks[0]?.teams.map(t => t.name) ?? [];
    const totalRatings = teamNames.map(teamName => {
        const weeklyScores: number[] = [];
        relevantWeeks.forEach(weekData => {
            const team = weekData.teams.find(t => t.name === teamName);
            if (team && team.members.length > 0) {
                const avg = team.members.reduce((sum, m) => sum + calculateMemberScore(m), 0) / team.members.length;
                weeklyScores.push(Math.round(avg * 10) / 10);
            }
        });
        const totalScore = weeklyScores.reduce((a, b) => a + b, 0);
        const averageScore = weeklyScores.length > 0 ? totalScore / weeklyScores.length : 0;
        return {
            teamName,
            totalScore: Math.round(totalScore * 10) / 10,
            weeklyScores,
            averageScore: Math.round(averageScore * 10) / 10
        };
    }).sort((a, b) => b.totalScore - a.totalScore);

    return (
        <div>
            <div className="mb-8">
                <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Жалпы рейтинг ({fromWeek}-аптадан)</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{fromWeek}-аптадан баштап акыркы аптага чейинки үйлөрдүн жалпы рейтингдери (орточо упайлардын суммасы)</p>
            </div>

            {relevantWeeks.length === 0 ? (
                <div className="text-center py-12 font-serif text-lg" style={{ color: 'var(--text-muted)' }}>{fromWeek}-аптадан баштап маалымат табылган жок.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={th}>#</th>
                                <th style={th}>Үй</th>
                                <th style={{ ...th, textAlign: 'center' }}>Катышкан апталар</th>
                                <th style={{ ...th, textAlign: 'right' }}>Жалпы упай</th>
                                <th style={{ ...th, textAlign: 'right' }}>Орточо упай</th>
                            </tr>
                        </thead>
                        <tbody>
                            {totalRatings.map((team, idx) => (
                                <tr key={team.teamName}>
                                    <td style={{ ...td, ...rankCell }}>{pad2(idx + 1)}</td>
                                    <td style={{ ...td, fontWeight: 600, color: 'var(--text-primary)' }}>{team.teamName}</td>
                                    <td style={{ ...td, textAlign: 'center', color: 'var(--text-secondary)' }}>{team.weeklyScores.length}</td>
                                    <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-serif)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: '15px' }}>{team.totalScore}</td>
                                    <td style={{ ...td, textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{team.averageScore}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
