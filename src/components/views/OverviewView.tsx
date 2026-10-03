import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Crown } from 'lucide-react';
import type { DataFile, Role } from '../../types';
import type { Insights, MemberSeries } from '../../utils/insights';
import { movement, ROLE_LABEL, weekOf } from '../../utils/insights';
import { TEAM_COLORS } from '../../utils/scoring';
import { Avatar } from '../Avatar';
import { useIsPhone } from '../../hooks/useMediaQuery';
import { Movement, SectionHeader, Sparkline } from '../ui';

const ROLE_FILTER_LABEL: Record<'all' | Role, string> = { all: 'Бардыгы', imam: 'Имамдар', zam: 'Орун басарлар', member: 'Мүчөлөр' };
const pad2 = (n: number) => String(n).padStart(2, '0');
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

interface OverviewViewProps {
    data: DataFile;
    weekIndex: number;
    insights: Insights;
    onOpenProfile: (memberId: string) => void;
    showSubmission: boolean;
}

const PODIUM_TONE = [
    { ring: 'var(--tier-gold-2)', bg: 'linear-gradient(135deg, var(--tier-gold-1), var(--tier-gold-2))', label: '1' },
    { ring: 'var(--tier-silver-2)', bg: 'linear-gradient(135deg, var(--tier-silver-1), var(--tier-silver-2))', label: '2' },
    { ring: 'var(--tier-bronze-2)', bg: 'linear-gradient(135deg, var(--tier-bronze-1), var(--tier-bronze-2))', label: '3' }
];

const PodiumCard: React.FC<{ series: MemberSeries; weekIndex: number; place: number; onOpen: () => void; featured?: boolean }> = ({ series, weekIndex, place, onOpen, featured }) => {
    const w = weekOf(series.weeks, weekIndex)!;
    const tone = PODIUM_TONE[place - 1];
    const isPhone = useIsPhone();
    if (isPhone && !featured) {
        // Compact, side-by-side card for 2nd/3rd place on phones.
        return (
            <button onClick={onOpen} className="card text-center w-full p-3.5 flex flex-col items-center">
                <div className="relative">
                    <div className="rounded-full p-[3px]" style={{ background: tone.bg }}>
                        <Avatar name={series.name} role={series.role} photoUrl={series.photoUrl} size="lg" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center font-display font-bold text-[0.9rem]" style={{ background: tone.bg, color: '#fff', border: '2px solid var(--surface)' }}>{tone.label}</span>
                </div>
                <div className="font-display font-bold text-[1.1rem] leading-tight mt-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>{series.name}</div>
                <div className="text-[0.72rem] truncate max-w-full" style={{ color: 'var(--text-muted)' }}>{w.houseName}</div>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="font-display font-bold text-[1.6rem] tabular leading-none" style={{ color: 'var(--text-primary)' }}>{fmt(w.score)}</span>
                    <Movement delta={movement(series.weeks, weekIndex)} />
                </div>
            </button>
        );
    }
    return (
        <button
            onClick={onOpen}
            className={`card text-left w-full relative overflow-hidden transition-transform hover:-translate-y-0.5 ${featured ? 'p-5 sm:p-6' : 'p-4 sm:p-5'}`}
            style={featured ? { boxShadow: 'var(--shadow-lift)', borderColor: 'color-mix(in oklab, var(--gold) 45%, var(--border))' } : undefined}
        >
            {featured && <div className="ornament-frieze absolute top-0 left-0 right-0 opacity-30" style={{ height: 10 }} aria-hidden="true" />}
            <div className={`flex items-center gap-3.5 ${featured ? 'mt-1' : ''}`}>
                <div className="relative flex-shrink-0">
                    <div className="rounded-full p-[3px]" style={{ background: tone.bg }}>
                        <Avatar name={series.name} role={series.role} photoUrl={series.photoUrl} size={featured ? 'xl' : 'lg'} />
                    </div>
                    <span
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-[1rem]"
                        style={{ background: tone.bg, color: '#fff', border: '2px solid var(--surface)', textShadow: '0 1px 1px rgba(0,0,0,0.25)' }}
                    >
                        {place === 1 ? <Crown className="w-3.5 h-3.5" /> : tone.label}
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="eyebrow" style={{ color: 'var(--gold)' }}>{place}-орун</div>
                    <div className={`font-display font-bold leading-tight line-clamp-2 ${featured ? 'text-[1.6rem]' : 'text-[1.3rem]'}`} style={{ color: 'var(--text-primary)' }}>{series.name}</div>
                    <div className="text-[0.8rem] truncate" style={{ color: 'var(--text-muted)' }}>{w.houseName} · <i>{ROLE_LABEL[series.role]}</i></div>
                </div>
            </div>
            <div className="flex items-end justify-between mt-4">
                <div>
                    <div className="eyebrow">Упай</div>
                    <div className={`font-display font-bold tabular leading-none mt-1 ${featured ? 'text-[2.6rem]' : 'text-[2rem]'}`} style={{ color: 'var(--text-primary)' }}>{fmt(w.score)}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    <Movement delta={movement(series.weeks, weekIndex)} size="md" />
                    <Sparkline values={series.weeks.filter(x => x.weekIndex <= weekIndex && x.submitted).map(x => x.score)} color={tone.ring} width={84} height={26} />
                </div>
            </div>
        </button>
    );
};

