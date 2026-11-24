// A member's own results: the latest week metric by metric, and the last
// weeks' scores next to their house's. The database only gives a member
// their own house (supabase/members-2026-11.sql), and only their own numbers
// are shown here.
import React, { useEffect, useMemo, useState } from 'react';
import { fetchDataFile } from '../services/dataService';
import type { DataFile } from '../types';
import { calculateHouseRating, calculateMemberScore } from '../utils/scoring';
import { METRICS, PLAN_SCORE } from '../utils/insights';
import { metricLabel, metricName } from '../utils/metrics';
import { formatWeekRange } from '../utils/weekDates';
import { t } from '../i18n';
import type { MemberLink } from '../services/memberService';

const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export const MemberResults: React.FC<{ link: MemberLink }> = ({ link }) => {
    const [data, setData] = useState<DataFile | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => { fetchDataFile().then(setData).catch(() => setFailed(true)); }, []);

    const weeks = useMemo(() => {
        if (!data) return [];
        return data.weeks.map(w => {
            const team = w.teams.find(tm => tm.id === link.houseId);
            const me = team?.members.find(m => m.id === link.memberId);
            return { week: w, team, me, score: me && !me.excused ? calculateMemberScore(me) : null, house: team?.submitted ? calculateHouseRating(team) : null };
        }).filter(r => r.me).reverse();
    }, [data, link]);

    if (failed) return <p className="py-4 text-[0.9rem]" style={{ color: 'var(--text-muted)' }}>{t('Жыйынтыктар жүктөлгөн жок.')}</p>;
    if (!data) return <div className="py-8 flex justify-center"><div className="skeleton h-1 w-24" /></div>;
    if (!weeks.length) return <p className="py-4 text-[0.9rem]" style={{ color: 'var(--text-muted)' }}>{t('Азырынча сиздин жыйынтыгыңыз жок.')}</p>;

    const latest = weeks[0];
    return (
        <div>
            <div className="pt-5 flex items-end justify-between gap-4">
                <div>
                    <div className="eyebrow">{t('{0}-апта', latest.week.weekNumber)}{latest.week.startDate ? ` · ${formatWeekRange(latest.week.startDate, latest.week.endDate ?? null)}` : ''}</div>
                    <div className="font-display text-[3rem] leading-none tabular mt-2" style={{ color: 'var(--gold)' }}>{latest.score === null ? '—' : fmt(latest.score)}</div>
                    <div className="text-[0.82rem] mt-1" style={{ color: 'var(--text-muted)' }}>{latest.me?.excused ? t('бул апта эсепке алынган жок') : t('план: {0}', PLAN_SCORE)}</div>
                </div>
                {latest.house !== null && (
                    <div className="text-right">
                        <div className="font-display text-[1.6rem] tabular leading-none" style={{ color: 'var(--text-primary)' }}>{fmt(latest.house)}</div>
                        <div className="text-[0.82rem] mt-1" style={{ color: 'var(--text-muted)' }}>{t('үйдүн упайы')}</div>
                    </div>
                )}
            </div>
            {latest.me && (
                <ul className="mt-4">
                    {METRICS.map(k => {
                        const done = latest.me!.actual[k] ?? 0, plan = latest.me!.target[k] ?? 0;
                        const reached = plan > 0 && done >= plan;
                        return (
                            <li key={k} className="flex items-baseline gap-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                                <span className="w-12 text-[0.74rem] font-semibold tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>{metricLabel(k)}</span>
                                <span className="text-[0.92rem] truncate" style={{ color: 'var(--text-secondary)' }}>{metricName(k)}</span>
                                <span className="leader" />
                                <span className="tabular text-[1.05rem]" style={{ color: reached ? 'var(--gold)' : 'var(--text-primary)' }}>{done}</span>
                                <span className="tabular text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>/ {plan}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
            {weeks.length > 1 && (
                <ol className="mt-5">
                    {weeks.slice(1, 7).map(r => (
                        <li key={r.week.globalWeek} className="flex items-baseline gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                            <span className="text-[0.95rem]" style={{ color: 'var(--text-secondary)' }}>{t('{0}-апта', r.week.weekNumber)}</span>
                            <span className="leader" />
                            <span className="font-display text-[1.25rem] tabular" style={{ color: 'var(--text-primary)' }}>{r.score === null ? '—' : fmt(r.score)}</span>
                            <span className="w-16 text-right text-[0.82rem] tabular" style={{ color: 'var(--text-muted)' }}>{r.house === null ? '' : t('үй {0}', fmt(r.house))}</span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
};
