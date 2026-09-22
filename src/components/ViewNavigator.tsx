import React from 'react';
import { Users, TrendingUp, Calendar, Award, Star } from 'lucide-react';

type ActiveView = 'overview' | 'teams' | 'progress' | 'fourweekreport' | 'totalratings';

interface ViewNavigatorProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
}

const TABS: { key: ActiveView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'overview', label: 'Жалпы көрүнүш', icon: Users },
    { key: 'teams', label: 'Үй ичиндеги рейтинг', icon: TrendingUp },
    { key: 'progress', label: 'Апталык прогресс', icon: Calendar },
    { key: 'fourweekreport', label: '4-Апталык отчёт', icon: Award },
    { key: 'totalratings', label: 'Жалпы рейтинг (5-аптадан)', icon: Star }
];

export const ViewNavigator: React.FC<ViewNavigatorProps> = ({ activeView, setActiveView }) => {
    return (
        <div className="rounded-2xl shadow-sm border p-2 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex gap-1 overflow-x-auto">
                {TABS.map(({ key, label, icon: Icon }) => {
                    const active = activeView === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveView(key)}
                            className="flex-1 py-3 px-4 rounded-xl font-semibold whitespace-nowrap transition-colors"
                            style={active
                                ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                                : { color: 'var(--text-secondary)' }}
                        >
                            <Icon className="w-5 h-5 inline mr-2" />
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
