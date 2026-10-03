import React, { useMemo, useState } from 'react';
import type { DataFile } from '../../types';
import type { Insights } from '../../utils/insights';
import type { Award, Tier } from '../../utils/badges';
import { BADGES, TIER_LABEL } from '../../utils/badges';
import { BadgeMedal } from '../BadgeMedal';
import { Medallion } from '../Ornament';
import { SectionHeader } from '../ui';

interface AwardsViewProps {
    data: DataFile;
    weekIndex: number;
    awards: Award[];
    insights: Insights;
    onOpenProfile: (memberId: string) => void;
}

const TIER_POINTS: Record<Tier, number> = { seal: 4, gold: 3, silver: 2, bronze: 1 };
const METAL: Record<Tier, string> = { gold: 'var(--metal-gold)', silver: 'var(--metal-silver)', bronze: 'var(--metal-bronze)', seal: 'var(--metal-gold)' };

// Small struck-coin dots for medal counts in the leader lists.
const Coins: React.FC<{ tiers: Record<Tier, number> }> = ({ tiers }) => (
    <span className="flex items-center gap-3 text-[0.85rem] tabular" style={{ color: 'var(--text-secondary)' }}>
        {(['seal', 'gold', 'silver', 'bronze'] as const).map(t => tiers[t] > 0 && (
            <span key={t} className="inline-flex items-center gap-1.5" title={TIER_LABEL[t]}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ border: `1px solid ${METAL[t]}`, backgroundColor: t === 'seal' ? METAL[t] : 'transparent' }} />
                {tiers[t]}
            </span>
        ))}
    </span>
);

