import React from 'react';
import { TABS } from './navigation';
import type { ActiveView } from './navigation';


interface ViewNavigatorProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
}


// Tablet/desktop: a sticky tab bar under the hero. Phone: a fixed bottom
// tab bar within thumb reach (like a native app), so all five sections are
// always one tap away instead of hidden in a sideways-scrolling row.
export const ViewNavigator: React.FC<ViewNavigatorProps> = ({ activeView, setActiveView }) => (
    <>
        <nav
            className="hidden md:block sticky top-0 z-30 page-gutter"
            style={{ backgroundColor: 'color-mix(in oklab, var(--page-plane) 88%, transparent)', backdropFilter: 'saturate(1.4) blur(10px)', WebkitBackdropFilter: 'saturate(1.4) blur(10px)', borderBottom: '1px solid var(--border)' }}
            aria-label="Бөлүмдөр"
        >
            <div className="app-container flex gap-1 lg:gap-2" role="tablist">
                {TABS.map(({ key, label, short, icon: Icon }) => {
                    const active = activeView === key;
                    return (
                        <button
                            key={key}
                            data-view={key}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveView(key)}
                            className="relative flex items-center gap-2 whitespace-nowrap px-3 lg:px-4 py-3.5 text-[0.88rem] font-bold transition-colors"
                            style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="lg:hidden">{short}</span>
                            <span className="hidden lg:inline">{label}</span>
                            <span
                                className="absolute left-2 right-2 -bottom-px h-[2.5px] rounded-full transition-all"
                                style={{ backgroundColor: 'var(--gold)', opacity: active ? 1 : 0, transform: active ? 'scaleX(1)' : 'scaleX(0.4)' }}
                            />
                        </button>
                    );
                })}
            </div>
        </nav>

        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-40"
            style={{
                backgroundColor: 'color-mix(in oklab, var(--surface) 92%, transparent)',
                backdropFilter: 'saturate(1.4) blur(14px)', WebkitBackdropFilter: 'saturate(1.4) blur(14px)',
                borderTop: '1px solid var(--border)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)'
            }}
            aria-label="Бөлүмдөр"
        >
            <div className="grid grid-cols-5" role="tablist">
                {TABS.map(({ key, short, icon: Icon }) => {
                    const active = activeView === key;
                    return (
                        <button
                            key={key}
                            data-view={key}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveView(key)}
                            className="relative flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 min-h-[3.6rem]"
                            style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                        >
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] w-8 rounded-b-full transition-opacity" style={{ backgroundColor: 'var(--gold)', opacity: active ? 1 : 0 }} />
                            <Icon className="w-[1.3rem] h-[1.3rem]" strokeWidth={active ? 2.3 : 1.8} />
                            <span className="text-[0.66rem] font-bold leading-none">{short}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    </>
);
