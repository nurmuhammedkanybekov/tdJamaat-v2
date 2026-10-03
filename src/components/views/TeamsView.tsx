import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, PenLine } from 'lucide-react';
import type { DataFile } from '../../types';
import type { Insights, MemberSeries, MemberWeek } from '../../utils/insights';
import { METRICS, movement, ROLE_LABEL, weekOf } from '../../utils/insights';
import { COLORS, TEAM_COLORS, calculatePerformancePercentage } from '../../utils/scoring';
import { Avatar } from '../Avatar';
import { Movement, ProgressBar, SectionHeader, Sparkline } from '../ui';
import { perfColor } from '../../utils/style';

interface TeamsViewProps {
    data: DataFile;
    weekIndex: number;
    insights: Insights;
    initialHouseId: string | null;
    canEditHouse: (houseId: string) => boolean;
    onEditHouse: (houseId: string) => void;
    onOpenProfile: (memberId: string) => void;
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const pad2 = (n: number) => String(n).padStart(2, '0');

export const TeamsView: React.FC<TeamsViewProps> = ({ data, weekIndex, insights, initialHouseId, canEditHouse, onEditHouse, onOpenProfile }) => {
    const week = data.weeks[weekIndex];
    const [houseId, setHouseId] = useState<string>(() => (initialHouseId && week.teams.some(t => t.id === initialHouseId) ? initialHouseId : week.teams[0]?.id ?? ''));
    const team = week.teams.find(t => t.id === houseId) ?? week.teams[0];
    const series = team ? insights.houses.get(team.id) : undefined;
    const hw = series ? weekOf(series.weeks, weekIndex) : undefined;
    const color = TEAM_COLORS[(series?.colorIndex ?? 0) % TEAM_COLORS.length];

    // Members of this house this week, ranked within the house.
    const members = useMemo(() => {
        if (!team) return [];
        return team.members
            .map(m => {
                const s = insights.members.get(m.id)!;
                return { s, w: weekOf(s.weeks, weekIndex)! };
            })
            .filter(x => x.s && x.w)
            .sort((a, b) => b.w.score - a.w.score);
    }, [team, insights, weekIndex]);

    if (!team) return null;

    const cardKeys = Object.keys(team.miniCard) as Array<keyof typeof team.miniCard>;

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* House switcher */}
            <div className="-mx-4 sm:mx-0">
                <div className="scroll-row scroll-fade flex gap-2 px-4 sm:px-0 sm:flex-wrap pb-1" role="tablist" aria-label="Үйлөр">
                    {week.teams.map(t => {
                        const hs = insights.houses.get(t.id);
                        const c = TEAM_COLORS[(hs?.colorIndex ?? 0) % TEAM_COLORS.length];
                        const active = t.id === team.id;
                        return (
                            <button key={t.id} role="tab" aria-selected={active} onClick={() => setHouseId(t.id)} className={`chip ${active ? 'is-active' : ''}`} style={{ padding: '0.5rem 0.95rem', fontSize: '0.85rem' }}>
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? '#fff' : c }} />
                                {t.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* House summary */}
            <section className="card overflow-hidden">
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 30%, transparent))` }} />
                <div className="card-pad flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <div className="flex-1 min-w-0">
                        <div className="eyebrow flex items-center gap-2" style={{ color: 'var(--gold)' }}>
                            {hw?.rank ? `${hw.rank}-орун` : 'Рейтингде жок'} · {week.weekNumber}-апта
                        </div>
                        <h2 className="font-display font-bold text-[2.2rem] sm:text-[2.6rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{team.name}</h2>
                        <div className="flex items-center gap-3 mt-1 text-[0.82rem] flex-wrap" style={{ color: 'var(--text-muted)' }}>
                            <span>{team.members.length} адам</span>
                            {team.submitted
                                ? <span className="inline-flex items-center gap-1" style={{ color: 'var(--success)' }}><CheckCircle2 className="w-3.5 h-3.5" /> маалымат киргизилди</span>
                                : <span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> маалымат күтүлүүдө</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-5 sm:gap-7">
                        <div>
                            <div className="eyebrow">Орточо упай</div>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="font-display font-bold text-[2.6rem] leading-none tabular" style={{ color: 'var(--text-primary)' }}>{hw?.submitted ? fmt(hw.avg) : '—'}</span>
                                {series && <Movement delta={movement(series.weeks, weekIndex)} size="md" />}
                            </div>
                        </div>
                        {series && <Sparkline values={series.weeks.filter(w => w.weekIndex <= weekIndex && w.submitted).map(w => w.avg)} color={color} width={110} height={40} />}
                    </div>
                    {canEditHouse(team.id) && (
                        <button onClick={() => onEditHouse(team.id)} className="btn btn-primary self-start sm:self-center">
                            <PenLine className="w-4 h-4" /> Өзгөртүү
                        </button>
                    )}
                </div>
            </section>

            {/* Mini card */}
            <section>
                <SectionHeader eyebrow="Командалык иштер" title="Мини-карта" />
                <div className="grid grid-cols-2 min-[460px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 stagger">
                    {cardKeys.map(key => {
                        const v = team.miniCard[key];
                        const pct = calculatePerformancePercentage(v.actual, v.target);
                        return (
                            <div key={key} className="card p-3.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[0.78rem] font-bold" style={{ color: 'var(--text-muted)' }}>{key}</span>
                                    {pct >= 100 && <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />}
                                </div>
                                <div className="font-display font-bold text-[1.7rem] tabular leading-none mt-2" style={{ color: 'var(--text-primary)' }}>
                                    {v.actual}<span className="text-[0.95rem] font-semibold" style={{ color: 'var(--text-muted)' }}> / {v.target}</span>
                                </div>
                                <div className="mt-3"><ProgressBar pct={pct} height={5} /></div>
                                <div className="text-[0.75rem] font-bold mt-1.5 tabular" style={{ color: perfColor(pct) }}>{Math.round(pct)}%</div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Members */}
            <section>
                <SectionHeader
                    eyebrow={team.name}
                    title="Мүчөлөрдүн рейтинги"
                    action={
                        <div className="flex gap-3 text-[0.75rem]">
                            {(['imam', 'zam', 'member'] as const).map(role => (
                                <span key={role} className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[role] }} /><i>{ROLE_LABEL[role]}</i>
                                </span>
                            ))}
                        </div>
                    }
                />

                {/* Phone & tablet: cards */}
                <ol className="lg:hidden space-y-3 stagger">
                    {members.map(({ s, w }, i) => (
                        <li key={s.id}>
                            <MemberCard s={s} w={w} place={i + 1} weekIndex={weekIndex} onOpen={() => onOpenProfile(s.id)} />
                        </li>
                    ))}
                </ol>

                {/* Desktop: table */}
                <div className="hidden lg:block card overflow-hidden">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ paddingTop: '1rem', paddingLeft: '1.5rem' }}>#</th>
                                <th style={{ paddingTop: '1rem' }}>Аты</th>
                                {METRICS.map(m => <th key={m} style={{ paddingTop: '1rem', textAlign: 'right' }}>{m}</th>)}
                                <th style={{ paddingTop: '1rem', textAlign: 'right', paddingRight: '1.5rem' }}>Упай</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(({ s, w }, i) => (
                                <tr key={s.id} className="row-link" onClick={() => onOpenProfile(s.id)}>
                                    <td className="font-display font-bold text-[1.1rem] tabular" style={{ paddingLeft: '1.5rem', color: i < 3 ? 'var(--gold)' : 'var(--text-muted)' }}>{pad2(i + 1)}</td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={s.name} role={s.role} photoUrl={w.member.photoUrl} size="sm" />
                                            <div className="min-w-0">
                                                <div className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{w.member.name}</div>
                                                <div className="text-[0.75rem] italic" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[s.role]}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {METRICS.map(m => (
                                        <td key={m} className="tabular font-bold text-[0.86rem]" style={{ textAlign: 'right', color: perfColor(w.pct[m]) }} title={`${w.member.actual[m]} / ${w.member.target[m]}`}>
                                            {Math.round(w.pct[m])}%
                                        </td>
                                    ))}
                                    <td className="font-display font-bold text-[1.3rem] tabular" style={{ textAlign: 'right', paddingRight: '1.5rem', color: 'var(--text-primary)' }}>{fmt(w.score)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

const MemberCard: React.FC<{ s: MemberSeries; w: MemberWeek; place: number; weekIndex: number; onOpen: () => void }> = ({ s, w, place, weekIndex, onOpen }) => (
    <button onClick={onOpen} className="card w-full text-left p-3.5 sm:p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
        <div className="flex items-center gap-3">
            <span className="w-6 font-display font-bold text-[1.1rem] tabular" style={{ color: place <= 3 ? 'var(--gold)' : 'var(--text-muted)' }}>{pad2(place)}</span>
            <Avatar name={s.name} role={s.role} photoUrl={w.member.photoUrl} size="md" />
            <div className="flex-1 min-w-0">
                <div className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{w.member.name}</div>
                <div className="text-[0.75rem] italic" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[s.role]}</div>
            </div>
            <div className="text-right">
                <div className="font-display font-bold text-[1.5rem] leading-none tabular" style={{ color: 'var(--text-primary)' }}>{fmt(w.score)}</div>
                <div className="mt-1 flex justify-end"><Movement delta={movement(s.weeks, weekIndex)} /></div>
            </div>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-x-2 gap-y-2.5 mt-3.5 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            {METRICS.map(m => (
                <div key={m} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-1 text-[0.72rem]">
                        <span style={{ color: 'var(--text-muted)' }}>{m}</span>
                        <span className="font-bold tabular" style={{ color: perfColor(w.pct[m]) }}>{Math.round(w.pct[m])}%</span>
                    </div>
                    <div className="mt-1"><ProgressBar pct={w.pct[m]} height={3} /></div>
                </div>
            ))}
        </div>
    </button>
);