export const AwardsView: React.FC<AwardsViewProps> = ({ data, weekIndex, awards, onOpenProfile }) => {
    const [scope, setScope] = useState<'person' | 'house'>('person');
    const [openDef, setOpenDef] = useState<string | null>(null);
    const week = data.weeks[weekIndex];
    const thisWeek = awards
        .filter(a => a.weekIndex === weekIndex)
        .sort((a, b) => TIER_POINTS[b.def.tier] - TIER_POINTS[a.def.tier] || (a.def.scope === b.def.scope ? 0 : a.def.scope === 'house' ? -1 : 1));
    const upToNow = awards.filter(a => a.weekIndex <= weekIndex);

    const leaders = useMemo(() => {
        const map = new Map<string, { id: string; name: string; houseName: string; points: number; tiers: Record<Tier, number>; scope: 'person' | 'house' }>();
        upToNow.forEach(a => {
            const e = map.get(a.holderId) ?? { id: a.holderId, name: a.holderName, houseName: a.houseName, points: 0, tiers: { seal: 0, gold: 0, silver: 0, bronze: 0 }, scope: a.def.scope };
            e.points += TIER_POINTS[a.def.tier]; e.tiers[a.def.tier]++;
            map.set(a.holderId, e);
        });
        return [...map.values()].sort((a, b) => b.points - a.points);
    }, [upToNow]);
    const personLeaders = leaders.filter(l => l.scope === 'person').slice(0, 7);
    const houseLeaders = leaders.filter(l => l.scope === 'house');
    const defs = Object.values(BADGES).filter(d => d.scope === scope);

    return (
        <div className="space-y-20">
            {/* This week's citations */}
            <section>
                <SectionHeader eyebrow={`${week.weekNumber}-апта`} title="Аптанын сыйлыктары" sub={thisWeek.length ? undefined : 'Бул аптанын маалыматы толгондо сыйлыктар ушул жерде чыгат.'} />
                {thisWeek.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-16">
                        {thisWeek.map((a, i) => {
                            const clickable = a.def.scope === 'person';
                            return (
                                <button
                                    key={i}
                                    onClick={() => clickable && onOpenProfile(a.holderId)}
                                    className={`group flex items-center gap-5 py-5 text-left ${clickable ? '' : 'cursor-default'}`}
                                    style={{ borderBottom: '1px solid var(--border)' }}
                                >
                                    <BadgeMedal icon={a.def.icon} tier={a.def.tier} size={92} label={a.def.name} />
                                    <span className="min-w-0">
                                        <span className="eyebrow block">{TIER_LABEL[a.def.tier]} · {a.def.name}</span>
                                        <span className={`block font-display text-[1.55rem] leading-tight mt-1 ${clickable ? 'transition-colors group-hover:text-[var(--gold)]' : ''}`} style={{ color: 'var(--text-primary)' }}>{a.holderName}</span>
                                        {a.def.scope === 'person' && <span className="block text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{a.houseName}</span>}
                                        <span className="block text-[0.88rem] italic mt-1.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>{a.reason}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            <div className="flex justify-center" aria-hidden="true">
                <Medallion size={150} className="draw-in" style={{ color: 'var(--gold-dim)' }} />
            </div>

            {/* Season leaders */}
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-20">
                <section>
                    <SectionHeader eyebrow="Сезон" title="Эң көп сыйлык алгандар" />
                    {personLeaders.length === 0 ? <p className="italic" style={{ color: 'var(--text-muted)' }}>Азырынча жок.</p> : (
                        <ol>
                            {personLeaders.map((l, i) => (
                                <li key={l.id}>
                                    <button onClick={() => onOpenProfile(l.id)} className="row-link w-full flex items-baseline gap-3 py-3 px-2 -mx-2 text-left">
                                        <span className="w-5 text-[0.75rem] tabular" style={{ color: 'var(--gold-dim)' }}>{String(i + 1).padStart(2, '0')}</span>
                                        <span className="font-display text-[1.3rem]" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-primary)' }}>{l.name}</span>
                                        <span className="text-[0.78rem] italic hidden sm:inline" style={{ color: 'var(--text-muted)' }}>{l.houseName}</span>
                                        <span className="leader" />
                                        <Coins tiers={l.tiers} />
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
                <section>
                    <SectionHeader eyebrow="Сезон" title="Үйлөрдүн сыйлыктары" />
                    {houseLeaders.length === 0 ? <p className="italic" style={{ color: 'var(--text-muted)' }}>Азырынча жок.</p> : (
                        <ol>
                            {houseLeaders.map((l, i) => (
                                <li key={l.id} className="flex items-baseline gap-3 py-3">
                                    <span className="w-5 text-[0.75rem] tabular" style={{ color: 'var(--gold-dim)' }}>{String(i + 1).padStart(2, '0')}</span>
                                    <span className="font-display text-[1.3rem]" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-primary)' }}>{l.name}</span>
                                    <span className="leader" />
                                    <Coins tiers={l.tiers} />
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>

            {/* The collection */}
            <section>
                <SectionHeader
                    eyebrow="Бардык сыйлыктар"
                    title="Коллекция"
                    sub="Ар бир сыйлык апталык жыйынтыктан өзү берилет. Медалды басып, шартын жана кимдер алганын көрүңүз."
                    action={
                        <div className="flex">
                            <button className={`chip ${scope === 'person' ? 'is-active' : ''}`} onClick={() => { setScope('person'); setOpenDef(null); }}>Адамдар</button>
                            <button className={`chip ${scope === 'house' ? 'is-active' : ''}`} onClick={() => { setScope('house'); setOpenDef(null); }}>Үйлөр</button>
                        </div>
                    }
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-12 mt-10">
                    {defs.map(d => {
                        const got = upToNow.filter(a => a.def.id === d.id);
                        const open = openDef === d.id;
                        return (
                            <button key={d.id} onClick={() => setOpenDef(open ? null : d.id)} aria-expanded={open} className="group flex flex-col items-center text-center">
                                <span className="transition-transform duration-500 group-hover:scale-[1.04]">
                                    <BadgeMedal icon={d.icon} tier={d.tier} size={128} label={d.name} locked={got.length === 0} count={got.length || undefined} />
                                </span>
                                <span className="font-display text-[1.2rem] mt-3 leading-tight" style={{ color: got.length ? 'var(--text-primary)' : 'var(--text-muted)' }}>{d.name}</span>
                                <span className="eyebrow mt-1">{TIER_LABEL[d.tier]}</span>
                                <span className="text-[0.8rem] italic mt-2 leading-snug max-w-[24ch]" style={{ color: 'var(--text-muted)' }}>{d.rule}</span>
                            </button>
                        );
                    })}
                </div>
                {openDef && (() => {
                    const d = BADGES[openDef];
                    const got = upToNow.filter(a => a.def.id === openDef);
                    const holders = [...new Map(got.map(a => [a.holderId, a])).values()];
                    return (
                        <div className="mt-12 pt-8 animate-fade-up" style={{ borderTop: '1px solid var(--border)' }}>
                            <div className="eyebrow mb-4">{d.name} · {got.length ? `${got.length} жолу берилди` : 'азырынча эч ким алган жок'}</div>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-16">
                                {holders.map(h => {
                                    const times = got.filter(a => a.holderId === h.holderId);
                                    return (
                                        <li key={h.holderId} className="py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                                            <button disabled={d.scope !== 'person'} onClick={() => onOpenProfile(h.holderId)} className="text-left">
                                                <span className="font-display text-[1.2rem]" style={{ color: 'var(--text-primary)' }}>{h.holderName}</span>
                                                {times.length > 1 && <span className="ml-2 text-[0.85rem]" style={{ color: 'var(--gold)' }}>×{times.length}</span>}
                                                <span className="block text-[0.85rem] italic" style={{ color: 'var(--text-muted)' }}>{times[0].reason}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                })()}
            </section>
        </div>
    );
};
