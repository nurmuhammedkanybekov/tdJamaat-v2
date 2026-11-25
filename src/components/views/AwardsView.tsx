import React, { useMemo, useState } from 'react';
import type { DataFile } from '../../types';
import type { Insights } from '../../utils/insights';
import { weekComplete } from '../../utils/insights';
import type { Award, Tier } from '../../utils/badges';
import { BADGES, TIER_LABEL } from '../../utils/badges';
import { BadgeMedal } from '../BadgeMedal';
import { SectionHeader } from '../ui';
import { HornBand, StarField } from '../motion';
import { useIsPhone } from '../../hooks/useMediaQuery';
import { t } from '../../i18n';
import { JattooAwards } from '../Jattoo';

interface AwardsViewProps {
    data: DataFile;
    weekIndex: number;
    awards: Award[];
    insights: Insights;
    onOpenProfile: (memberId: string) => void;
}

const TIER_POINTS: Record<Tier, number> = { seal: 4, gold: 3, silver: 2, bronze: 1 };
const METAL: Record<Tier, string> = { gold: 'var(--metal-gold)', silver: 'var(--metal-silver)', bronze: 'var(--metal-bronze)', seal: 'var(--metal-gold)' };

type Leader = { id: string; name: string; houseName: string; points: number; tiers: Record<Tier, number>; scope: 'person' | 'house' };

/** The season's medals as a table: one column per metal, struck coins in the
 *  head, the leader in gold. A person's row opens their profile. */
