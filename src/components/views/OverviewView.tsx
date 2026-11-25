// The Week tab: your house (the desk), the week's top three, then the two
// league tables. Who leads the week is the hero above (AppHeader).
import React, { useMemo } from 'react';
import type { DataFile } from '../../types';
import type { Insights, MemberSeries, MemberWeek } from '../../utils/insights';
import { weekOf } from '../../utils/insights';
import { Laureate, Podium } from '../Podium';
import { HouseTable, PeopleTable } from './Standings';
import { t } from '../../i18n';
import { HornBand, StarField } from '../motion';

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
        <div className="space-y-16 sm:space-y-20">
            {desk}
            {top.length > 0 && (
                // The week's glory, on the night stage: black and gold whatever
                // the theme, the stars, a ram's-horn band above and below.
                <section aria-label={t('Аптанын үч мыктысы')} className="stage">
                    <StarField count={38} />
                    <HornBand className="stage-band" />
                    <div className="stage-inner">
                    <div className="text-center mb-10 sm:mb-12">
                        <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('{0}-апта', week.weekNumber)}</div>
                        <h2 className="font-display stage-title mt-2">{t('Аптанын үч мыктысы')}</h2>
                    </div>
                    <div key={`podium-${weekIndex}`} className="hidden sm:block">
                        <Podium top={top} weekIndex={weekIndex} onOpen={onOpenProfile} />
                    </div>
                    <div key={`list-${weekIndex}`} className="sm:hidden divide-y divide-[var(--border)]">
                        {top.map(({ s, w }, i) => <Laureate key={s.id} s={s} w={w} weekIndex={weekIndex} onOpen={() => onOpenProfile(s.id)} delay={i * 120} />)}
                    </div>
                    </div>
                    <HornBand className="stage-band" />
                </section>
            )}
            <HouseTable insights={insights} weekIndex={weekIndex} scope="week" week={week} />
            <PeopleTable insights={insights} weekIndex={weekIndex} scope="week" title={t('Бардык катышуучулар')} onOpenProfile={onOpenProfile} limit={12} columns />
        </div>
    );
};
