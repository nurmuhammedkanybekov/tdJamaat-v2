import React, { useLayoutEffect, useRef, useState } from 'react';
import { TABS } from './navigation';
import type { ActiveView } from './navigation';
import { t } from '../i18n';

interface ViewNavigatorProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
}

// Tablet/desktop: a sticky row of letterspaced text tabs, centered, with a
// gold hairline under the active one. Phone: a fixed bottom bar within thumb
// reach, thin-line icons, gold when active.
export const ViewNavigator: React.FC<ViewNavigatorProps> = ({ activeView, setActiveView }) => {
    // Desktop: one gold line that slides to the active tab (measured, since
    // the tabs have different widths).
    const listRef = useRef<HTMLDivElement>(null);
    const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
    useLayoutEffect(() => {
        const measure = () => {
            const list = listRef.current;
            const el = list?.querySelector<HTMLElement>(`[data-view="${activeView}"]`);
            if (!list || !el || !el.offsetWidth) return;
            setBar({ left: el.offsetLeft + 16, width: el.offsetWidth - 32 });
        };
        measure();
        window.addEventListener('resize', measure);
        document.fonts?.ready.then(measure).catch(() => undefined);
        return () => window.removeEventListener('resize', measure);
    }, [activeView]);
    const activeIndex = Math.max(0, TABS.findIndex(it => it.key === activeView));
    return (
    <>
        <nav
            className="hidden md:block sticky top-0 z-30 page-gutter"
            style={{ backgroundColor: 'color-mix(in oklab, var(--page-plane) 90%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
            aria-label={t('Бөлүмдөр')}
        >
            <div ref={listRef} className="app-container relative flex justify-center gap-1 lg:gap-4" role="tablist">
                {bar && <span aria-hidden="true" className="nav-indicator" style={{ left: bar.left, width: bar.width }} />}
                {TABS.map(({ key, label }) => {
                    const active = activeView === key;
                    return (
                        <button
                            key={key}
                            data-view={key}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveView(key)}
                            className="relative whitespace-nowrap px-4 py-4 text-[0.95rem] transition-colors hover:text-[var(--text-primary)]"
                            style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: active ? 500 : 400 }}
                        >
                            {label}
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
            aria-label={t('Бөлүмдөр')}
        >
            <div className="grid relative" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }} role="tablist">
                {/* The same gold line as on desktop, sliding along the top of the bar. */}
                <span aria-hidden="true" className="absolute top-[-1px] h-px transition-[left] duration-500" style={{ left: `calc(${activeIndex} * 100% / ${TABS.length} + (100% / ${TABS.length} - 2rem) / 2)`, width: '2rem', backgroundColor: 'var(--gold)', boxShadow: '0 0 10px var(--gold)', transitionTimingFunction: 'cubic-bezier(0.3, 0.8, 0.2, 1)' }} />
                {TABS.map(({ key, short, icon: Icon }) => {
                    const active = activeView === key;
                    return (
                        <button
                            key={key}
                            data-view={key}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveView(key)}
                            className="relative flex flex-col items-center justify-center gap-1.5 pt-3 pb-2.5 min-h-[3.6rem] transition-[color,transform] duration-200 active:scale-[0.94]"
                            style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}
                        >
                            <Icon className="w-[1.2rem] h-[1.2rem]" strokeWidth={1.3} />
                            <span className="text-[0.7rem] leading-none max-w-full truncate">{short}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    </>
);
};
