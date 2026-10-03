import React from 'react';
import { TABS } from './navigation';
import type { ActiveView } from './navigation';

interface ViewNavigatorProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
}

// Tablet/desktop: a sticky row of letterspaced text tabs, centered, with a
// gold hairline under the active one. Phone: a fixed bottom bar within thumb
// reach, thin-line icons, gold when active.
export const ViewNavigator: React.FC<ViewNavigatorProps> = ({ activeView, setActiveView }) => (
    <>
        <nav
            className="hidden md:block sticky top-0 z-30 page-gutter"
            style={{ backgroundColor: 'color-mix(in oklab, var(--page-plane) 90%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
            aria-label="Бөлүмдөр"
        >
            <div className="app-container flex justify-center gap-2 lg:gap-6" role="tablist">
                {TABS.map(({ key, label, short }) => {
                    const active = activeView === key;
                    return (
                        <button
                            key={key}
                            data-view={key}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveView(key)}
                            className="relative whitespace-nowrap px-3 py-4 text-[0.68rem] tracking-[0.18em] uppercase transition-colors hover:text-[var(--text-primary)]"
                            style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}
                        >
                            <span className="lg:hidden">{short}</span>
                            <span className="hidden lg:inline">{label}</span>
                            <span className="absolute left-3 right-3 -bottom-px h-px transition-opacity" style={{ backgroundColor: 'var(--gold)', opacity: active ? 1 : 0 }} />
                        </button>
                    );
                })}
            </div>
        </nav>

        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-40"
            style={{
                backgroundColor: 'color-mix(in oklab, var(--page-plane) 94%, transparent)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
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
                            className="flex flex-col items-center justify-center gap-1.5 pt-3 pb-2.5 min-h-[3.6rem] transition-colors"
                            style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}
                        >
                            <Icon className="w-[1.2rem] h-[1.2rem]" strokeWidth={1.3} />
                            <span className="text-[0.58rem] tracking-[0.06em] uppercase leading-none">{short}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    </>
);
