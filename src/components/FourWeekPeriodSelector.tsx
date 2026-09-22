import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DataFile } from '../types';

interface FourWeekPeriodSelectorProps {
    data: DataFile;
    selectedPeriod: number;
    setSelectedPeriod: (period: number) => void;
}

export const FourWeekPeriodSelector: React.FC<FourWeekPeriodSelectorProps> = ({
    data,
    selectedPeriod,
    setSelectedPeriod
}) => {
    const totalWeeks = data.weeks.length;
    const totalPeriods = Math.ceil(totalWeeks / 4);

    const startWeekIndex = selectedPeriod * 4;
    const endWeekIndex = Math.min(startWeekIndex + 4, totalWeeks);
    const weeksForPeriod = data.weeks.slice(startWeekIndex, endWeekIndex);

    const actualStartWeek = weeksForPeriod[0]?.weekNumber || 1;
    const actualEndWeek = weeksForPeriod[weeksForPeriod.length - 1]?.weekNumber || 4;
    const startDate = weeksForPeriod[0]?.date?.split(' -- ')[0] || '';
    const endDate = weeksForPeriod[weeksForPeriod.length - 1]?.date?.split(' -- ')[1]?.trim() || '';

    return (
        <div className="rounded-2xl shadow-sm border p-4 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>4-Апталык мезгил тандоо:</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Мезгил {selectedPeriod + 1} / {totalPeriods}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedPeriod(Math.max(0, selectedPeriod - 1))}
                            disabled={selectedPeriod === 0}
                            className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: 'color-mix(in oklab, var(--text-secondary) 10%, transparent)' }}
                        >
                            <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                        </button>
                        <div className="px-6 py-2 rounded-lg" style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 12%, transparent)' }}>
                            <span className="font-bold" style={{ color: 'var(--accent)' }}>
                                Апта {actualStartWeek} - {actualEndWeek}
                            </span>
                            {(startDate || endDate) && (
                                <span className="text-sm ml-2" style={{ color: 'var(--text-secondary)' }}>
                                    ({startDate} - {endDate})
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedPeriod(Math.min(totalPeriods - 1, selectedPeriod + 1))}
                            disabled={selectedPeriod === totalPeriods - 1}
                            className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: 'color-mix(in oklab, var(--text-secondary) 10%, transparent)' }}
                        >
                            <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
