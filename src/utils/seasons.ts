// Season helpers. The database numbers weeks continuously across seasons;
// people see each season starting again at "1-апта".
import type { DataFile, Season } from '../types';
import { t } from '../i18n';

export const runningSeason = (seasons: Season[]): Season | undefined => seasons.find(s => s.lastWeek === null);

/**
 * One season's weeks, renumbered from 1 for display. `globalWeek` keeps the
 * database number for anything that saves or locks.
 */
export const seasonView = (data: DataFile, seasonId: number): DataFile => ({
    seasons: data.seasons,
    weeks: data.weeks.filter(w => w.seasonId === seasonId).map(w => ({ ...w, weekNumber: w.seasonWeek }))
});

/** Season to show first: the running one if it has weeks, else the latest with weeks. */
export const defaultSeasonId = (data: DataFile): number | null => {
    const withWeeks = data.seasons.filter(s => data.weeks.some(w => w.seasonId === s.id));
    const running = runningSeason(data.seasons);
    if (running && withWeeks.some(s => s.id === running.id)) return running.id;
    return withWeeks.length ? withWeeks[withWeeks.length - 1].id : running?.id ?? null;
};

/** "5-апта" for a database week number; adds the season name when it isn't the running season. */
export const weekLabel = (data: DataFile, globalWeek: number): string => {
    const w = data.weeks.find(x => x.globalWeek === globalWeek);
    const running = runningSeason(data.seasons);
    if (w) {
        const season = data.seasons.find(s => s.id === w.seasonId);
        return season && running && season.id !== running.id ? t('{0} · {1}-апта', season.name, w.seasonWeek) : t('{0}-апта', w.seasonWeek);
    }
    // A week not opened yet (e.g. the next one) belongs to the running season.
    if (running && globalWeek >= running.firstWeek) return t('{0}-апта', globalWeek - running.firstWeek + 1);
    return t('{0}-апта', globalWeek);
};

/** First database week of the season a week belongs to (for carrying targets forward within a season). */
export const seasonStartFor = (data: DataFile, globalWeek: number): number => {
    const sorted = [...data.seasons].sort((a, b) => b.firstWeek - a.firstWeek);
    return sorted.find(s => globalWeek >= s.firstWeek)?.firstWeek ?? 0;
};
