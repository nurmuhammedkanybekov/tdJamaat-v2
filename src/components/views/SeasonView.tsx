// The Season tab: the season so far, from the summary to the detail —
// the tables (averages), how the houses moved week by week, who rose,
// the four-week reports, and each house's numbers.
import React from 'react';
import type { DataFile } from '../../types';
import type { Insights } from '../../utils/insights';
import { HouseTable, PeopleTable } from './Standings';
import { ProgressView } from './ProgressView';
import { ReportsView } from './ReportsView';
import { t } from '../../i18n';

interface SeasonViewProps {
    data: DataFile;
    insights: Insights;
    selectedPeriod: number;
    setSelectedPeriod: (n: number) => void;
    onOpenProfile: (memberId: string) => void;
    onCompare: (kind: 'person' | 'house') => void;
}

export const SeasonView: React.FC<SeasonViewProps> = ({ data, insights, selectedPeriod, setSelectedPeriod, onOpenProfile, onCompare }) => {
    const last = data.weeks.length - 1;
    return (
        <div className="space-y-16 sm:space-y-20">
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-20 items-start">
                <HouseTable insights={insights} weekIndex={last} scope="season" />
                <PeopleTable insights={insights} weekIndex={last} scope="season" title={t('Катышуучулар')} onOpenProfile={onOpenProfile} limit={10} />
            </div>
            <ProgressView data={data} insights={insights} onOpenProfile={onOpenProfile} onCompare={onCompare} />
            <ReportsView data={data} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />
        </div>
    );
};
