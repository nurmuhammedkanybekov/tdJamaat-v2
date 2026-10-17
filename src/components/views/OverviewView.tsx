import React, { useMemo, useState } from 'react';
import type { DataFile, Role } from '../../types';
import type { Insights, MemberSeries, MemberWeek } from '../../utils/insights';
import { movement, ROLE_LABEL, weekOf } from '../../utils/insights';
import { CITIES, houseStandings, personStandings } from '../../utils/standings';
import type { City, Scope } from '../../utils/standings';
import { Avatar } from '../Avatar';
import { Movement, SectionHeader } from '../ui';
import { t } from '../../i18n';

const ROLE_FILTER_LABEL: Record<'all' | Role, string> = { all: t('Бардыгы'), imam: t('Капитандар'), zam: t('Орун басарлар'), member: t('Мүчөлөр') };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const pad2 = (n: number) => String(n).padStart(2, '0');
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

interface OverviewViewProps {
    data: DataFile;
    weekIndex: number;
    insights: Insights;
    onOpenProfile: (memberId: string) => void;
    showSubmission: boolean;
}

// One of the week's top three: a gold hairline ring (photo inside if there is
// one), the Roman place, the name, and the score.
const Laureate: React.FC<{ s: MemberSeries; w: MemberWeek; weekIndex: number; onOpen: () => void }> = ({ s, w, weekIndex, onOpen }) => (
    <button onClick={onOpen} className="group flex sm:flex-col items-center gap-4 sm:gap-3 text-left sm:text-center w-full py-4 sm:py-2">
        <span className="relative flex-shrink-0 rounded-full p-[5px] transition-colors" style={{ border: '1px solid var(--gold)' }}>
            <Avatar name={s.name} role={s.role} photoUrl={w.member.photoUrl} size="lg" />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 font-display text-[0.95rem] leading-none" style={{ color: 'var(--gold)', backgroundColor: 'var(--page-plane)' }}>{ROMAN[(w.rank ?? 1) - 1]}</span>
        </span>
        <span className="flex-1 min-w-0 sm:mt-2">
            <span className="block font-display text-[1.45rem] leading-tight line-clamp-2 sm:truncate transition-colors group-hover:text-[var(--gold)]" style={{ color: 'var(--text-primary)' }}>{w.member.name}</span>
            <span className="block text-[0.82rem] italic truncate" style={{ color: 'var(--text-muted)' }}>{w.houseName} · {ROLE_LABEL[s.role].toLowerCase()}</span>
        </span>
        <span className="flex-shrink-0 flex sm:flex-col items-center gap-2 sm:gap-1">
            <span className="font-display text-[1.9rem] leading-none tabular" style={{ color: 'var(--text-primary)' }}>{fmt(w.score)}</span>
            <Movement delta={movement(s.weeks, weekIndex)} />
        </span>
    </button>
);

