import React, { useMemo, useState } from 'react';
import type { DataFile, Role } from '../../types';
import type { Insights, MemberSeries, MemberWeek } from '../../utils/insights';
import { movement, ROLE_LABEL, weekOf } from '../../utils/insights';
import { Avatar } from '../Avatar';
import { Movement, SectionHeader } from '../ui';

const ROLE_FILTER_LABEL: Record<'all' | Role, string> = { all: 'Бардыгы', imam: 'Имамдар', zam: 'Орун басарлар', member: 'Мүчөлөр' };
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

    const people = useMemo(() => {
        return [...insights.members.values()]
            .map(s => ({ s, w: weekOf(s.weeks, weekIndex) }))
            .filter((x): x is { s: MemberSeries; w: MemberWeek } => !!x.w)
            .sort((a, b) => (a.w.rank ?? 1e9) - (b.w.rank ?? 1e9) || b.w.score - a.w.score || a.s.name.localeCompare(b.s.name));
    }, [insights, weekIndex]);
    const filtered = roleFilter === 'all' ? people : people.filter(p => p.s.role === roleFilter);
    const top = people.filter(p => p.w.submitted && p.w.score > 0 && p.w.rank !== null && p.w.rank <= 3).slice(0, 3);

    const houses = useMemo(() => {
        return [...insights.houses.values()]
            .map(h => ({ h, w: weekOf(h.weeks, weekIndex) }))
            .filter((x): x is { h: typeof x.h; w: NonNullable<typeof x.w> } => !!x.w)
            .sort((a, b) => (a.w.rank ?? 1e9) - (b.w.rank ?? 1e9) || b.w.avg - a.w.avg);
    }, [insights, weekIndex]);

    return (
        <div className="space-y-16 sm:space-y-20">
            {top.length > 0 && (
                <section aria-label="Аптанын үч мыктысы">
                    <div className="eyebrow text-center mb-6">Аптанын үч мыктысы</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-6 divide-y divide-[var(--border)] sm:divide-y-0">
                        {top.map(({ s, w }) => <Laureate key={s.id} s={s} w={w} weekIndex={weekIndex} onOpen={() => onOpenProfile(s.id)} />)}
                    </div>
                </section>
            )}

            {showSubmission && (
                <section className="text-center" aria-label="Маалымат киргизүү абалы">
                    <div className="eyebrow mb-3">Бул апта · {week.teams.filter(t => t.submitted).length} / {week.teams.length} үй киргизди</div>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[0.92rem]">
                        {week.teams.map(t => (
                            <span key={t.id} className="inline-flex items-center gap-2" style={{ color: t.submitted ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={t.submitted ? { backgroundColor: 'var(--gold)' } : { border: '1px solid var(--text-muted)' }} />
                                {t.name}{!t.submitted && <i className="text-[0.8rem]"> — {week.locked ? 'киргизилген жок (0)' : 'күтүлүүдө'}</i>}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            <div className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-20 items-start">
                {/* Houses */}
                <section>
                    <SectionHeader eyebrow="Үй рейтинги" title="Үйлөр" />
                    <ol className="stagger">
                        {houses.map(({ h, w }) => (
                            <li key={h.id} className="flex items-baseline gap-3 py-3">
                                <span className="w-6 text-[0.75rem] tabular" style={{ color: 'var(--gold-dim)' }}>{w.rank ? pad2(w.rank) : '—'}</span>
                                <span className="font-display text-[1.35rem] min-w-0 truncate" style={{ color: w.rank === 1 ? 'var(--gold)' : 'var(--text-primary)' }}>{h.name}</span>
                                <Movement delta={movement(h.weeks, weekIndex)} />
                                <span className="leader" />
                                <span className="font-display text-[1.45rem] tabular flex-shrink-0" style={{ color: w.submitted ? (w.rank === 1 ? 'var(--gold)' : 'var(--text-primary)') : 'var(--text-muted)' }}>{w.submitted ? fmt(w.avg) : '—'}</span>
                            </li>
                        ))}
                    </ol>
                    <p className="text-[0.82rem] italic mt-5 max-w-[42ch]" style={{ color: 'var(--text-muted)' }}>
                        Рейтинг = мүчөлөрдүн орточо упайы + мини-карта (ар бир иш 100% аткарылса 5 упай, эң көп 35).
                    </p>
                </section>

                {/* Everyone */}
                <section>
                    <SectionHeader
                        eyebrow={`${week.weekNumber}-апта`}
                        title="Бардык катышуучулар"
                        action={
                            <div className="flex flex-wrap" role="group" aria-label="Ролу боюнча">
                                {(['all', 'imam', 'zam', 'member'] as const).map(r => (
                                    <button key={r} className="chip" aria-pressed={roleFilter === r} onClick={() => setRoleFilter(r)}>{ROLE_FILTER_LABEL[r]}</button>
                                ))}
                            </div>
                        }
                    />
                    <ol>
                        {filtered.map(({ s, w }) => (
                            <li key={s.id}>
                                <button
                                    onClick={() => onOpenProfile(s.id)}
                                    className="row-link w-full flex items-center gap-3 sm:gap-4 px-2 -mx-2 py-3 text-left"
                                    style={{ borderBottom: '1px solid var(--border)' }}
                                >
                                    <span className="w-6 text-[0.75rem] tabular flex-shrink-0" style={{ color: 'var(--gold-dim)' }}>{w.rank ? pad2(w.rank) : '—'}</span>
                                    <Avatar name={s.name} role={s.role} photoUrl={w.member.photoUrl} size="sm" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[1rem]" style={{ color: 'var(--text-primary)' }}>{w.member.name}</span>
                                        <span className="block text-[0.78rem] italic truncate" style={{ color: 'var(--text-muted)' }}>{w.houseName} · {ROLE_LABEL[s.role].toLowerCase()}</span>
                                    </span>
                                    <Movement delta={movement(s.weeks, weekIndex)} />
                                    <span className="w-14 text-right font-display text-[1.3rem] tabular flex-shrink-0" style={{ color: w.submitted ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {w.submitted ? fmt(w.score) : '—'}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </section>
            </div>
        </div>
    );
};
