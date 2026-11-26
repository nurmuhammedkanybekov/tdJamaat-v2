// The jamaat, told as a story rather than a ledger: what everyone did
// together this season (the Quran read as whole readings of the mushaf),
// the week's pulse in one sentence, the race of the houses and each house's
// share. Used on the results site (Жамаат) and on the members' page (#/jamaat).
import React, { useMemo } from 'react';
import { Crown, Share2, TrendingDown, TrendingUp } from 'lucide-react';
import type { DataFile, MetricValues } from '../types';
import type { Insights } from '../utils/insights';
import { METRICS, weekOf } from '../utils/insights';
import { seasonTotals, weekOverWeek } from '../utils/community';
import { metricName } from '../utils/metrics';
import { TEAM_COLORS } from '../utils/scoring';
import { t } from '../i18n';
import { StarField } from './motion';

const big = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
/** The Madinah mushaf has 604 pages: Quran pages read, as whole readings. */
const MUSHAF_PAGES = 604;

type Key = keyof MetricValues;
/** How each practice is counted, for the small line under its number. */
const UNIT: Partial<Record<Key, () => string>> = {
    'К-К': () => t('бет Куран'), 'СВТ': () => t('салават'), 'КТП': () => t('бет китеп'), 'ТХЖ': () => t('тахажжуд'),
    'ДТА': () => t('күн орозо'), 'ИСТГ': () => t('истигфар, зикир'), 'НФ': () => t('нафил намаз'), 'ТСП': () => t('тасбихат')
};

