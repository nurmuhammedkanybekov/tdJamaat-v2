// The season's league table: every house by its season average, with the
// place it took in each week (its "form"), its best week, its last change.
// One composed table instead of a list here and a statistics grid there.
import React, { useMemo, useState } from 'react';
import type { Insights } from '../../utils/insights';
import { CITIES, houseStandings } from '../../utils/standings';
import type { City } from '../../utils/standings';
import { TEAM_COLORS } from '../../utils/scoring';
import { CountUp } from '../motion';
import { SectionHeader } from '../ui';
import { t } from '../../i18n';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const FORM_WEEKS = 8;

export const SeasonStandings: React.FC<{ insights: Insights; weekIndex: number; weekCount: number }> = ({ insights, weekIndex, weekCount }) => {
    const [city, setCity] = useState<City | 'all'>('all');
    const rows = useMemo(() => houseStandings(insights, weekIndex, 'season', city), [insights, weekIndex, city]);
        // The weeks shown in the form guide: the latest few of the season.
    const formWeeks = useMemo(() => {
        const any = [...insights.houses.values()][0];
        return (any?.weeks ?? []).filter(w => w.weekIndex <= weekIndex).slice(-FORM_WEEKS).map(w => ({ weekIndex: w.weekIndex, weekNumber: w.weekNumber }));
    }, [insights, weekIndex]);

    return (
        <section aria-label={t('Сезондун таблицасы')}>
            <SectionHeader
                eyebrow={t('Орточо рейтинг · {0} апта', weekCount)}
                title={t('Сезондун таблицасы')}
                sub={t('Орун — сезондогу орточо рейтинг боюнча. Апта сайын: ар бир аптада алган орду.')}
                className="mb-4!"
            />
            <div className="chip-row mb-5" role="group" aria-label={t('Шаар')}>
                <button className="chip" aria-pressed={city === 'all'} onClick={() => setCity('all')}>{t('Бардык шаарлар')}</button>
                {CITIES.map(c => <button key={c.id} className="chip" aria-pressed={city === c.id} onClick={() => setCity(c.id)}>{c.label}</button>)}
            </div>

            <div className="league">
                <div className="league-head" aria-hidden="true">
                    <span />
                    <span>{t('Үй')}</span>
                    <span className="league-form-col">{t('Апта сайын')}</span>
                    <span className="text-right">{t('Өзгөрүү')}</span>
                    <span className="text-right">{t('Рекорд')}</span>
                    <span className="text-right">{t('Орточо')}</span>
                </div>
                <ol key={`${city}-${weekIndex}`} className="stagger">
                    {rows.map(({ h, rank, value, weeks }) => {
                        const color = TEAM_COLORS[h.colorIndex % TEAM_COLORS.length];
                        const counted = h.weeks.filter(w => w.weekIndex <= weekIndex && w.submitted);
                        const cur = counted[counted.length - 1];
                        const prev = counted[counted.length - 2];
                        const change = cur && prev ? cur.avg - prev.avg : null;
                        const best = counted.length ? Math.max(...counted.map(w => w.avg)) : null;
                        const lead = rank === 1;
                        return (
                            <li key={h.id} className={`league-row ${lead ? 'is-lead' : ''}`} style={{ '--house': color } as React.CSSProperties}>
                                <span className="league-rank font-display tabular">{rank ? ROMAN[rank - 1] ?? rank : '—'}</span>
                                <span className="min-w-0">
                                    {lead && <span className="eyebrow block mb-1" style={{ color: 'var(--gold)' }}>{t('Сезондун лидери')}</span>}
                                    <span className="league-name font-display block truncate">{h.name}</span>
                                    <span className="flex items-center gap-2 text-[0.78rem] italic mt-1" style={{ color: 'var(--text-muted)' }}><span className="w-5 h-[2px] flex-shrink-0" style={{ backgroundColor: color }} />{t('{0} аптага катышты', weeks)}</span>
                                </span>
                                <span className="league-form league-form-col" aria-label={t('Апта сайын')}>
                                    {formWeeks.map(fw => {
                                        const w = h.weeks.find(x => x.weekIndex === fw.weekIndex);
                                        const place = w?.submitted ? w.rank : null;
                                        return (
                                            <span key={fw.weekIndex} className={`league-form-cell ${place === 1 ? 'is-first' : place && place <= 3 ? 'is-top' : ''} ${place ? '' : 'is-empty'}`} title={t('{0}-апта', fw.weekNumber) + (place ? ` · ${t('{0}-орун', place)}` : '')}>
                                                {place ?? '·'}
                                            </span>
                                        );
                                    })}
                                </span>
                                <span className="league-num league-change text-right tabular" style={{ color: change === null ? 'var(--text-muted)' : change > 0 ? 'var(--success)' : change < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                    <span className="league-mini-label">{t('Өзгөрүү')}</span>
                                    {change === null ? '—' : `${change > 0 ? '+' : ''}${fmt(change)}`}
                                </span>
                                <span className="league-num league-record text-right tabular" style={{ color: 'var(--text-secondary)' }}>
                                    <span className="league-mini-label">{t('Рекорд')}</span>
                                    {best === null ? '—' : fmt(best)}
                                </span>
                                <span className="league-avg-cell text-right">
                                    {value !== null
                                        ? <CountUp value={value} duration={1100} className="league-avg font-display tabular" style={{ color: lead ? 'var(--gold)' : 'var(--text-primary)' }} />
                                        : <span className="league-avg font-display tabular" style={{ color: 'var(--text-muted)' }}>—</span>}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
};
