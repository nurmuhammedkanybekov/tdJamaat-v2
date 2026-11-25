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
import { OrnamentDivider } from '../Ornament';
import { SectionHeader } from '../ui';
import { t } from '../../i18n';
import { JattooCommunity } from '../Jattoo';

interface CommunityViewProps {
    /** Opens the share window with the jamaat's week image. */
    onShareWeek?: (weekIndex: number) => void;
    /** Opens the share window with the jamaat's season image. */
    onShareSeason?: () => void;
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


export const CommunityView: React.FC<CommunityViewProps> = ({ data, allData, insights, awards, seasonName, onOpenProfile, onShareWeek, onShareSeason }) => {
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
                <SectionHeader eyebrow={t('Сезон {0} · {1} апта', seasonName, data.weeks.length)} title={t('Жамааттын бул сезондогу жыйынтыгы')} action={onShareSeason && <button className="btn btn-ghost" onClick={onShareSeason}><Share2 className="w-3.5 h-3.5" />  {t('Бөлүшүү')}</button>} />
                {/* What the jamaat did together: the Quran read, set large on its
                    own; the seven other practices as a ledger beside it. */}
                <div className="together">
                    <div className="together-lead">
                        <div className="eyebrow" style={{ color: 'var(--gold)' }}>{metricLabel(METRICS[0] as keyof MetricValues)}</div>
                        <div className="font-display tabular leading-[0.85] together-lead-n gold-sheen">{big(totals.metrics[METRICS[0] as keyof MetricValues])}</div>
                        <div className="font-display text-[1.4rem] sm:text-[1.6rem] mt-3" style={{ color: 'var(--text-primary)' }}>{metricName(METRICS[0] as keyof MetricValues)}</div>
                        <p className="text-[0.85rem] italic mt-1" style={{ color: 'var(--text-muted)' }}>{t('{0} адам-апта эсептелди. Себептүү жана киргизиле элек апталар кирген жок.', totals.personWeeks)}</p>
                    </div>
                    <ul className="together-rest">
                        {METRICS.slice(1).map(m => (
                            <li key={m}>
                                <span className="min-w-0">
                                    <span className="block truncate" style={{ color: 'var(--text-primary)' }}>{metricName(m as keyof MetricValues)}</span>
                                    <span className="eyebrow block mt-0.5" style={{ letterSpacing: '0.18em' }}>{metricLabel(m as keyof MetricValues)}</span>
                                </span>
                                <span className="font-display tabular text-[1.7rem] sm:text-[2rem] leading-none" style={{ color: 'var(--text-primary)' }}>{big(totals.metrics[m as keyof MetricValues])}</span>
                            </li>
                        ))}
                    </ul>
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
                    {/* The week's pulse: each practice's total, and how far it moved
                        from last week as a bar either side of the centre line. */}
                    <ul className="pulse grid grid-cols-1 lg:grid-cols-2 lg:gap-x-14" style={{ borderTop: '1px solid var(--gold-dim)' }}>
                        {METRICS.map(m => {
                            const now = thisWeek.metrics[m as keyof MetricValues], before = prevWeek.metrics[m as keyof MetricValues];
                            const pct = before > 0 ? ((now - before) / before) * 100 : null;
                            const w = pct === null ? 0 : Math.min(Math.abs(pct), 50) / 50 * 100;
                            return (
                                <li key={m} className="pulse-row">
                                    <span className="min-w-0">
                                        <span className="block truncate" style={{ color: 'var(--text-primary)' }}>{metricName(m as keyof MetricValues)}</span>
                                        <span className="eyebrow block mt-0.5" style={{ letterSpacing: '0.18em' }}>{metricLabel(m as keyof MetricValues)}</span>
                                    </span>
                                    <span className="font-display text-[1.4rem] tabular text-right" style={{ color: 'var(--text-primary)' }}>{big(now)}</span>
                                    <span className="pulse-bar" aria-hidden="true">
                                        <span className="pulse-axis" />
                                        {pct !== null && pct !== 0 && <span className={`pulse-fill ${pct > 0 ? 'is-up' : 'is-down'}`} style={{ width: `${w / 2}%` }} />}
                                    </span>
                                    <span className="text-right text-[0.85rem]"><Change now={now} before={before} /></span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {/* Season records */}
            {records.length > 0 && (
                <section>
                    <SectionHeader eyebrow={t('Сезон {0}', seasonName)} title={t('Сезондун рекорддору')} />
                    {/* One engraved plate: the hairlines on each cell's right and
                        bottom edge are clipped by the plate. */}
                    {/* The record book: one line per record — what, how much, whose. */}
                    <ol className="record-book">
                        {records.map(r => {
                            const body = (
                                <>
                                    <span className="eyebrow record-label">{r.label}</span>
                                    <span className="font-display tabular record-value" style={{ color: 'var(--gold)' }}>{r.value}</span>
                                    <span className="min-w-0 record-who">
                                        <span className="block font-display text-[1.3rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{r.who}</span>
                                        <span className="block text-[0.8rem] italic truncate" style={{ color: 'var(--text-muted)' }}>{r.detail}</span>
                                    </span>
                                </>
                            );
                            return (
                                <li key={r.label}>
                                    {r.memberId
                                        ? <button onClick={() => onOpenProfile(r.memberId!)} className="record-row row-link w-full text-left">{body}</button>
                                        : <div className="record-row">{body}</div>}
                                </li>
                            );
                        })}
                    </ol>
                </section>
            )}

            {/* Hall of Fame */}
            <section>
                <SectionHeader eyebrow={t('Ар бир сезон')} title={t('Даңк залы')} sub={t('Сезондун эң мыктылары. Жеке орун алуу үчүн сезондун жок дегенде жарымына катышуу керек.')} />
                <div className="space-y-10">
                    {halls.map(h => (
                        <article key={h.seasonId} className="hall">
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
                                                    <span className="block font-display text-[1.15rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
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
            <JattooCommunity data={allData} />
        </div>
    );
};
