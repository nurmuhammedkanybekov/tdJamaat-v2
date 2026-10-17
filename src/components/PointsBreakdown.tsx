import React from 'react';
import type { MetricValues } from '../types';
import type { Breakdown } from '../utils/breakdown';
import { metricLabel, metricName } from '../utils/metrics';
import { ProgressBar } from './ui';
import { t } from '../i18n';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

/** "Where the points came from": one row per metric (points / points at
 *  100% of plan), then the total and the strongest and weakest metric.
 *  Used for a person (ProfileSheet) and a house (TeamsView). */
export const PointsBreakdown: React.FC<{
    breakdown: Breakdown;
    totalLabel: string;
    planTotal: number;
    /** Optional small line under a metric (e.g. "4/6 at plan"). */
    note?: (metric: keyof MetricValues) => React.ReactNode;
    /** Extra text after the "furthest from plan" sentence. */
    missedNote?: React.ReactNode;
}> = ({ breakdown, totalLabel, planTotal, note, missedNote }) => (
    <>
        <div className="grid grid-cols-1 gap-x-12 gap-y-5 sm:grid-cols-2">
            {breakdown.rows.map(row => {
                const extra = row.points - row.plan;
                return (
                    <div key={row.metric}>
                        <div className="flex items-baseline gap-2 mb-2 min-w-0">
                            <span className="text-[0.95rem] flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{metricLabel(row.metric)}</span>
                            <span className="text-[0.78rem] italic truncate" style={{ color: 'var(--text-muted)' }}>{metricName(row.metric)}</span>
                            <span className="leader" />
                            {extra >= 0.05 && <span className="text-[0.78rem] tabular flex-shrink-0" style={{ color: 'var(--success)' }}>+{fmt(extra)}</span>}
                            <span className="font-display text-[1.15rem] tabular flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{fmt(row.points)}</span>
                            <span className="text-[0.8rem] tabular flex-shrink-0" style={{ color: 'var(--text-muted)' }}>/ {row.plan}</span>
                        </div>
                        <ProgressBar pct={row.plan > 0 ? (row.points / row.plan) * 100 : 0} />
                        {note && <div className="text-[0.75rem] mt-1.5" style={{ color: 'var(--text-muted)' }}>{note(row.metric)}</div>}
                    </div>
                );
            })}
        </div>
        <div className="mt-7 pt-4 text-[0.88rem] space-y-1.5" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <p className="flex items-baseline gap-2">
                <span>{totalLabel}</span>
                <span className="leader" />
                <span className="font-display text-[1.4rem] tabular" style={{ color: 'var(--gold)' }}>{fmt(breakdown.total)}</span>
                <span className="text-[0.8rem] tabular" style={{ color: 'var(--text-muted)' }}>{t('/ {0} (план)', planTotal)}</span>
            </p>
            {breakdown.top && <p>{t('Эң көп упай берген: {0} — {1}.', metricName(breakdown.top.metric), fmt(breakdown.top.points))}</p>}
            {breakdown.missed
                ? <p>{t('Эң көп жетпеген: {0} — планга жетүү үчүн дагы {1} упай керек.', metricName(breakdown.missed.row.metric), fmt(breakdown.missed.missing))}{missedNote && <> {missedNote}</>}</p>
                : <p>{t('Бардык көрсөткүч боюнча толук упай алынды.')}</p>}
        </div>
    </>
);