export const OverviewView: React.FC<OverviewViewProps> = ({ data, weekIndex, insights, onOpenProfile, showSubmission }) => {
    const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
    const week = data.weeks[weekIndex];

    const people = useMemo(() => {
        return [...insights.members.values()]
            .map(s => ({ s, w: weekOf(s.weeks, weekIndex) }))
            .filter((x): x is { s: MemberSeries; w: NonNullable<typeof x.w> } => !!x.w)
            .sort((a, b) => (a.w.rank ?? 1e9) - (b.w.rank ?? 1e9) || b.w.score - a.w.score || a.s.name.localeCompare(b.s.name));
    }, [insights, weekIndex]);

    const filtered = roleFilter === 'all' ? people : people.filter(p => p.s.role === roleFilter);
    const podium = people.filter(p => p.w.submitted && p.w.score > 0 && p.w.rank !== null && p.w.rank <= 3).slice(0, 3);

    const houses = useMemo(() => {
        return [...insights.houses.values()]
            .map(h => ({ h, w: weekOf(h.weeks, weekIndex) }))
            .filter((x): x is { h: typeof x.h; w: NonNullable<typeof x.w> } => !!x.w)
            .sort((a, b) => (a.w.rank ?? 1e9) - (b.w.rank ?? 1e9) || b.w.avg - a.w.avg);
    }, [insights, weekIndex]);
    const maxAvg = Math.max(1, ...houses.map(x => x.w.avg));
    const submittedCount = week.teams.filter(t => t.submitted).length;

    return (
        <div className="space-y-8 sm:space-y-10">
            {/* Podium — overlaps the hero */}
            {podium.length > 0 && (
                <section className="-mt-10 md:mt-0 relative z-10" aria-label="Аптанын үч мыктысы">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:items-end stagger">
                        {/* Phone/tablet: 1st on top, 2nd and 3rd side by side; desktop: 2 · 1 · 3 */}
                        {podium[1] && <div className="order-2 lg:order-1"><PodiumCard series={podium[1].s} weekIndex={weekIndex} place={podium[1].w.rank!} onOpen={() => onOpenProfile(podium[1].s.id)} /></div>}
                        {podium[0] && <div className="order-1 col-span-2 lg:col-span-1 lg:order-2"><PodiumCard series={podium[0].s} weekIndex={weekIndex} place={podium[0].w.rank!} onOpen={() => onOpenProfile(podium[0].s.id)} featured /></div>}
                        {podium[2] && <div className="order-3"><PodiumCard series={podium[2].s} weekIndex={weekIndex} place={podium[2].w.rank!} onOpen={() => onOpenProfile(podium[2].s.id)} /></div>}
                    </div>
                </section>
            )}

            {showSubmission && (
                <section className="card card-pad animate-fade-up" aria-label="Маалымат киргизүү абалы">
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                        <div>
                            <div className="eyebrow" style={{ color: 'var(--gold)' }}>Бул апта</div>
                            <div className="font-display font-bold text-[1.35rem]" style={{ color: 'var(--text-primary)' }}>
                                {submittedCount} / {week.teams.length} үй маалымат киргизди
                            </div>
                        </div>
                        <div className="w-full sm:w-56 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--gridline)' }}>
                            <div className="h-full rounded-full animate-grow-x" style={{ width: `${(submittedCount / Math.max(1, week.teams.length)) * 100}%`, backgroundColor: submittedCount === week.teams.length ? 'var(--success)' : 'var(--gold)' }} />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {week.teams.map(t => (
                            <span key={t.id} className="chip" style={t.submitted ? { borderColor: 'color-mix(in oklab, var(--success) 40%, var(--border))', color: 'var(--success)' } : { borderStyle: 'dashed' }}>
                                {t.submitted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}
                                {t.name}
                                {!t.submitted && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— күтүлүүдө</span>}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:items-start">
                {/* Everyone */}
                <section className="card overflow-hidden order-2 xl:order-1">
                    <div className="card-pad pb-0 sm:pb-0">
                        <SectionHeader
                            eyebrow={`${week.weekNumber}-апта`}
                            title="Бардык катышуучулар"
                            action={
                                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ролу боюнча">
                                    {(['all', 'imam', 'zam', 'member'] as const).map(r => (
                                        <button key={r} className="chip" aria-pressed={roleFilter === r} onClick={() => setRoleFilter(r)}>{ROLE_FILTER_LABEL[r]}</button>
                                    ))}
                                </div>
                            }
                        />
                    </div>
                    <ol className="stagger">
                        {filtered.map(({ s, w }, i) => (
                            <li key={s.id}>
                                <button
                                    onClick={() => onOpenProfile(s.id)}
                                    className="row-link w-full flex items-center gap-2.5 sm:gap-3.5 px-3 sm:px-6 py-2.5 text-left"
                                    style={{ borderTop: i === 0 ? '1px solid var(--border-strong)' : '1px solid var(--border)' }}
                                >
                                    <span className="w-6 sm:w-7 flex-shrink-0 font-display font-bold text-[1.05rem] tabular" style={{ color: w.rank && w.rank <= 3 ? 'var(--gold)' : 'var(--text-muted)' }}>
                                        {w.rank ? pad2(w.rank) : '—'}
                                    </span>
                                    <span className="w-7 flex-shrink-0 hidden min-[380px]:inline-flex"><Movement delta={movement(s.weeks, weekIndex)} /></span>
                                    <Avatar name={s.name} role={s.role} photoUrl={w.member.photoUrl} size="sm" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-bold truncate text-[0.95rem]" style={{ color: 'var(--text-primary)' }}>{w.member.name}</span>
                                        <span className="block text-[0.76rem] truncate" style={{ color: 'var(--text-muted)' }}>{w.houseName} · <i>{ROLE_LABEL[s.role]}</i></span>
                                    </span>
                                    <span className="hidden sm:block">
                                        <Sparkline values={s.weeks.filter(x => x.weekIndex <= weekIndex && x.submitted).map(x => x.score)} color="var(--accent)" />
                                    </span>
                                    <span className="w-14 text-right font-display font-bold text-[1.25rem] tabular flex-shrink-0" style={{ color: w.submitted ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {w.submitted ? fmt(w.score) : '—'}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* Houses */}
                <section className="card card-pad xl:sticky xl:top-20 order-1 xl:order-2">
                    <SectionHeader eyebrow="Орточо упай боюнча" title="Үйлөрдүн рейтинги" />
                    <ol className="space-y-1 stagger">
                        {houses.map(({ h, w }) => (
                            <li key={h.id} className="py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 font-display font-bold text-[1.1rem] tabular" style={{ color: w.rank === 1 ? 'var(--gold)' : 'var(--text-muted)' }}>{w.rank ? pad2(w.rank) : '—'}</span>
                                    <span className="w-7 flex-shrink-0"><Movement delta={movement(h.weeks, weekIndex)} /></span>
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TEAM_COLORS[h.colorIndex % TEAM_COLORS.length] }} />
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-bold truncate" style={{ color: 'var(--text-primary)' }}>{h.name}</span>
                                        <span className="block text-[0.74rem]" style={{ color: 'var(--text-muted)' }}>
                                            {w.memberCount} адам{!w.submitted && ' · маалымат жок'}
                                        </span>
                                    </span>
                                    <Sparkline values={h.weeks.filter(x => x.weekIndex <= weekIndex && x.submitted).map(x => x.avg)} color={TEAM_COLORS[h.colorIndex % TEAM_COLORS.length]} width={54} />
                                    <span className="w-14 text-right font-display font-bold text-[1.3rem] tabular" style={{ color: w.submitted ? 'var(--text-primary)' : 'var(--text-muted)' }}>{w.submitted ? fmt(w.avg) : '—'}</span>
                                </div>
                                <div className="mt-2 ml-[4.25rem] h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--gridline)' }}>
                                    <div className="h-full rounded-full animate-grow-x" style={{ width: `${(w.avg / maxAvg) * 100}%`, backgroundColor: TEAM_COLORS[h.colorIndex % TEAM_COLORS.length] }} />
                                </div>
                            </li>
                        ))}
                    </ol>
                    <p className="text-[0.76rem] mt-4 pl-3" style={{ color: 'var(--text-muted)', borderLeft: '2px solid var(--gold)' }}>
                        Үйлөрдүн саны ар башка болгондуктан, адилеттүүлүк үчүн рейтинг <b>орточо упайга</b> негизделген: жалпы упай ÷ мүчөлөрдүн саны.
                    </p>
                </section>
            </div>
        </div>
    );
};
