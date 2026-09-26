import React, { useEffect, useRef } from 'react';
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

// On a phone the five tabs don't fit, so the row swipes sideways (with a
// fade at the edge as a hint) and the selected tab is always scrolled fully
// into view. From `sm` up it's the regular underline tab bar.
export const ViewNavigator: React.FC<ViewNavigatorProps> = ({ activeView, setActiveView }) => {
    const rowRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLButtonElement>(null);

    // Scroll only the tab row, horizontally — never the page itself.
    useEffect(() => {
        const row = rowRef.current, tab = activeRef.current;
        if (!row || !tab || row.scrollWidth <= row.clientWidth) return;
        const target = tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2;
        row.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }, [activeView]);

    return (
        <nav className="mb-7 -mx-4 sm:mx-0" style={{ borderBottom: '1px solid var(--border)' }} aria-label="Бөлүмдөр">
            <div ref={rowRef} className="scroll-row scroll-fade relative flex gap-5 sm:gap-6 px-4 sm:px-0" role="tablist">
                {TABS.map(({ key, label, icon: Icon }) => {
                    const active = activeView === key;
                    return (
                        <button
                            key={key}
                            ref={active ? activeRef : undefined}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveView(key)}
                            className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 pb-3 pt-2 sm:pt-1"
                            style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                                marginBottom: '-1px'
                            }}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