export const JamaatStory: React.FC<{ data: DataFile; insights: Insights; seasonName: string; ownHouseId?: string | null; onShareSeason?: () => void; onShareWeek?: () => void }> = ({ data, insights, seasonName, ownHouseId, onShareSeason, onShareWeek }) => {
    const totals = useMemo(() => seasonTotals(data, insights), [data, insights]);
    const last = data.weeks.length - 1;
    const wow = useMemo(() => (last > 0 ? weekOverWeek(data, insights, last) : null), [data, insights, last]);
    const people = useMemo(() => new Set([...insights.members.values()].filter(s => s.weeks.some(w => w.submitted)).map(s => s.id)).size, [insights]);

    // The week in one sentence: the practice that grew the most (fairly: the
    // houses that entered both weeks), or the one that fell, said gently.
    const pulse = useMemo(() => {
        if (!wow || wow.houses === 0) return null;
        const rows = METRICS.map(m => {
            const now = wow.thisWeek.metrics[m], before = wow.lastWeek.metrics[m];
            return { m, now, before, pct: before > 0 ? ((now - before) / before) * 100 : null };
        }).filter(r => r.pct !== null) as Array<{ m: Key; now: number; before: number; pct: number }>;
        const up = [...rows].sort((a, b) => b.pct - a.pct);
        return { rows, best: up[0], worst: up[up.length - 1] };
    }, [wow]);

    // The houses: this week's number and place, the season average, and the
    // share of all the points the jamaat earned this season.
    const houses = useMemo(() => {
        const totalPoints = [...insights.members.values()].reduce((s, p) => s + p.weeks.filter(w => w.submitted).reduce((a, w) => a + w.score, 0), 0);
        return [...insights.houses.values()].map(h => {
            const now = weekOf(h.weeks, last);
            const counted = h.weeks.filter(w => w.submitted);
            const points = [...insights.members.values()].reduce((s, p) => s + p.weeks.filter(w => w.submitted && w.houseId === h.id).reduce((a, w) => a + w.score, 0), 0);
            return {
                id: h.id, name: h.name, color: TEAM_COLORS[h.colorIndex % TEAM_COLORS.length],
                now: now?.submitted ? now.avg : null, rank: now?.rank ?? null,
                avg: counted.length ? counted.reduce((s, w) => s + w.avg, 0) / counted.length : null,
                share: totalPoints > 0 ? points / totalPoints : 0
            };
        }).sort((a, b) => (b.now ?? -1) - (a.now ?? -1) || (b.avg ?? -1) - (a.avg ?? -1));
    }, [insights, last]);
    const topNow = Math.max(1, ...houses.map(h => h.now ?? 0));
    const quran = totals.metrics['К-К' as Key] ?? 0;
    const readings = quran / MUSHAF_PAGES;

    return (
        <div className="space-y-16 sm:space-y-20">
            {/* Together */}
            <section className="js-together stage">
                <StarField />
                <div className="stage-inner relative text-center">
                    <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Сезон {0} · {1} апта · {2} адам', seasonName, data.weeks.length, people)}</div>
                    <h2 className="font-display text-[2rem] sm:text-[2.6rem] leading-tight mt-2" style={{ color: 'var(--text-primary)' }}>{t('Бул сезондо жамаат бирге')}</h2>
                    <div className="js-quran mt-6">
                        <div className="font-display tabular leading-[0.85] js-quran-n gold-sheen">{big(quran)}</div>
                        <div className="font-display text-[1.3rem] sm:text-[1.5rem] mt-2" style={{ color: 'var(--text-primary)' }}>{t('бет Куран окулду')}</div>
                        {readings >= 0.1 && <div className="js-khatm mt-3">{readings >= 1 ? t('≈ {0} жолу толук Куран', readings.toFixed(1)) : t('толук Курандын {0}%', Math.round(readings * 100))}<span>{t('Мадина мусхафы, {0} бет', MUSHAF_PAGES)}</span></div>}
                    </div>
                    <ul className="js-tiles mt-8">
                        {METRICS.filter(m => m !== 'К-К').map(m => (
                            <li key={m}>
                                <span className="font-display tabular js-tile-n" style={{ color: 'var(--text-primary)' }}>{big(totals.metrics[m as Key])}</span>
                                <span className="js-tile-l">{UNIT[m as Key]?.() ?? metricName(m as Key)}</span>
                            </li>
                        ))}
                    </ul>
                    {onShareSeason && <button className="btn btn-ghost mt-8" onClick={onShareSeason}><Share2 className="w-3.5 h-3.5" />{t('Бөлүшүү')}</button>}
                </div>
            </section>

            {/* The week's pulse */}
            {pulse && pulse.best && (
                <section>
                    <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('{0}-апта · {1}-аптага караганда', data.weeks[last].weekNumber, data.weeks[last - 1].weekNumber)}</div>
                    <p className="font-display text-[1.6rem] sm:text-[2rem] leading-snug mt-2" style={{ color: 'var(--text-primary)' }}>
                        {pulse.best.pct > 0
                            ? t('Бул апта жамаат {0} {1}% көбүрөөк аткарды.', metricName(pulse.best.m).toLowerCase(), Math.round(pulse.best.pct))
                            : t('Бул апта бардык көрсөткүчтөр өткөн аптадан бир аз төмөн — кийинки апта бирге көтөрөбүз.')}
                    </p>
                    {pulse.worst && pulse.worst.pct < -5 && pulse.best.pct > 0 && <p className="text-[0.95rem] italic mt-2" style={{ color: 'var(--text-muted)' }}>{t('Көңүл бурууга: {0} ({1}%).', metricName(pulse.worst.m).toLowerCase(), Math.round(pulse.worst.pct))}</p>}
                    <ul className="js-pulse mt-6">
                        {pulse.rows.map(r => {
                            const up = r.pct >= 0;
                            return (
                                <li key={r.m}>
                                    <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{metricName(r.m)}</span>
                                    <span className="font-display tabular text-[1.25rem]" style={{ color: 'var(--text-primary)' }}>{big(r.now)}</span>
                                    <span className="js-pulse-ch tabular" style={{ color: Math.abs(r.pct) < 1 ? 'var(--text-muted)' : up ? 'var(--success)' : 'var(--danger)' }}>
                                        {Math.abs(r.pct) < 1 ? '±0%' : <>{up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}{Math.abs(Math.round(r.pct))}%</>}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                        <p className="text-[0.78rem] italic" style={{ color: 'var(--text-muted)' }}>{t('Эки аптаны тең киргизген {0} үй салыштырылды.', wow?.houses ?? 0)}</p>
                        {onShareWeek && <button className="btn btn-ghost" onClick={onShareWeek}><Share2 className="w-3.5 h-3.5" />{t('Аптаны бөлүшүү')}</button>}
                    </div>
                </section>
            )}

            {/* The race of the houses, and each house's share */}
            <section>
                <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('{0}-апта', data.weeks[last]?.weekNumber ?? 1)}</div>
                <h2 className="font-display text-[1.8rem] sm:text-[2.2rem] leading-tight mt-1" style={{ color: 'var(--text-primary)' }}>{t('Үйлөрдүн жарышы')}</h2>
                <ol className="js-race mt-6">
                    {houses.map((h, i) => (
                        <li key={h.id} className={h.id === ownHouseId ? 'is-own' : ''}>
                            <span className="js-race-rank font-display">{h.now !== null && i === 0 ? <Crown className="w-5 h-5" style={{ color: 'var(--gold)' }} /> : h.now !== null ? i + 1 : '·'}</span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-baseline gap-2">
                                    <span className="font-display text-[1.3rem] truncate" style={{ color: 'var(--text-primary)' }}>{h.name}</span>
                                    {h.id === ownHouseId && <span className="eyebrow" style={{ color: 'var(--gold)' }}>{t('сиздин үй')}</span>}
                                    <span className="leader" />
                                    <span className="font-display tabular text-[1.5rem]" style={{ color: i === 0 && h.now !== null ? 'var(--gold)' : 'var(--text-primary)' }}>{h.now === null ? '—' : fmt(h.now)}</span>
                                </span>
                                <span className="js-race-track"><span style={{ width: `${h.now === null ? 0 : (h.now / topNow) * 100}%`, backgroundColor: h.color }} /></span>
                                <span className="text-[0.75rem] tabular" style={{ color: 'var(--text-muted)' }}>{h.now === null ? t('бул аптанын маалыматы али киргизиле элек') : ''}{h.avg !== null ? `${h.now === null ? ' · ' : ''}${t('сезондун орточосу {0}', fmt(h.avg))}` : ''}</span>
                            </span>
                        </li>
                    ))}
                </ol>

                {houses.some(h => h.share > 0) && (
                    <div className="mt-10">
                        <div className="eyebrow">{t('Ар бир үйдүн салымы · сезондогу бардык упайдан')}</div>
                        <div className="js-share mt-3" role="img" aria-label={houses.map(h => `${h.name} ${Math.round(h.share * 100)}%`).join(', ')}>
                            {houses.filter(h => h.share > 0).map(h => <span key={h.id} style={{ width: `${h.share * 100}%`, backgroundColor: h.color }} title={`${h.name}: ${Math.round(h.share * 100)}%`} />)}
                        </div>
                        <ul className="js-share-legend mt-3">
                            {houses.filter(h => h.share > 0).map(h => (
                                <li key={h.id}><i style={{ backgroundColor: h.color }} />{h.name} <span className="tabular">{Math.round(h.share * 100)}%</span></li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        </div>
    );
};
