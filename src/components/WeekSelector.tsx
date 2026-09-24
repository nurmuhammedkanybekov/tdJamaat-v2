import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DataFile } from '../types';

interface WeekSelectorProps {
    data: DataFile;
    selectedWeek: number;
    setSelectedWeek: (week: number) => void;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({ data, selectedWeek, setSelectedWeek }) => {
    const currentWeekData = data.weeks[selectedWeek];

    return (
        <div className="mb-7">
            <div
                className="flex items-center justify-between flex-wrap gap-3 px-5 py-4"
                style={{ border: '1px solid var(--border)', borderRadius: '3px', backgroundColor: 'var(--surface)' }}
            >
            <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Апта тандоо
                </span>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
                    disabled={selectedWeek === 0}
                    className="p-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    style={{ border: '1px solid var(--border)', borderRadius: '3px' }}
                >
                    <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                </button>
                <div className="font-serif font-variant-tabular text-center" style={{ minWidth: '150px' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '15px' }}>Апта {currentWeekData.weekNumber}</span>
                    <span className="text-sm ml-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>({currentWeekData.date})</span>
                </div>
                <button
                    onClick={() => setSelectedWeek(Math.min(data.weeks.length - 1, selectedWeek + 1))}
                    disabled={selectedWeek === data.weeks.length - 1}
                    className="p-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    style={{ border: '1px solid var(--border)', borderRadius: '3px' }}
                >
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                </button>
            </div>
            </div>
        </div>
    );
};
