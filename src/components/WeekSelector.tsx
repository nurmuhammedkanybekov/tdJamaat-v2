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
        <div className="rounded-2xl shadow-sm border p-4 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Апта тандоо:</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
                        disabled={selectedWeek === 0}
                        className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        style={{ backgroundColor: 'color-mix(in oklab, var(--text-secondary) 10%, transparent)' }}
                    >
                        <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                    </button>
                    <div className="px-6 py-2 rounded-lg" style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 12%, transparent)' }}>
                        <span className="font-bold" style={{ color: 'var(--accent)' }}>Апта {currentWeekData.weekNumber}</span>
                        <span className="text-sm ml-2" style={{ color: 'var(--text-secondary)' }}>({currentWeekData.date})</span>
                    </div>
                    <button
                        onClick={() => setSelectedWeek(Math.min(data.weeks.length - 1, selectedWeek + 1))}
                        disabled={selectedWeek === data.weeks.length - 1}
                        className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        style={{ backgroundColor: 'color-mix(in oklab, var(--text-secondary) 10%, transparent)' }}
                    >
                        <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                    </button>
                </div>
            </div>
        </div>
    );
};
