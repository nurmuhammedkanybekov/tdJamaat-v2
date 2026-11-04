// The league tables: houses and people, for one week or for the season so
// far. Used by the Week tab (scope "week") and the Season tab ("season").
import React, { useMemo, useState } from 'react';
import { ChevronDown, Clock3, Lock } from 'lucide-react';
import type { Role, WeekData } from '../../types';
import type { Insights } from '../../utils/insights';
import { houseNameAt, movement, ROLE_LABEL, roleAt } from '../../utils/insights';
import { CITIES, houseStandings, personStandings } from '../../utils/standings';
import type { City, Scope } from '../../utils/standings';
import { TEAM_COLORS } from '../../utils/scoring';
import { Avatar } from '../Avatar';
import { Movement, SectionHeader } from '../ui';
import { CountUp } from '../motion';
import { t } from '../../i18n';

const ROLE_FILTER_LABEL: Record<'all' | Role, string> = { all: t('Бардыгы'), imam: t('Капитандар'), zam: t('Орун басарлар'), member: t('Мүчөлөр') };
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const pad2 = (n: number) => String(n).padStart(2, '0');

/** Houses, best first, each with a bar in its colour. In a week, a house that
 *  hasn't entered says so in its own row. */
export const HouseTable: React.FC<{ insights: Insights; weekIndex: number; scope: Scope; week?: WeekData }> = ({ insights, weekIndex, scope, week }) => {
    const [city, setCity] = useState<City | 'all'>('all');
    const rows = useMemo(() => houseStandings(insights, weekIndex, scope, city), [insights, weekIndex, scope, city]);
    const max = Math.max(1, ...rows.map(x => x.value ?? 0));
    const showMovement = scope === 'week' && city === 'all';
    const entered = week ? week.teams.filter(it => it.submitted).length : 0;
    return (
        <section aria-label={t('Үйлөр')}>
            <SectionHeader
                eyebrow={scope === 'week' && week ? t('{0}-апта · {1} / {2} киргизди', week.weekNumber, entered, week.teams.length) : t('Орточо рейтинг')}
                title={t('Үйлөр')}
                className="mb-3!"
            />
            <div className="chip-row mb-4" role="group" aria-label={t('Шаар')}>
                <button className="chip" aria-pressed={city === 'all'} onClick={() => setCity('all')}>{t('Бардык шаарлар')}</button>
                {CITIES.map(c => <button key={c.id} className="chip" aria-pressed={city === c.id} onClick={() => setCity(c.id)}>{c.label}</button>)}
            </div>
            <ol key={`${scope}-${city}-${weekIndex}`} className="stagger">
                {rows.map(({ h, rank, value, weeks }, i) => {
                    const color = TEAM_COLORS[h.colorIndex % TEAM_COLORS.length];
                    const team = week?.teams.find(it => it.id === h.id);
                    const waiting = scope === 'week' && team && !team.submitted;
                    return (
                        <li key={h.id} className="relative pt-[1rem] pb-[1.15rem]" style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="flex items-baseline gap-3">
                                <span className="w-6 text-[0.75rem] tabular" style={{ color: 'var(--gold-dim)' }}>{rank ? pad2(rank) : '—'}</span>
                                <span className="font-display text-[1.35rem] min-w-0 truncate" style={{ color: rank === 1 ? 'var(--gold)' : 'var(--text-primary)' }}>{h.name}</span>
                                {showMovement && !waiting && <Movement delta={movement(h.weeks, weekIndex)} />}
                                <span className="leader" />
                                {scope === 'season' && value !== null && <span className="text-[0.75rem] italic flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t('{0} апта', weeks)}</span>}
                                {waiting
                                    ? <span className="inline-flex items-center gap-1.5 text-[0.82rem] italic flex-shrink-0" style={{ color: week?.locked ? 'var(--danger)' : 'var(--text-muted)' }}>
                                        {week?.locked ? <Lock className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}
                                        {week?.locked ? t('киргизилген жок') : t('күтүлүүдө')}
                                    </span>
                                    : value !== null
                                        ? <CountUp value={value} duration={1100} className="font-display text-[1.45rem] tabular flex-shrink-0" style={{ color: rank === 1 ? 'var(--gold)' : 'var(--text-primary)' }} />
                                        : <span className="font-display text-[1.45rem] tabular flex-shrink-0" style={{ color: 'var(--text-muted)' }}>—</span>}
                            </div>
                            {/* The rating as a bar in the house's colour, relative to the leader. */}
                            {value !== null && !waiting && (
                                <span aria-hidden="true" className="absolute left-9 right-0 bottom-[-1px] h-[2px] overflow-hidden">
                                    <span className="block h-full animate-grow-x" style={{ width: `${(value / max) * 100}%`, backgroundColor: color, animationDelay: `${150 + i * 90}ms`, opacity: rank === 1 ? 1 : 0.75 }} />
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};

/** Everyone, best first, filterable by the role they had at that week. */
export const PeopleTable: React.FC<{ insights: Insights; weekIndex: number; scope: Scope; title: string; onOpenProfile: (id: string) => void; limit?: number }> = ({ insights, weekIndex, scope, title, onOpenProfile, limit }) => {
    const [role, setRole] = useState<'all' | Role>('all');
    const [showWaiting, setShowWaiting] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const weeksSoFar = weekIndex + 1;
    const people = useMemo(() => personStandings(insights, weekIndex, scope, 'all', weeksSoFar), [insights, weekIndex, scope, weeksSoFar]);
    // The role each person had at this week (a new captain is listed as a
    // captain only from the week the change started).
    const filtered = role === 'all' ? people : people.filter(p => roleAt(p.s, weekIndex) === role);
    const listed = filtered.filter(p => p.value !== null || p.excused);
    const waiting = filtered.filter(p => p.value === null && !p.excused);
    const waitingHouses = [...new Set(waiting.map(p => p.week?.houseName ?? p.s.houseName))];
    const minWeeks = Math.max(1, Math.ceil(weeksSoFar / 2));
    const shown = (showWaiting ? [...listed, ...waiting] : listed).slice(0, limit && !showAll ? limit : undefined);
    return (
        <section aria-label={title}>
            <SectionHeader
                eyebrow={scope === 'week' ? t('{0} адам', listed.length) : t('кеминде {0} апта', minWeeks)}
                title={title}
                className="mb-3!"
            />
            <div className="chip-row mb-4" role="group" aria-label={t('Ролу боюнча')}>
                {(['all', 'imam', 'zam', 'member'] as const).map(r => (
                    <button key={r} className="chip" aria-pressed={role === r} onClick={() => setRole(r)}>{ROLE_FILTER_LABEL[r]}</button>
                ))}
            </div>
            <ol>
                {shown.map(({ s, rank, value, weeks, week: w, excused }) => (
                    <li key={s.id}>
                        <button
                            onClick={() => onOpenProfile(s.id)}
                            className="row-link w-[calc(100%+1rem)] flex items-center gap-3 sm:gap-4 px-2 -mx-2 py-3 text-left"
                            style={{ borderBottom: '1px solid var(--border)' }}
                        >
                            <span className="w-6 text-[0.75rem] tabular flex-shrink-0" style={{ color: 'var(--gold-dim)' }}>{rank ? pad2(rank) : '—'}</span>
                            <Avatar name={s.name} role={roleAt(s, weekIndex)} photoUrl={w?.member.photoUrl ?? s.photoUrl} size="sm" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[1rem]" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                                <span className="block text-[0.78rem] italic truncate" style={{ color: 'var(--text-muted)' }}>{w?.houseName ?? houseNameAt(s, weekIndex)} · {ROLE_LABEL[roleAt(s, weekIndex)].toLowerCase()}</span>
                            </span>
                            {scope === 'week' && <Movement delta={movement(s.weeks, weekIndex)} />}
                            {scope === 'season' && value !== null && <span className="text-[0.75rem] italic flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t('{0} апта', weeks)}</span>}
                            <span className="w-14 text-right font-display text-[1.3rem] tabular flex-shrink-0" style={{ color: value !== null && (rank !== null || scope === 'week') ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {excused ? <span className="text-[0.8rem] italic" style={{ color: 'var(--text-muted)' }}>{t('себептүү')}</span> : value !== null ? fmt(value) : '—'}
                            </span>
                        </button>
                    </li>
                ))}
            </ol>
            {limit !== undefined && listed.length > limit && (
                <button onClick={() => setShowAll(v => !v)} aria-expanded={showAll} className="w-full flex items-center justify-between gap-3 py-3.5 text-left transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    <span className="text-[0.9rem] italic">{showAll ? t('Кыскартуу') : t('Баарын көрсөтүү ({0})', listed.length)}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                </button>
            )}
            {waiting.length > 0 && (!limit || showAll) && (
                <button onClick={() => setShowWaiting(v => !v)} aria-expanded={showWaiting} className="w-full flex items-center gap-3 py-3.5 text-left transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    <span className="w-6 text-[0.75rem]">—</span>
                    <span className="flex-1 min-w-0 text-[0.9rem]">
                        <span className="italic">{scope === 'week' ? t('Киргизиле элек') : t('Азырынча эсеп жок')}</span>
                        {scope === 'week' && <span> · {waitingHouses.join(', ')}</span>}
                        <span> · {t('{0} адам', waiting.length)}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showWaiting ? 'rotate-180' : ''}`} />
                </button>
            )}
        </section>
    );
};
