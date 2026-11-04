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
import { Movement } from '../ui';
import { CountUp } from '../motion';
import { t } from '../../i18n';

const ROLE_FILTER_LABEL: Record<'all' | Role, string> = { all: t('Бардыгы'), imam: t('Капитандар'), zam: t('Орун басарлар'), member: t('Мүчөлөр') };
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

const TableHead: React.FC<{ title: string; note?: string; children?: React.ReactNode }> = ({ title, note, children }) => (
    <div className="px-5 sm:px-6 pt-5 pb-3">
        <div className="flex items-baseline justify-between gap-3">
            <h2 className="section-title">{title}</h2>
            {note && <span className="text-[0.8rem] tabular" style={{ color: 'var(--text-muted)' }}>{note}</span>}
        </div>
        {children && <div className="chip-row mt-3">{children}</div>}
    </div>
);

/** Houses, best first, each with a bar in its colour. In a week, a house that
 *  hasn't entered says so in its own row. */
export const HouseTable: React.FC<{ insights: Insights; weekIndex: number; scope: Scope; week?: WeekData }> = ({ insights, weekIndex, scope, week }) => {
    const [city, setCity] = useState<City | 'all'>('all');
    const rows = useMemo(() => houseStandings(insights, weekIndex, scope, city), [insights, weekIndex, scope, city]);
    const max = Math.max(1, ...rows.map(x => x.value ?? 0));
    const showMovement = scope === 'week' && city === 'all';
    const entered = week ? week.teams.filter(it => it.submitted).length : 0;
    return (
        <section className="card overflow-hidden" aria-label={t('Үйлөр')}>
            <TableHead title={t('Үйлөр')} note={scope === 'week' && week ? t('{0} / {1} киргизди', entered, week.teams.length) : t('{0} апта', weekIndex + 1)}>
                <button className="chip" aria-pressed={city === 'all'} onClick={() => setCity('all')}>{t('Бардык шаарлар')}</button>
                {CITIES.map(c => <button key={c.id} className="chip" aria-pressed={city === c.id} onClick={() => setCity(c.id)}>{c.label}</button>)}
            </TableHead>
            <ol key={`${scope}-${city}-${weekIndex}`} className="stagger">
                {rows.map(({ h, rank, value, weeks }, i) => {
                    const color = TEAM_COLORS[h.colorIndex % TEAM_COLORS.length];
                    const team = week?.teams.find(it => it.id === h.id);
                    const waiting = scope === 'week' && team && !team.submitted;
                    return (
                        <li key={h.id} className="relative px-5 sm:px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-3">
                                <span className="w-7 font-display text-[1.25rem] tabular leading-none" style={{ color: rank === 1 ? 'var(--gold)' : 'var(--text-muted)' }}>{rank ?? '–'}</span>
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                <span className="font-display text-[1.3rem] leading-tight min-w-0 truncate flex-1" style={{ color: 'var(--text-primary)' }}>{h.name}</span>
                                {showMovement && !waiting && <Movement delta={movement(h.weeks, weekIndex)} />}
                                {scope === 'season' && value !== null && <span className="text-[0.75rem] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t('{0} апта', weeks)}</span>}
                                {waiting
                                    ? <span className="inline-flex items-center gap-1.5 text-[0.8rem] flex-shrink-0" style={{ color: week?.locked ? 'var(--danger)' : 'var(--text-muted)' }}>
                                        {week?.locked ? <Lock className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}
                                        {week?.locked ? t('киргизилген жок') : t('күтүлүүдө')}
                                    </span>
                                    : value !== null
                                        ? <CountUp value={value} duration={1100} className="font-display text-[1.5rem] tabular flex-shrink-0 leading-none" style={{ color: rank === 1 ? 'var(--gold)' : 'var(--text-primary)' }} />
                                        : <span className="font-display text-[1.5rem] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>–</span>}
                            </div>
                            {value !== null && !waiting && (
                                <div className="ml-10 mt-2.5 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-2)' }} aria-hidden="true">
                                    <div className="h-full rounded-full animate-grow-x" style={{ width: `${(value / max) * 100}%`, backgroundColor: color, animationDelay: `${150 + i * 90}ms` }} />
                                </div>
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
    return (
        <section className="card overflow-hidden" aria-label={title}>
            <TableHead title={title} note={scope === 'season' ? t('кеминде {0} апта', minWeeks) : t('{0} адам', listed.length)}>
                {(['all', 'imam', 'zam', 'member'] as const).map(r => (
                    <button key={r} className="chip" aria-pressed={role === r} onClick={() => setRole(r)}>{ROLE_FILTER_LABEL[r]}</button>
                ))}
            </TableHead>
            <ol>
                {(showWaiting ? [...listed, ...waiting] : listed).slice(0, limit && !showAll ? limit : undefined).map(({ s, rank, value, weeks, week: w, excused }) => (
                    <li key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <button onClick={() => onOpenProfile(s.id)} className="row-link w-full flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3 text-left">
                            <span className="w-7 font-display text-[1.05rem] tabular flex-shrink-0 leading-none" style={{ color: rank !== null && rank <= 3 ? 'var(--gold)' : 'var(--text-muted)' }}>{rank ?? '–'}</span>
                            <Avatar name={s.name} role={roleAt(s, weekIndex)} photoUrl={w?.member.photoUrl ?? s.photoUrl} size="sm" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[1rem] font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                                <span className="block text-[0.8rem] truncate" style={{ color: 'var(--text-muted)' }}>{w?.houseName ?? houseNameAt(s, weekIndex)} · {ROLE_LABEL[roleAt(s, weekIndex)].toLowerCase()}</span>
                            </span>
                            {scope === 'week' && <Movement delta={movement(s.weeks, weekIndex)} />}
                            {scope === 'season' && value !== null && <span className="text-[0.75rem] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t('{0} апта', weeks)}</span>}
                            <span className="w-16 text-right font-display text-[1.3rem] tabular flex-shrink-0" style={{ color: value !== null && (rank !== null || scope === 'week') ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {excused ? <span className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{t('себептүү')}</span> : value !== null ? fmt(value) : '–'}
                            </span>
                        </button>
                    </li>
                ))}
            </ol>
            {limit !== undefined && listed.length > limit && (
                <button onClick={() => setShowAll(v => !v)} aria-expanded={showAll} className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-[0.9rem] font-medium transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}>
                    {showAll ? t('Кыскартуу') : t('Баарын көрсөтүү ({0})', listed.length)}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                </button>
            )}
            {waiting.length > 0 && (!limit || showAll) && (
                <button onClick={() => setShowWaiting(v => !v)} aria-expanded={showWaiting} className="w-full flex items-center gap-3 px-5 sm:px-6 py-3.5 text-left transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                    <span className="flex-1 min-w-0 text-[0.9rem]">
                        {scope === 'week' ? t('Киргизиле элек') : t('Азырынча эсеп жок')}
                        {scope === 'week' && <span> · {waitingHouses.join(', ')}</span>}
                        <span> · {t('{0} адам', waiting.length)}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showWaiting ? 'rotate-180' : ''}`} />
                </button>
            )}
        </section>
    );
};
