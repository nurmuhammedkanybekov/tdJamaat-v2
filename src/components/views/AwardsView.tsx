import React, { useMemo, useState } from 'react';
import { Home, Sparkles, Trophy } from 'lucide-react';
import type { DataFile } from '../../types';
import type { Insights } from '../../utils/insights';
import type { Award, Tier } from '../../utils/badges';
import { BADGES, TIER_LABEL } from '../../utils/badges';
import { TEAM_COLORS } from '../../utils/scoring';
import { Avatar } from '../Avatar';
import { BadgeMedal } from '../BadgeMedal';
import { SectionHeader } from '../ui';

interface AwardsViewProps {
    data: DataFile;
    weekIndex: number;
    awards: Award[];
    insights: Insights;
    onOpenProfile: (memberId: string) => void;
}

const TIER_POINTS: Record<Tier, number> = { seal: 4, gold: 3, silver: 2, bronze: 1 };

export const AwardsView: React.FC<AwardsViewProps> = ({ data, weekIndex, awards, insights, onOpenProfile }) => {
    const [scope, setScope] = useState<'person' | 'house'>('person');
    const [openDef, setOpenDef] = useState<string | null>(null);
    const week = data.weeks[weekIndex];
    const thisWeek = awards.filter(a => a.weekIndex === weekIndex).sort((a, b) => TIER_POINTS[b.def.tier] - TIER_POINTS[a.def.tier] || (a.def.scope === b.def.scope ? 0 : a.def.scope === 'house' ? -1 : 1));
    const upToNow = awards.filter(a => a.weekIndex <= weekIndex);

    const leaders = useMemo(() => {
        const map = new Map<string, { id: string; name: string; houseName: string; points: number; count: number; tiers: Record<Tier, number>; scope: 'person' | 'house' }>();
        upToNow.forEach(a => {
            const e = map.get(a.holderId) ?? { id: a.holderId, name: a.holderName, houseName: a.houseName, points: 0, count: 0, tiers: { seal: 0, gold: 0, silver: 0, bronze: 0 }, scope: a.def.scope };
            e.points += TIER_POINTS[a.def.tier]; e.count++; e.tiers[a.def.tier]++;
            map.set(a.holderId, e);
        });
        return [...map.values()].sort((a, b) => b.points - a.points || b.count - a.count);
    }, [upToNow]);

    const personLeaders = leaders.filter(l => l.scope === 'person').slice(0, 6);
    const houseLeaders = leaders.filter(l => l.scope === 'house');
    const defs = Object.values(BADGES).filter(d => d.scope === scope);

    const holderVisual = (a: { holderId: string; holderName: string }, scopeOf: 'person' | 'house', size: 'sm' | 'md' = 'sm') => {
        if (scopeOf === 'person') {
            const s = insights.members.get(a.holderId);
            return <Avatar name={a.holderName} role={s?.role ?? 'member'} photoUrl={s?.photoUrl} size={size} />;
        }
        const h = insights.houses.get(a.holderId);
        return (
            <span className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: size === 'sm' ? '2.25rem' : '2.75rem', height: size === 'sm' ? '2.25rem' : '2.75rem', backgroundColor: TEAM_COLORS[(h?.colorIndex ?? 0) % TEAM_COLORS.length], color: '#fff' }}>
                <Home className="w-4 h-4" />
            </span>
        );
    };

    return (
        <div className="space-y-8 sm:space-y-10">
            {/* This week */}
            <section>
                <SectionHeader eyebrow={`${week.weekNumber}-апта`} title="Аптанын сыйлыктары" sub={thisWeek.length ? `${thisWeek.length} сыйлык берилди.` : 'Бул аптанын маалыматы толгондо сыйлыктар ушул жерде чыгат.'} />
                {thisWeek.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 stagger">
                        {thisWeek.map((a, i) => (
                            <button
                                key={i}
                                onClick={() => a.def.scope === 'person' && onOpenProfile(a.holderId)}
                                className={`card p-4 flex gap-4 text-left ${a.def.scope === 'person' ? 'transition-shadow hover:shadow-[var(--shadow-lift)]' : 'cursor-default'}`}
                            >
                                <BadgeMedal icon={a.def.icon} tier={a.def.tier} size={68} />
                                <div className="min-w-0 flex-1">
                                    <div className="eyebrow" style={{ color: 'var(--gold)' }}>{TIER_LABEL[a.def.tier]}</div>
                                    <div className="font-display font-bold text-[1.3rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{a.def.name}</div>
                                    <div className="flex items-center gap-2 mt-2">
                                        {holderVisual(a, a.def.scope)}
                                        <div className="min-w-0">
                                            <div className="font-bold text-[0.9rem] truncate" style={{ color: 'var(--text-primary)' }}>{a.holderName}</div>
                                            {a.def.scope === 'person' && <div className="text-[0.72rem] truncate" style={{ color: 'var(--text-muted)' }}>{a.houseName}</div>}
                                        </div>
                                    </div>
                                    <p className="text-[0.8rem] mt-2 leading-snug" style={{ color: 'var(--text-secondary)' }}>{a.reason}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            {/* Leaders */}
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <section className="card card-pad">
                    <SectionHeader eyebrow="Сезон" title="Эң көп сыйлык алгандар" sub="Алтын = 3, күмүш = 2, коло = 1 упай." />
                    {personLeaders.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Азырынча жок.</p> : (
                        <ol className="stagger">
                            {personLeaders.map((l, i) => (
                                <li key={l.id}>
                                    <button onClick={() => onOpenProfile(l.id)} className="row-link w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-[8px] text-left" style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                                        <span className="w-6 font-display font-bold text-[1.1rem]" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-muted)' }}>{i + 1}</span>
                                        {holderVisual({ holderId: l.id, holderName: l.name }, 'person')}
                                        <span className="flex-1 min-w-0">
                                            <span className="block font-bold truncate" style={{ color: 'var(--text-primary)' }}>{l.name}</span>
                                            <span className="block text-[0.74rem]" style={{ color: 'var(--text-muted)' }}>{l.houseName}</span>
                                        </span>
                                        <span className="flex items-center gap-2 text-[0.78rem] font-bold tabular">
                                            {(['gold', 'silver', 'bronze'] as const).map(t => l.tiers[t] > 0 && (
                                                <span key={t} className="inline-flex items-center gap-1" title={TIER_LABEL[t]}>
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: `linear-gradient(135deg, var(--tier-${t}-1), var(--tier-${t}-2))` }} />
                                                    <span style={{ color: 'var(--text-secondary)' }}>{l.tiers[t]}</span>
                                                </span>
                                            ))}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                <section className="card card-pad">
                    <SectionHeader eyebrow="Сезон" title="Үйлөрдүн сыйлыктары" />
                    {houseLeaders.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Азырынча жок.</p> : (
                        <ol>
                            {houseLeaders.map((l, i) => (
                                <li key={l.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                                    {holderVisual({ holderId: l.id, holderName: l.name }, 'house')}
                                    <span className="flex-1 min-w-0 font-bold truncate" style={{ color: 'var(--text-primary)' }}>{l.name}</span>
                                    <span className="inline-flex items-center gap-1.5 font-bold text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}><Trophy className="w-4 h-4" style={{ color: 'var(--gold)' }} />{l.count}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>

            {/* Gallery */}
            <section>
                <SectionHeader
                    eyebrow="Бардык сыйлыктар"
                    title="Сыйлыктар жана алардын шарттары"
                    sub="Ар бир сыйлык чыныгы апталык жыйынтыктан автоматтык түрдө берилет. Басып, кимдер алганын көрүңүз."
                    action={
                        <div className="inline-flex p-1 rounded-full" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <button className={`chip ${scope === 'person' ? 'is-active' : ''}`} style={{ border: 'none' }} onClick={() => setScope('person')}>Адамдар</button>
                            <button className={`chip ${scope === 'house' ? 'is-active' : ''}`} style={{ border: 'none' }} onClick={() => setScope('house')}>Үйлөр</button>
                        </div>
                    }
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 stagger">
                    {defs.map(d => {
                        const got = upToNow.filter(a => a.def.id === d.id);
                        const holders = [...new Map(got.map(a => [a.holderId, a])).values()];
                        const open = openDef === d.id;
                        return (
                            <button
                                key={d.id}
                                onClick={() => setOpenDef(open ? null : d.id)}
                                aria-expanded={open}
                                className={`card p-4 flex flex-col items-center text-center transition-shadow hover:shadow-[var(--shadow-lift)] ${open ? 'col-span-2 sm:col-span-3 lg:col-span-2' : ''}`}
                            >
                                <BadgeMedal icon={d.icon} tier={d.tier} size={76} locked={got.length === 0} />
                                <div className="font-display font-bold text-[1.2rem] leading-tight mt-2" style={{ color: 'var(--text-primary)' }}>{d.name}</div>
                                <div className="text-[0.7rem] font-bold mt-0.5" style={{ color: got.length ? 'var(--gold)' : 'var(--text-muted)' }}>
                                    {TIER_LABEL[d.tier]} · {got.length ? `${got.length} жолу` : 'азырынча эч ким'}
                                </div>
                                <p className="text-[0.78rem] mt-2 leading-snug" style={{ color: 'var(--text-secondary)' }}>{d.rule}</p>
                                {open && holders.length > 0 && (
                                    <ul className="mt-3 w-full text-left space-y-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                                        {holders.map(h => {
                                            const times = got.filter(a => a.holderId === h.holderId);
                                            return (
                                                <li key={h.holderId} className="flex items-start gap-2.5">
                                                    {holderVisual(h, d.scope)}
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-[0.85rem]" style={{ color: 'var(--text-primary)' }}>{h.holderName}{times.length > 1 && <span style={{ color: 'var(--gold)' }}> ×{times.length}</span>}</div>
                                                        <div className="text-[0.74rem]" style={{ color: 'var(--text-muted)' }}>{times[times.length - 1].reason}</div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                                {open && holders.length === 0 && (
                                    <p className="mt-3 text-[0.78rem] inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}><Sparkles className="w-3.5 h-3.5" /> Биринчи болуп алыңыз!</p>
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};
