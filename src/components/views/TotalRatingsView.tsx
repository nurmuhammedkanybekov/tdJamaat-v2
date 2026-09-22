import React from 'react';
import { Star } from 'lucide-react';
import type { DataFile } from '../../types';
import { calculateMemberScore } from '../../utils/scoring';

interface TotalRatingsViewProps {
    data: DataFile;
    fromWeek?: number;
}

const RANK_BG = ['#f5c518', '#c9ccd1', '#e0913f'];

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

    const rankBadgeStyle = (idx: number): React.CSSProperties =>
        idx < 3
            ? { backgroundColor: RANK_BG[idx], color: '#171412' }
            : { backgroundColor: 'color-mix(in oklab, var(--accent) 14%, transparent)', color: 'var(--accent)' };

    return (
        <div className="rounded-2xl shadow-sm border p-6 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 mb-6">
                <Star className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Жалпы рейтинг ({fromWeek}-аптадан)</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>{fromWeek}-аптадан баштап акыркы аптага чейинки үйлөрдүн жалпы рейтингдери (орточо упайлардын суммасы)</p>
                </div>
            </div>

            {relevantWeeks.length === 0 ? (
                <div className="text-center p-8 font-semibold" style={{ color: 'var(--text-muted)' }}>{fromWeek}-аптадан баштап маалымат табылган жок.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 8%, transparent)' }}>
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>№</th>
                                <th className="px-6 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Үй</th>
                                <th className="px-6 py-3 text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>Катышкан апталар</th>
                                <th className="px-6 py-3 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Жалпы упай (Сумма)</th>
                                <th className="px-6 py-3 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Орточо упай</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {totalRatings.map((team, idx) => (
                                <tr key={team.teamName} className="transition-colors hover:brightness-95">
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold" style={rankBadgeStyle(idx)}>
                                            {idx + 1}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{team.teamName}</td>
                                    <td className="px-6 py-4 text-center" style={{ color: 'var(--text-secondary)' }}>{team.weeklyScores.length}</td>
                                    <td className="px-6 py-4 text-right font-bold text-lg" style={{ color: 'var(--accent)' }}>{team.totalScore}</td>
                                    <td className="px-6 py-4 text-right" style={{ color: 'var(--text-muted)' }}>{team.averageScore}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
