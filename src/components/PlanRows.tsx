// A week's eight practices against the plan, one readable row each: the full
// name, done / plan, a bar up to the plan and how far past it (×2.9 rather
// than a column cut off at 200%). Used on the member's own page and in the
// profile sheet.
import React from 'react';
import { t } from '../i18n';
import type { MemberWeek } from '../utils/insights';
import { METRICS } from '../utils/insights';
import { weekBreakdown } from '../utils/breakdown';
import { metricLabel, metricName } from '../utils/metrics';

const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export const PlanRows: React.FC<{ w: MemberWeek; points?: boolean }> = ({ w, points = true }) => {
    const pts = new Map((weekBreakdown(w)?.rows ?? []).map(r => [r.metric, r.points]));
    return (
        <ul className="plan-rows">
            {METRICS.map(k => {
                const done = w.member.actual[k] ?? 0, plan = w.member.target[k] ?? 0, pct = w.pct[k];
                const met = plan > 0 && done >= plan;
                const zero = plan > 0 && done === 0;
                const times = plan > 0 && pct >= 200 ? `×${(pct / 100).toFixed(pct >= 1000 ? 0 : 1)}` : null;
                return (
                    <li key={k} className={met ? 'is-met' : zero ? 'is-zero' : ''}>
                        <div className="flex items-baseline gap-2 min-w-0">
                            <span className="font-display text-[1.12rem] truncate" style={{ color: 'var(--text-primary)' }}>{metricName(k)}</span>
                            <span className="text-[0.66rem] tracking-[0.12em] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{metricLabel(k)}</span>
                            <span className="leader" />
                            <span className="tabular text-[1.1rem] flex-shrink-0" style={{ color: met ? 'var(--gold)' : 'var(--text-primary)' }}>{done}<span className="text-[0.85rem]" style={{ color: 'var(--text-muted)' }}> / {plan || '—'}</span></span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="plan-track"><span style={{ width: `${Math.min(100, pct)}%` }} /></span>
                            <span className="text-[0.76rem] tabular flex-shrink-0 text-right" style={{ color: 'var(--text-muted)' }}>
                                <span style={{ color: met ? 'var(--gold)' : zero ? 'var(--danger)' : 'var(--text-secondary)' }}>{plan > 0 ? times ?? `${Math.round(pct)}%` : t('план жок')}</span>
                                {points && <> · {t('{0} упай', fmt(pts.get(k) ?? 0))}</>}
                            </span>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
};
