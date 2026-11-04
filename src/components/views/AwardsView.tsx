import React, { useMemo, useState } from 'react';
import type { DataFile } from '../../types';
import type { Insights } from '../../utils/insights';
import { weekComplete } from '../../utils/insights';
import type { Award, Tier } from '../../utils/badges';
import { BADGES, TIER_LABEL } from '../../utils/badges';
import { BadgeMedal } from '../BadgeMedal';
import { SectionHeader } from '../ui';
import { useIsPhone } from '../../hooks/useMediaQuery';
import { t } from '../../i18n';

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
        {(['seal', 'gold', 'silver', 'bronze'] as const).map(it => tiers[it] > 0 && (
            <span key={it} className="inline-flex items-center gap-1.5" title={TIER_LABEL[it]}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ border: `1px solid ${METAL[it]}`, backgroundColor: it === 'seal' ? METAL[it] : 'transparent' }} />
                {tiers[it]}
            </span>
        ))}
    </span>
);

export const AwardsView: React.FC<AwardsViewProps> = ({ data, weekIndex, awards, onOpenProfile }) => {
    const isPhone = useIsPhone();
    const [scope, setScope] = useState<'person' | 'house'>('person');
    const [openDef, setOpenDef] = useState<string | null>(null);
    const week = data.weeks[weekIndex];
    const thisWeek = awards
        .filter(a => a.weekIndex === weekIndex)
        .sort((a, b) => TIER_POINTS[b.def.tier] - TIER_POINTS[a.def.tier] || (a.def.scope === b.def.scope ? 0 : a.def.scope === 'house' ? -1 : 1));
    const upToNow = awards.filter(a => a.weekIndex <= weekIndex);
    const groups = useMemo(() => {
        const map = new Map<string, { def: Award['def']; list: Award[] }>();
        thisWeek.forEach(a => { const g = map.get(a.def.id) ?? { def: a.def, list: [] }; g.list.push(a); map.set(a.def.id, g); });
        return [...map.values()];
    }, [thisWeek]);

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
        <div className="space-y-14 sm:space-y-16">
            {/* This week's citations */}
            <section>
                <SectionHeader
                    eyebrow={t('{0}-апта', week.weekNumber)}
                    title={t('Аптанын сыйлыктары')}
                    sub={!thisWeek.length
                        ? t('Бул аптанын маалыматы толгондо сыйлыктар ушул жерде чыгат.')
                        : !weekComplete(week)
                            ? t('Азырынча: {0} / {1} үй киргизди. Калгандары киргизгенде сыйлыктар өзгөрүшү мүмкүн.', week.teams.filter(it => it.submitted).length, week.teams.length)
                            : undefined}
                />
                {/* One card per award, with everyone who earned it this week. */}
                {groups.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {groups.map(({ def, list }) => (
                            <article key={def.id} className="card lift p-5 sm:p-6 flex gap-5 items-start">
                                <span className="flex-shrink-0 pop-in"><BadgeMedal icon={def.icon} tier={def.tier} size={84} label={def.name} /></span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <h3 className="font-display text-[1.45rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{def.name}</h3>
                                        <span className="text-[0.8rem]" style={{ color: METAL[def.tier] }}>{TIER_LABEL[def.tier]}</span>
                                    </div>
                                    <p className="text-[0.86rem] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>{list.length === 1 ? list[0].reason : def.rule}</p>
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {list.map(a => def.scope === 'person' ? (
                                            <button key={a.holderId} onClick={() => onOpenProfile(a.holderId)} className="chip" title={a.reason}>
                                                {a.holderName}<span style={{ color: 'var(--text-muted)' }}>· {a.houseName}</span>
                                            </button>
                                        ) : (
                                            <span key={a.holderId} className="chip">{a.holderName}</span>
                                        ))}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>


            {/* Season leaders */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 items-start">
                <section className="card p-5 sm:p-6">
                    <SectionHeader eyebrow={t('Сезон')} title={t('Эң көп сыйлык алгандар')} />
                    {personLeaders.length === 0 ? <p className="italic" style={{ color: 'var(--text-muted)' }}>{t('Азырынча жок.')}</p> : (
                        <ol>
                            {personLeaders.map((l, i) => (
                                <li key={l.id}>
                                    <button onClick={() => onOpenProfile(l.id)} className="row-link w-[calc(100%+1rem)] flex items-baseline gap-3 py-3 px-2 -mx-2 text-left">
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
                <section className="card p-5 sm:p-6">
                    <SectionHeader eyebrow={t('Сезон')} title={t('Үйлөрдүн сыйлыктары')} />
                    {houseLeaders.length === 0 ? <p className="italic" style={{ color: 'var(--text-muted)' }}>{t('Азырынча жок.')}</p> : (
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
                    eyebrow={t('Бардык сыйлыктар')}
                    title={t('Коллекция')}
                    action={
                        <div className="flex">
                            <button className={`chip ${scope === 'person' ? 'is-active' : ''}`} onClick={() => { setScope('person'); setOpenDef(null); }}>{t('Адамдар')}</button>
                            <button className={`chip ${scope === 'house' ? 'is-active' : ''}`} onClick={() => { setScope('house'); setOpenDef(null); }}>{t('Үйлөр')}</button>
                        </div>
                    }
                />
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8 mt-6">
                    {defs.map(d => {
                        const got = upToNow.filter(a => a.def.id === d.id);
                        const open = openDef === d.id;
                        return (
                            <button key={d.id} onClick={() => setOpenDef(open ? null : d.id)} aria-expanded={open} className="group flex flex-col items-center text-center">
                                <span className="transition-transform duration-500 group-hover:scale-[1.04]">
                                    <BadgeMedal icon={d.icon} tier={d.tier} size={isPhone ? 84 : 112} label={d.name} locked={got.length === 0} count={got.length || undefined} />
                                </span>
                                <span className="font-display text-[1.05rem] sm:text-[1.15rem] mt-2 leading-tight" style={{ color: got.length ? 'var(--text-primary)' : 'var(--text-muted)' }}>{d.name}</span>
                                <span className="text-[0.75rem] mt-0.5" style={{ color: METAL[d.tier] }}>{TIER_LABEL[d.tier]}</span>
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
                            <h3 className="font-display text-[1.4rem]" style={{ color: 'var(--text-primary)' }}>{d.name}</h3>
                            <p className="text-[0.9rem] mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>{d.rule} · {got.length ? t('{0} жолу берилди', got.length) : t('азырынча эч ким алган жок')}</p>
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
