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
        <div className="mb-7" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex gap-6 overflow-x-auto">
                {TABS.map(({ key, label, icon: Icon }) => {
                    const active = activeView === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveView(key)}
                            className="flex items-center gap-2 whitespace-nowrap pb-3 pt-1"
                            style={{
                                fontSize: '12.5px',
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                                borderBottom: active ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                                marginBottom: '-1px'
                            }}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