export const OverviewView: React.FC<OverviewViewProps> = ({ data, weekIndex, insights, onOpenProfile, showSubmission }) => {
    const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
    const week = data.weeks[weekIndex];

    const [scope, setScope] = useState<Scope>('week');
    const [city, setCity] = useState<City | 'all'>('all');
    const weeksSoFar = weekIndex + 1;

    // Top three of the week: always the whole jamaat, this week.
    const top = useMemo(() => [...insights.members.values()]
        .map(s => ({ s, w: weekOf(s.weeks, weekIndex) }))
        .filter((x): x is { s: MemberSeries; w: MemberWeek } => !!x.w && x.w.submitted && x.w.score > 0 && x.w.rank !== null && x.w.rank <= 3)
        .sort((a, b) => a.w.rank! - b.w.rank!)
        .slice(0, 3), [insights, weekIndex]);

    const people = useMemo(() => personStandings(insights, weekIndex, scope, city, weeksSoFar), [insights, weekIndex, scope, city, weeksSoFar]);
    const filtered = roleFilter === 'all' ? people : people.filter(p => p.s.role === roleFilter);
    const houses = useMemo(() => houseStandings(insights, weekIndex, scope, city), [insights, weekIndex, scope, city]);
    // Movement arrows are about the whole jamaat's weekly ranking, so only there.
    const showMovement = scope === 'week' && city === 'all';
    const minWeeks = Math.max(1, Math.ceil(weeksSoFar / 2));

    return (
        <div className="space-y-16 sm:space-y-20">
            {top.length > 0 && (
                <section aria-label={t('Аптанын үч мыктысы')}>
                    <div className="eyebrow text-center mb-6">{t('Аптанын үч мыктысы')}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-6 divide-y divide-[var(--border)] sm:divide-y-0">
                        {top.map(({ s, w }) => <Laureate key={s.id} s={s} w={w} weekIndex={weekIndex} onOpen={() => onOpenProfile(s.id)} />)}
                    </div>
                </section>
            )}

            {showSubmission && (
                <section className="text-center" aria-label={t('Маалымат киргизүү абалы')}>
                    <div className="eyebrow mb-3">{t('Бул апта · {0} / {1} үй киргизди', week.teams.filter(it => it.submitted).length, week.teams.length)}</div>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[0.92rem]">
                        {week.teams.map(it => (
                            <span key={it.id} className="inline-flex items-center gap-2" style={{ color: it.submitted ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={it.submitted ? { backgroundColor: 'var(--gold)' } : { border: '1px solid var(--text-muted)' }} />
                                {it.name}{!it.submitted && <i className="text-[0.8rem]"> — {week.locked ? t('киргизилген жок (0)') : t('күтүлүүдө')}</i>}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            <div>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 mb-10 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex flex-wrap" role="group" aria-label={t('Мезгил')}>
                    <button className="chip" aria-pressed={scope === 'week'} onClick={() => setScope('week')}>{t('{0}-апта', week.weekNumber)}</button>
                    <button className="chip" aria-pressed={scope === 'season'} onClick={() => setScope('season')}>{t('Бүт сезон')}</button>
                </div>
                <div className="flex flex-wrap" role="group" aria-label={t('Шаар')}>
                    <button className="chip" aria-pressed={city === 'all'} onClick={() => setCity('all')}>{t('Бардык шаарлар')}</button>
                    {CITIES.map(c => <button key={c.id} className="chip" aria-pressed={city === c.id} onClick={() => setCity(c.id)}>{c.label}</button>)}
                </div>
            </div>
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-20 items-start">
                {/* Houses */}
                <section>
                    <SectionHeader eyebrow={scope === 'week' ? t('Үй рейтинги') : t('Бүт сезон · {0} апта', weeksSoFar)} title={t('Үйлөр')} />
                    <ol className="stagger">
                        {houses.map(({ h, rank, value, weeks }) => (
                            <li key={h.id} className="flex items-baseline gap-3 py-3">
                                <span className="w-6 text-[0.75rem] tabular" style={{ color: 'var(--gold-dim)' }}>{rank ? pad2(rank) : '—'}</span>
                                <span className="font-display text-[1.35rem] min-w-0 truncate" style={{ color: rank === 1 ? 'var(--gold)' : 'var(--text-primary)' }}>{h.name}</span>
                                {showMovement && <Movement delta={movement(h.weeks, weekIndex)} />}
                                <span className="leader" />
                                {scope === 'season' && value !== null && <span className="text-[0.75rem] italic flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t('{0} апта', weeks)}</span>}
                                <span className="font-display text-[1.45rem] tabular flex-shrink-0" style={{ color: value !== null ? (rank === 1 ? 'var(--gold)' : 'var(--text-primary)') : 'var(--text-muted)' }}>{value !== null ? fmt(value) : '—'}</span>
                            </li>
                        ))}
                    </ol>
                    <p className="text-[0.82rem] italic mt-5 max-w-[42ch]" style={{ color: 'var(--text-muted)' }}>
                        {t('Рейтинг = мүчөлөрдүн орточо упайы + мини-карта (ар бир иш 100% аткарылса 5 упай, эң көп 35).')}
                        {scope === 'season' && <> {t('Бүт сезон: эсептелген апталардын орточо рейтинги.')}</>}
                    </p>
                </section>

                {/* Everyone */}
                <section>
                    <SectionHeader
                        eyebrow={scope === 'week' ? t('{0}-апта', week.weekNumber) : t('Бүт сезон · {0} апта', weeksSoFar)}
                        title={t('Бардык катышуучулар')}
                        action={
                            <div className="flex flex-wrap" role="group" aria-label={t('Ролу боюнча')}>
                                {(['all', 'imam', 'zam', 'member'] as const).map(r => (
                                    <button key={r} className="chip" aria-pressed={roleFilter === r} onClick={() => setRoleFilter(r)}>{ROLE_FILTER_LABEL[r]}</button>
                                ))}
                            </div>
                        }
                    />
                    {scope === 'season' && (
                        <p className="text-[0.82rem] italic -mt-3 mb-4" style={{ color: 'var(--text-muted)' }}>{t('Орточо упай. Орун алуу үчүн жок дегенде {0} аптага катышуу керек.', minWeeks)}</p>
                    )}
                    <ol>
                        {filtered.map(({ s, rank, value, weeks, week: w, excused }) => (
                            <li key={s.id}>
                                <button
                                    onClick={() => onOpenProfile(s.id)}
                                    className="row-link w-full flex items-center gap-3 sm:gap-4 px-2 -mx-2 py-3 text-left"
                                    style={{ borderBottom: '1px solid var(--border)' }}
                                >
                                    <span className="w-6 text-[0.75rem] tabular flex-shrink-0" style={{ color: 'var(--gold-dim)' }}>{rank ? pad2(rank) : '—'}</span>
                                    <Avatar name={s.name} role={s.role} photoUrl={w?.member.photoUrl ?? s.photoUrl} size="sm" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[1rem]" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                                        <span className="block text-[0.78rem] italic truncate" style={{ color: 'var(--text-muted)' }}>{w?.houseName ?? s.houseName} · {ROLE_LABEL[s.role].toLowerCase()}</span>
                                    </span>
                                    {showMovement && <Movement delta={movement(s.weeks, weekIndex)} />}
                                    {scope === 'season' && value !== null && <span className="text-[0.75rem] italic flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t('{0} апта', weeks)}</span>}
                                    <span className="w-14 text-right font-display text-[1.3rem] tabular flex-shrink-0" style={{ color: value !== null && (rank !== null || scope === 'week') ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {excused ? <span className="text-[0.8rem] italic" style={{ color: 'var(--text-muted)' }}>{t('себептүү')}</span> : value !== null ? fmt(value) : '—'}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </section>
            </div>
            </div>
        </div>
    );
};
