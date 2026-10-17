import React, { useMemo } from 'react';
import { Share2 } from 'lucide-react';
import type { DataFile, MetricValues, MiniCard } from '../../types';
import type { Insights } from '../../utils/insights';
import { METRICS, buildInsights } from '../../utils/insights';
import type { Award } from '../../utils/badges';
import { computeAwards } from '../../utils/badges';
import { hallOfFame, seasonRecords, seasonTotals, weekOverWeek } from '../../utils/community';
import { cardLabel, cardName, metricLabel, metricName } from '../../utils/metrics';
import { seasonView } from '../../utils/seasons';
import { Medallion, OrnamentDivider } from '../Ornament';
import { SectionHeader } from '../ui';
import { t } from '../../i18n';

interface CommunityViewProps {
    /** Opens the share window with the jamaat's week image. */
    onShareWeek?: (weekIndex: number) => void;
    /** The season on screen. */
    data: DataFile;
    /** Every season (for the Hall of Fame). */
    allData: DataFile;
    insights: Insights;
    awards: Award[];
    seasonName: string;
    onOpenProfile: (memberId: string) => void;
}

const ROMAN = ['I', 'II', 'III'];
// 12400 → "12 400" (narrow no-break space, so a number never splits).
const big = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const Change: React.FC<{ now: number; before: number }> = ({ now, before }) => {
    if (before <= 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    const pct = Math.round(((now - before) / before) * 100);
    const color = pct > 0 ? 'var(--success)' : pct < 0 ? 'var(--danger)' : 'var(--text-muted)';
    return <span className="tabular" style={{ color }}>{pct > 0 ? '▲' : pct < 0 ? '▼' : '='} {Math.abs(pct)}%</span>;
};

export const CommunityView: React.FC<CommunityViewProps> = ({ data, allData, insights, awards, seasonName, onOpenProfile, onShareWeek }) => {
    const totals = useMemo(() => seasonTotals(data, insights), [data, insights]);
    const last = data.weeks.length - 1;
    const wow = useMemo(() => weekOverWeek(data, insights, last), [data, insights, last]);
    const thisWeek = wow.thisWeek, prevWeek = wow.lastWeek;
    const records = useMemo(() => seasonRecords(insights, awards), [insights, awards]);

    // Hall of Fame: every season that has weeks, newest first.
    const halls = useMemo(() => [...allData.seasons]
        .reverse()
        .map(season => {
            const view = seasonView(allData, season.id);
            if (!view.weeks.length) return null;
            const ins = buildInsights(view);
            const aw = computeAwards(view, ins, { seasonClosed: season.lastWeek !== null, seasonName: season.name });
            return hallOfFame(season, view, ins, aw);
        })
        .filter((h): h is NonNullable<typeof h> => !!h), [allData]);

    const latestWeek = data.weeks[last];
    const submittedNow = latestWeek ? latestWeek.teams.filter(it => it.submitted).length : 0;

    return (
        <div className="space-y-16 sm:space-y-20">
            {/* Season totals */}
            <section>
                <SectionHeader eyebrow={t('Сезон {0} · {1} апта', seasonName, data.weeks.length)} title={t('Жамааттын бул сезондогу жыйынтыгы')} sub={t('{0} адам-апта эсептелди. Себептүү жана киргизиле элек апталар кирген жок.', totals.personWeeks)} />
                {/* 1px gaps over a border-coloured background = hairlines between cells at any column count. */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-px" style={{ backgroundColor: 'var(--border)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    {METRICS.map((m, i) => (
                        <div key={m} className="py-6 px-3 sm:px-5 text-center" style={{ backgroundColor: 'var(--page-plane)' }}>
                            <div className="font-display text-[2.1rem] sm:text-[2.6rem] leading-none tabular" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-primary)' }}>{big(totals.metrics[m as keyof MetricValues])}</div>
                            <div className="text-[0.9rem] mt-2.5" style={{ color: 'var(--text-secondary)' }}>{metricName(m as keyof MetricValues)}</div>
                            <div className="eyebrow mt-1">{metricLabel(m as keyof MetricValues)}</div>
                        </div>
                    ))}
                </div>

                <h3 className="font-display text-[1.4rem] mt-12 mb-1" style={{ color: 'var(--text-primary)' }}>{t('Мини-карта: бардык үйлөр бирге')}</h3>
                <p className="text-[0.85rem] mb-4" style={{ color: 'var(--text-muted)' }}>{t('{0} үй-апта эсептелди.', totals.houseWeeks)}</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12">
                    {(Object.keys(totals.card) as Array<keyof MiniCard>).map(k => (
                        <li key={k} className="flex items-baseline gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                            <span className="min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>{cardName(k)}</span>
                            <span className="eyebrow flex-shrink-0">{cardLabel(k)}</span>
                            <span className="leader" />
                            <span className="font-display text-[1.45rem] tabular flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{big(totals.card[k])}</span>
                        </li>
                    ))}
                </ul>
            </section>

            {/* This week vs last week */}
            {latestWeek && (
                <section>
                    <SectionHeader
                        eyebrow={t('{0}-апта{1}', latestWeek.weekNumber, last > 0 ? t(' · {0}-аптага караганда', data.weeks[last - 1].weekNumber) : '')}
                        title={t('Жамааттын бул аптасы')}
                        action={onShareWeek && <button className="btn btn-ghost" onClick={() => onShareWeek(last)}><Share2 className="w-3.5 h-3.5" />  {t('Бөлүшүү')}</button>}
                        sub={t('Эки аптаны тең киргизген {0} үй салыштырылды{1}.', wow.houses, submittedNow < latestWeek.teams.length ? t(' · {0} / {1} үй бул аптаны киргизди, калгандары киргизгенде кошулат', submittedNow, latestWeek.teams.length) : '')}
                    />
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-12">
                        {METRICS.map(m => (
                            <li key={m} className="flex items-baseline gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                                <span className="min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>{metricName(m as keyof MetricValues)}</span>
                                <span className="leader" />
                                <span className="font-display text-[1.35rem] tabular flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{big(thisWeek.metrics[m as keyof MetricValues])}</span>
                                <span className="w-16 text-right text-[0.82rem] flex-shrink-0"><Change now={thisWeek.metrics[m as keyof MetricValues]} before={prevWeek.metrics[m as keyof MetricValues]} /></span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Season records */}
            {records.length > 0 && (
                <section>
                    <SectionHeader eyebrow={t('Сезон {0}', seasonName)} title={t('Сезондун рекорддору')} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {records.map(r => {
                            const body = (
                                <>
                                    <div className="eyebrow">{r.label}</div>
                                    <div className="font-display text-[2.2rem] leading-none mt-3 tabular" style={{ color: 'var(--gold)' }}>{r.value}</div>
                                    <div className="text-[1.05rem] mt-3 truncate" style={{ color: 'var(--text-primary)' }}>{r.who}</div>
                                    <div className="text-[0.8rem] italic mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.detail}</div>
                                </>
                            );
                            return r.memberId
                                ? <button key={r.label} onClick={() => onOpenProfile(r.memberId!)} className="card card-pad text-left row-link">{body}</button>
                                : <div key={r.label} className="card card-pad">{body}</div>;
                        })}
                    </div>
                </section>
            )}

            {/* Hall of Fame */}
            <section>
                <SectionHeader eyebrow={t('Ар бир сезон')} title={t('Даңк залы')} sub={t('Сезондун эң мыктылары. Жеке орун алуу үчүн сезондун жок дегенде жарымына катышуу керек.')} />
                <div className="space-y-10">
                    {halls.map(h => (
                        <article key={h.seasonId} className="relative card card-pad overflow-hidden">
                            <Medallion size={260} className="absolute -right-16 -top-16 pointer-events-none" style={{ color: 'var(--gold)', opacity: 0.08 }} />
                            <div className="flex items-baseline justify-between gap-3 flex-wrap">
                                <h3 className="font-display text-[1.8rem]" style={{ color: 'var(--text-primary)' }}>{t('Сезон {0}', h.seasonName)}</h3>
                                <span className="eyebrow">{h.finished ? t('аяктады · {0} апта', h.weeks) : t('азырынча · {0} апта', h.weeks)}</span>
                            </div>
                            <OrnamentDivider className="my-5" />
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-12">
                                <div className="text-center lg:text-left">
                                    <div className="eyebrow">{t('Сезондун үйү')}</div>
                                    <div className="font-display text-[2.4rem] leading-tight mt-2" style={{ color: 'var(--gold)' }}>{h.house?.name ?? '—'}</div>
                                    {h.house && <div className="text-[0.85rem] italic" style={{ color: 'var(--text-muted)' }}>{t('орточо рейтинг {0}', h.house.avg)}</div>}
                                </div>
                                <ol>
                                    {h.people.length === 0 && <li className="italic text-[0.9rem]" style={{ color: 'var(--text-muted)' }}>{t('Азырынча жетиштүү апта жок.')}</li>}
                                    {h.people.map((p, i) => (
                                        <li key={p.id}>
                                            <button onClick={() => onOpenProfile(p.id)} className="w-full flex items-baseline gap-3 py-2.5 text-left row-link" style={{ borderBottom: '1px solid var(--border)' }}>
                                                <span className="w-8 font-display text-[1.2rem]" style={{ color: 'var(--gold)' }}>{ROMAN[i]}</span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                                                    <span className="block text-[0.78rem] italic truncate" style={{ color: 'var(--text-muted)' }}>{t('{0} · {1} апта', p.houseName, p.weeks)}</span>
                                                </span>
                                                <span className="font-display text-[1.4rem] tabular" style={{ color: 'var(--text-primary)' }}>{p.avg}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                            {(h.medals || h.streak) && (
                                <div className="flex flex-wrap gap-x-10 gap-y-3 mt-6 text-[0.9rem]" style={{ color: 'var(--text-secondary)' }}>
                                    {h.medals && <span><span className="eyebrow mr-2">{t('Эң көп медаль')}</span>{h.medals.name} · <b className="tabular">{h.medals.count}</b></span>}
                                    {h.streak && <span><span className="eyebrow mr-2">{t('Эң узун күчтүү серия')}</span>{h.streak.name} · <b className="tabular">{t('{0} апта', h.streak.weeks)}</b></span>}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
};
