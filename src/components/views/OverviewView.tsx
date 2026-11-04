// The Week tab: your house (the desk), the week's top three, then the two
// league tables. Who leads the week is the hero above (AppHeader).
import React, { useMemo } from 'react';
import type { DataFile } from '../../types';
import type { Insights, MemberSeries, MemberWeek } from '../../utils/insights';
import { weekOf } from '../../utils/insights';
import { Laureate, Podium } from '../Podium';
import { HouseTable, PeopleTable } from './Standings';
import { t } from '../../i18n';

interface OverviewViewProps {
    data: DataFile;
    weekIndex: number;
    insights: Insights;
    onOpenProfile: (memberId: string) => void;
    /** The logged-in captain's (or admin's) desk, shown first. */
    desk?: React.ReactNode;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ data, weekIndex, insights, onOpenProfile, desk }) => {
    const week = data.weeks[weekIndex];
    const top = useMemo(() => [...insights.members.values()]
        .map(s => ({ s, w: weekOf(s.weeks, weekIndex) }))
        .filter((x): x is { s: MemberSeries; w: MemberWeek } => !!x.w && x.w.submitted && x.w.score > 0 && x.w.rank !== null && x.w.rank <= 3)
        .sort((a, b) => a.w.rank! - b.w.rank!)
        .slice(0, 3), [insights, weekIndex]);

    return (
        <div className="space-y-12 sm:space-y-16">
            {/* The desk floats over the lower edge of the night band. */}
            {desk && <div className="relative z-[1] -mt-8 md:mt-10">{desk}</div>}
            {top.length > 0 && (
                <section aria-label={t('Аптанын үч мыктысы')}>
                    <h2 className="section-title text-center mb-8 sm:mb-10">{t('Аптанын үч мыктысы')}</h2>
                    <div key={`podium-${weekIndex}`} className="hidden sm:block">
                        <Podium top={top} weekIndex={weekIndex} onOpen={onOpenProfile} />
                    </div>
                    <div key={`list-${weekIndex}`} className="sm:hidden card divide-y divide-[var(--border)] px-4">
                        {top.map(({ s, w }, i) => <Laureate key={s.id} s={s} w={w} weekIndex={weekIndex} onOpen={() => onOpenProfile(s.id)} delay={i * 120} />)}
                    </div>
                </section>
            )}
            <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-start">
                <HouseTable insights={insights} weekIndex={weekIndex} scope="week" week={week} />
                <PeopleTable insights={insights} weekIndex={weekIndex} scope="week" title={t('Бардык катышуучулар')} onOpenProfile={onOpenProfile} limit={12} />
            </div>
        </div>
    );
};
