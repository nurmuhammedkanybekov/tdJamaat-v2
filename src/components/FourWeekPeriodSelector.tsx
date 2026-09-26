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
        <div className="mb-7">
            <div
                className="flex items-center justify-between flex-wrap gap-3 px-4 sm:px-5 py-3 sm:py-4"
                style={{ border: '1px solid var(--border)', borderRadius: '3px', backgroundColor: 'var(--surface)' }}
            >
            <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    4-Апталык мезгил
                </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {selectedPeriod + 1} / {totalPeriods}
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-3 flex-1 sm:flex-none">
                    <button
                    aria-label="Мурунку мезгил"
                        onClick={() => setSelectedPeriod(Math.max(0, selectedPeriod - 1))}
                        disabled={selectedPeriod === 0}
                        className="inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:p-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ border: '1px solid var(--border)', borderRadius: '3px' }}
                    >
                        <ChevronLeft aria-hidden="true" className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                    </button>
                    <div className="font-serif font-variant-tabular text-center flex-1 sm:flex-none min-w-0 sm:min-w-[160px]">
                        <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
                            Апта {actualStartWeek}&ndash;{actualEndWeek}
                        </span>
                        {(startDate || endDate) && (
                            <span className="text-sm ml-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                                ({startDate} - {endDate})
                            </span>
                        )}
                    </div>
                    <button
                    aria-label="Кийинки мезгил"
                        onClick={() => setSelectedPeriod(Math.min(totalPeriods - 1, selectedPeriod + 1))}
                        disabled={selectedPeriod === totalPeriods - 1}
                        className="inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:p-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ border: '1px solid var(--border)', borderRadius: '3px' }}
                    >
                        <ChevronRight aria-hidden="true" className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                    </button>
                </div>
            </div>
            </div>
        </div>
    );
};