const MedalTable: React.FC<{ rows: Leader[]; onOpen?: (id: string) => void }> = ({ rows, onOpen }) => (
    <div className="medal-table" role="table">
        <div className="medal-row medal-head" role="row">
            <span /><span className="eyebrow" role="columnheader">{t('Аты')}</span>
            {(['seal', 'gold', 'silver', 'bronze'] as const).map(it => (
                <span key={it} className="text-center" role="columnheader" title={TIER_LABEL[it]}>
                    <span className="medal-coin" style={{ borderColor: METAL[it], backgroundColor: it === 'seal' ? METAL[it] : undefined }} />
                    <span className="sr-only">{TIER_LABEL[it]}</span>
                </span>
            ))}
        </div>
        {rows.map((l, i) => {
            const cells = <>
                <span className="medal-place font-display tabular" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-muted)' }}>{i + 1}</span>
                <span className="min-w-0 text-left">
                    <span className="block font-display text-[1.25rem] sm:text-[1.35rem] leading-tight truncate" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-primary)' }}>{l.name}</span>
                    {l.scope === 'person' && <span className="block text-[0.75rem] italic truncate" style={{ color: 'var(--text-muted)' }}>{l.houseName}</span>}
                </span>
                {(['seal', 'gold', 'silver', 'bronze'] as const).map(it => (
                    <span key={it} className="medal-count font-display tabular" style={{ color: l.tiers[it] ? 'var(--text-primary)' : 'var(--border-strong)' }}>{l.tiers[it] || '·'}</span>
                ))}
            </>;
            return onOpen
                ? <button key={l.id} role="row" className="medal-row row-link w-full" onClick={() => onOpen(l.id)}>{cells}</button>
                : <div key={l.id} role="row" className="medal-row">{cells}</div>;
        })}
    </div>
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

    // The highest honours of the week go on the plaque (up to two).
    const featured = groups.filter(g => g.def.tier === 'gold' || g.def.tier === 'seal').slice(0, 2);
    const rest = groups.filter(g => !featured.includes(g));

    const leaders = useMemo(() => {
        const map = new Map<string, Leader>();
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
            {/* This week's citations: the highest honours set on one plaque,
                the rest as a roll beneath. */}
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
                {featured.length > 0 && (
                    <div className="stage mt-2">
                        <StarField count={30} />
                        <HornBand className="stage-band" />
                        <div className="stage-inner">
                        <div className={`grid grid-cols-1 ${featured.length > 1 ? 'md:grid-cols-2' : ''}`}>
                            {featured.map(({ def, list }, k) => (
                                <article key={def.id} className="honour" style={k ? { '--sep': 1 } as React.CSSProperties : undefined}>
                                    <span className="pop-in inline-block"><BadgeMedal icon={def.icon} tier={def.tier} size={isPhone ? 128 : 168} label={def.name} /></span>
                                    <span className="eyebrow block mt-5" style={{ color: 'var(--gold)' }}>{TIER_LABEL[def.tier]} · {def.name}</span>
                                    <div className="mt-2 leading-tight">
                                        {list.map((a, i) => (
                                            <React.Fragment key={a.holderId}>
                                                {i > 0 && <span style={{ color: 'var(--gold-dim)' }}>, </span>}
                                                {def.scope === 'person'
                                                    ? <button onClick={() => onOpenProfile(a.holderId)} title={a.reason} className="honour-name font-display transition-colors hover:text-[var(--gold)]">{a.holderName}</button>
                                                    : <span className="honour-name font-display">{a.holderName}</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <p className="text-[0.9rem] italic mt-2 leading-snug max-w-[26rem] mx-auto" style={{ color: 'var(--text-secondary)' }}>
                                        {list.length === 1 ? `${def.scope === 'person' ? `${list[0].houseName} · ` : ''}${list[0].reason}` : def.rule}
                                    </p>
                                </article>
                            ))}
                        </div>
                        </div>
                        <HornBand className="stage-band" />
                    </div>
                )}
                {rest.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-16 mt-6">
                        {rest.map(({ def, list }) => (
                            <article key={def.id} className="flex gap-5 items-center py-5" style={{ borderBottom: '1px solid var(--border)' }}>
                                <span className="flex-shrink-0 pop-in"><BadgeMedal icon={def.icon} tier={def.tier} size={80} label={def.name} /></span>
                                <div className="min-w-0 flex-1">
                                    <span className="eyebrow block">{TIER_LABEL[def.tier]} · {def.name}</span>
                                    <div className="mt-1 leading-snug">
                                        {list.map((a, i) => (
                                            <React.Fragment key={a.holderId}>
                                                {i > 0 && <span style={{ color: 'var(--gold-dim)' }}>, </span>}
                                                {def.scope === 'person'
                                                    ? <button onClick={() => onOpenProfile(a.holderId)} title={a.reason} className="font-display text-[1.35rem] transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-primary)' }}>{a.holderName}</button>
                                                    : <span className="font-display text-[1.35rem]" style={{ color: 'var(--text-primary)' }}>{a.holderName}</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <span className="block text-[0.85rem] italic mt-1 leading-snug" style={{ color: 'var(--text-secondary)' }}>{list.length === 1 ? `${def.scope === 'person' ? `${list[0].houseName} · ` : ''}${list[0].reason}` : def.rule}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {/* The season's medal table: people, and the houses beside them. */}
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
                <section>
                    <SectionHeader eyebrow={t('Сезон')} title={t('Эң көп сыйлык алгандар')} />
                    {personLeaders.length === 0 ? <p className="italic" style={{ color: 'var(--text-muted)' }}>{t('Азырынча жок.')}</p> : (
                        <MedalTable rows={personLeaders} onOpen={onOpenProfile} />
                    )}
                </section>
                <section>
                    <SectionHeader eyebrow={t('Сезон')} title={t('Үйлөрдүн сыйлыктары')} />
                    {houseLeaders.length === 0 ? <p className="italic" style={{ color: 'var(--text-muted)' }}>{t('Азырынча жок.')}</p> : (
                        <MedalTable rows={houseLeaders} />
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
                <div className="cabinet">
                    <div className="flex items-baseline justify-between gap-4 mb-7">
                        <span className="eyebrow">{t('Ачылганы')}</span>
                        <span className="font-display text-[1.5rem] tabular" style={{ color: 'var(--gold)' }}>{defs.filter(d => upToNow.some(a => a.def.id === d.id)).length}<span className="text-[0.95rem]" style={{ color: 'var(--text-muted)' }}> / {defs.length}</span></span>
                    </div>
                    <span className="block h-[2px] -mt-5 mb-9" style={{ backgroundColor: 'var(--border)' }}><span className="block h-full animate-grow-x" style={{ width: `${(defs.filter(d => upToNow.some(a => a.def.id === d.id)).length / Math.max(1, defs.length)) * 100}%`, backgroundColor: 'var(--gold)' }} /></span>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
                    {defs.map(d => {
                        const got = upToNow.filter(a => a.def.id === d.id);
                        const open = openDef === d.id;
                        return (
                            <button key={d.id} onClick={() => setOpenDef(open ? null : d.id)} aria-expanded={open} className="group flex flex-col items-center text-center">
                                <span className="transition-transform duration-500 group-hover:scale-[1.04]">
                                    <BadgeMedal icon={d.icon} tier={d.tier} size={isPhone ? 84 : 112} label={d.name} locked={got.length === 0} count={got.length || undefined} />
                                </span>
                                <span className="font-display text-[1.05rem] sm:text-[1.15rem] mt-2 leading-tight" style={{ color: got.length ? 'var(--text-primary)' : 'var(--text-muted)' }}>{d.name}</span>
                                <span className="eyebrow mt-1">{TIER_LABEL[d.tier]}</span>
                            </button>
                        );
                    })}
                </div>
                </div>
                {openDef && (() => {
                    const d = BADGES[openDef];
                    const got = upToNow.filter(a => a.def.id === openDef);
                    const holders = [...new Map(got.map(a => [a.holderId, a])).values()];
                    return (
                        <div className="mt-12 pt-8 animate-fade-up" style={{ borderTop: '1px solid var(--border)' }}>
                            <div className="eyebrow mb-1">{d.name} · {got.length ? t('{0} жолу берилди', got.length) : t('азырынча эч ким алган жок')}</div>
                            <p className="text-[0.88rem] italic mb-4" style={{ color: 'var(--text-muted)' }}>{d.rule}</p>
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
            <JattooAwards data={data} onOpenProfile={onOpenProfile} />
        </div>
    );
};
