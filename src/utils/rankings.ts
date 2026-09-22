import type { Team, TeamRanking, MemberRanking, MetricValues, DataFile } from '../types';
import { calculateMemberScore, calculateTeamScore, weights } from './scoring';

export const getTeamMemberRankings = (team: Team): MemberRanking[] => {
    const membersWithScores = team.members.map((member, idx) => ({
        ...member,
        index: idx,
        score: calculateMemberScore(member),
        performancePercentages: Object.keys(weights).reduce((acc, metric) => {
            const m = metric as keyof MetricValues;
            acc[m] = (member.actual[m] / member.target[m]) * 100;
            return acc;
        }, {} as MetricValues)
    }));

    return membersWithScores.sort((a, b) => b.score - a.score).map((member, rank) => ({
        ...member,
        rank: rank + 1
    }));
};

export const getOverallTeamRankings = (teams: Team[]): TeamRanking[] => {
    return teams.map((team, idx) => {
        const totalScore = calculateTeamScore(team);
        const avgMemberScore = Math.round(team.members.reduce((sum, m) => sum + calculateMemberScore(m), 0) / team.members.length * 10) / 10;
        return {
            name: team.name,
            index: idx,
            totalScore: totalScore,
            avgMemberScore: avgMemberScore,
            memberCount: team.members.length
        };
    }).sort((a, b) => b.avgMemberScore - a.avgMemberScore).map((team, rank) => ({
        ...team,
        rank: rank + 1
    }));
};

export interface ProgressPoint {
    week: string;
    weekNumber: number;
    score: number;
    rank: number;
    date: string;
}

export const getProgressData = (data: DataFile): { [key: string]: ProgressPoint[] } => {
    const progressByTeam: { [key: string]: ProgressPoint[] } = {};

    data.weeks.forEach((weekData) => {
        const rankings = getOverallTeamRankings(weekData.teams);

        rankings.forEach((teamRank) => {
            if (!progressByTeam[teamRank.name]) {
                progressByTeam[teamRank.name] = [];
            }

            progressByTeam[teamRank.name].push({
                week: `Апта ${weekData.weekNumber}`,
                weekNumber: weekData.weekNumber,
                score: teamRank.avgMemberScore,
                rank: teamRank.rank,
                date: weekData.date
            });
        });
    });

    return progressByTeam;
};

