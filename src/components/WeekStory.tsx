// "Апта жыйынтыгы": the week told as a short full-screen story — the house of
// the week, the race between houses, the top three, the biggest jump, and what
// everyone did together. For meetings and for sharing. Tap the right side (or
// →) for the next slide, the left side (or ←) for the previous one; it moves
// on by itself every few seconds (not with "reduce motion").
import React, { useEffect, useMemo, useState } from 'react';
import { Share2, X } from 'lucide-react';
import type { DataFile, MetricValues } from '../types';
import type { Insights, MemberSeries, MemberWeek } from '../utils/insights';
import { weekComplete, weekOf } from '../utils/insights';
import type { Award } from '../utils/badges';
import { BadgeMedal } from './BadgeMedal';
import { weekOverWeek } from '../utils/community';
import { metricName } from '../utils/metrics';
import { TEAM_COLORS } from '../utils/scoring';
import { useModal } from '../hooks/useModal';
import { reduced } from '../hooks/useReveal';
import { CountUp, StarField } from './motion';
import { Crown, Mark } from './Ornament';
import { t } from '../i18n';

const SLIDE_MS = 6500;
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const big = (n: number) => Math.round(n).toLocaleString('ru-RU');
const ROMAN = ['I', 'II', 'III'];
const METAL = ['var(--metal-gold)', 'var(--metal-silver)', 'var(--metal-bronze)'];
const TOGETHER: Array<keyof MetricValues> = ['К-К', 'СВТ', 'КТП', 'ИСТГ'];

const Kicker: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="eyebrow story-in" style={{ color: 'var(--gold)' }}>{children}</div>
);

export const WeekStory: React.FC<{
    data: DataFile;
    weekIndex: number;
    insights: Insights;
    awards: Award[];
    onShare: () => void;
    onClose: () => void;
}> = ({ data, weekIndex, insights, awards, onShare, onClose }) => {
    useModal(onClose);
    const week = data.weeks[weekIndex];

    const houses = useMemo(() => [...insights.houses.values()]
        .map(h => ({ h, w: weekOf(h.weeks, weekIndex) }))
        .filter(x => x.w?.submitted && x.w.rank !== null)
        .sort((a, b) => b.w!.avg - a.w!.avg), [insights, weekIndex]);
    const top = useMemo(() => [...insights.members.values()]
        .map(s => ({ s, w: weekOf(s.weeks, weekIndex) }))
        .filter((x): x is { s: MemberSeries; w: MemberWeek } => !!x.w && x.w.submitted && x.w.rank !== null && x.w.rank <= 3 && x.w.score > 0)
        .sort((a, b) => a.w.rank! - b.w.rank!).slice(0, 3), [insights, weekIndex]);
    const jump = useMemo(() => [...insights.members.values()]
        .map(s => { const now = weekOf(s.weeks, weekIndex), prev = weekOf(s.weeks, weekIndex - 1); return now?.submitted && prev?.submitted ? { s, delta: now.score - prev.score, from: prev.score, to: now.score, house: now.houseName } : null; })
        .filter((x): x is NonNullable<typeof x> => !!x && x.delta > 0)
        .sort((a, b) => b.delta - a.delta)[0], [insights, weekIndex]);
    const perfect = useMemo(() => awards.filter(a => a.weekIndex === weekIndex && a.def.id === 'perfect'), [awards, weekIndex]);
    const together = useMemo(() => weekOverWeek(data, insights, weekIndex), [data, insights, weekIndex]);
    const leader = houses[0], second = houses[1];
    const max = Math.max(1, ...houses.map(x => x.w!.avg));
    const entered = week.teams.filter(it => it.submitted).length;
    const houseAward = awards.find(a => a.weekIndex === weekIndex && a.def.id === 'house-week');

    const slides: Array<{ key: string; node: React.ReactNode }> = [
        {
            key: 'intro', node: (
                <div className="flex flex-col items-center text-center">
                    <Mark size={72} className="story-in" style={{ color: 'var(--gold)' }} />
                    <Crown className="draw-in w-[min(18rem,70%)] h-auto mt-6" style={{ color: 'var(--gold)' }} />
                    <div className="font-display text-[4.5rem] sm:text-[6rem] leading-none mt-6 story-in gold-sheen" style={{ animationDelay: '200ms' }}>{t('{0}-апта', week.weekNumber)}</div>
                    <div className="font-display text-[1.8rem] mt-3 story-in" style={{ color: 'var(--text-primary)', animationDelay: '400ms' }}>{t('Аптанын жыйынтыгы')}</div>
                    <div className="text-[0.95rem] mt-4 story-in" style={{ color: 'var(--text-muted)', animationDelay: '600ms' }}>
                        {weekComplete(week) ? t('Бардык {0} үй киргизди', week.teams.length) : t('{0} / {1} үй киргизди · азырынча', entered, week.teams.length)}
                    </div>
                </div>
            )
        },
        ...(leader ? [{
            key: 'house', node: (
                <div className="flex flex-col items-center text-center">
                    <Kicker>{weekComplete(week) ? t('Аптанын үйү') : t('Азырынча алдыда')}</Kicker>
                    {houseAward && <span className="mt-6 story-pop"><BadgeMedal icon={houseAward.def.icon} tier={houseAward.def.tier} size={120} label={houseAward.def.name} /></span>}
                    <div className="font-display text-[3.4rem] sm:text-[4.6rem] leading-none mt-6 story-in" style={{ color: 'var(--text-primary)', animationDelay: '250ms' }}>{leader.h.name}</div>
                    <CountUp value={leader.w!.avg} duration={1800} className="font-display text-[5rem] sm:text-[7rem] leading-none mt-2 tabular gold-sheen" />
                    {second && <div className="text-[1.05rem] mt-4 story-in" style={{ color: 'var(--gold-bright)', animationDelay: '900ms' }}>{t('{0} упай алдыда · {1}', fmt(leader.w!.avg - second.w!.avg), second.h.name)}</div>}
                </div>
            )
        }] : []),
        ...(houses.length > 1 ? [{
            key: 'race', node: (
                <div className="w-full max-w-[34rem]">
                    <div className="text-center"><Kicker>{t('Үйлөрдүн жарышы')}</Kicker></div>
                    <ol className="mt-8 space-y-5">
                        {houses.map(({ h, w }, i) => (
                            <li key={h.id} className="story-in" style={{ animationDelay: `${150 + i * 160}ms` }}>
                                <div className="flex items-baseline gap-3">
                                    <span className="font-display text-[1.1rem] w-6" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-muted)' }}>{i + 1}</span>
                                    <span className="font-display text-[1.6rem] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{h.name}</span>
                                    <CountUp value={w!.avg} duration={1400} className="font-display text-[1.6rem] tabular" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-primary)' }} />
                                </div>
                                <div className="ml-9 mt-2 h-[4px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                    <div className="h-full rounded-full story-bar" style={{ width: `${(w!.avg / max) * 100}%`, backgroundColor: TEAM_COLORS[h.colorIndex % TEAM_COLORS.length], animationDelay: `${300 + i * 160}ms` }} />
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            )
        }] : []),
        ...(top.length ? [{
            key: 'top', node: (
                <div className="w-full max-w-[34rem]">
                    <div className="text-center"><Kicker>{t('Аптанын үч мыктысы')}</Kicker></div>
                    <ol className="mt-8 space-y-6">
                        {top.map(({ s, w }, i) => (
                            <li key={s.id} className="flex items-center gap-5 story-in" style={{ animationDelay: `${200 + (2 - i) * 350}ms` }}>
                                <span className="w-14 h-14 rounded-full flex items-center justify-center font-display text-[1.5rem] flex-shrink-0" style={{ border: `1px solid ${METAL[(w.rank ?? 1) - 1]}`, color: METAL[(w.rank ?? 1) - 1] }}>{ROMAN[(w.rank ?? 1) - 1]}</span>
                                <span className="flex-1 min-w-0">
                                    <span className="block font-display text-[2rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{w.member.name}</span>
                                    <span className="block text-[0.9rem] italic" style={{ color: 'var(--text-muted)' }}>{w.houseName}</span>
                                </span>
                                <span className="font-display text-[2rem] tabular" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-primary)' }}>{fmt(w.score)}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )
        }] : []),
        ...(jump || perfect.length ? [{
            key: 'jump', node: (
                <div className="flex flex-col items-center text-center">
                    {jump && <>
                        <Kicker>{t('Эң чоң секирик')}</Kicker>
                        <div className="font-display text-[3rem] sm:text-[4rem] leading-none mt-6 story-in" style={{ color: 'var(--text-primary)', animationDelay: '200ms' }}>{jump.s.name}</div>
                        <div className="text-[0.95rem] italic mt-2 story-in" style={{ color: 'var(--text-muted)', animationDelay: '300ms' }}>{jump.house}</div>
                        <div className="font-display text-[4.5rem] leading-none mt-5 tabular story-pop" style={{ color: 'var(--success)', animationDelay: '500ms' }}>+{fmt(jump.delta)}</div>
                        <div className="text-[0.95rem] mt-2 tabular story-in" style={{ color: 'var(--text-secondary)', animationDelay: '700ms' }}>{fmt(jump.from)} → {fmt(jump.to)}</div>
                    </>}
                    {perfect.length > 0 && (
                        <div className={`${jump ? 'mt-12' : ''} story-in`} style={{ animationDelay: '1000ms' }}>
                            <Kicker>{t('Толук план')}</Kicker>
                            <div className="font-display text-[2.6rem] mt-3" style={{ color: 'var(--gold)' }}>{t('{0} адам', perfect.length)}</div>
                            <div className="text-[0.95rem] mt-2 max-w-[28rem]" style={{ color: 'var(--text-secondary)' }}>{perfect.map(a => a.holderName).join(', ')}</div>
                        </div>
                    )}
                </div>
            )
        }] : []),
        ...(together.houses > 0 ? [{
            key: 'together', node: (
                <div className="w-full max-w-[36rem] text-center">
                    <Kicker>{t('Жамаат бирге')}</Kicker>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-9 mt-9">
                        {TOGETHER.map((m, i) => (
                            <div key={m} className="story-in" style={{ animationDelay: `${200 + i * 180}ms` }}>
                                <CountUp value={together.thisWeek.metrics[m]} decimals={0} group duration={1800} className="font-display text-[2.6rem] sm:text-[3.2rem] leading-none tabular" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-primary)' }} />
                                <div className="text-[0.95rem] mt-2" style={{ color: 'var(--text-secondary)' }}>{metricName(m)}</div>
                            </div>
                        ))}
                    </div>
                    <div className="text-[0.85rem] mt-9 italic" style={{ color: 'var(--text-muted)' }}>{t('{0} адам · {1} үй', big(together.thisWeek.personWeeks), together.houses)}</div>
                </div>
            )
        }] : []),
        {
            key: 'end', node: (
                <div className="flex flex-col items-center text-center">
                    <Mark size={64} className="story-in" style={{ color: 'var(--gold)' }} />
                    <div className="font-display text-[2.4rem] mt-6 story-in" style={{ color: 'var(--text-primary)', animationDelay: '200ms' }}>{t('Келерки аптада жолугабыз')}</div>
                    <div className="flex gap-3 mt-8 story-in" style={{ animationDelay: '400ms' }}>
                        <button onClick={e => { e.stopPropagation(); onShare(); }} className="btn btn-primary"><Share2 className="w-4 h-4" />{t('Бөлүшүү')}</button>
                        <button onClick={e => { e.stopPropagation(); onClose(); }} className="btn btn-ghost">{t('Жабуу')}</button>
                    </div>
                </div>
            )
        }
    ];

    const [i, setI] = useState(0);
    const last = slides.length - 1;
    const go = (n: number) => setI(Math.max(0, Math.min(last, n)));
    const auto = !reduced();
    useEffect(() => {
        if (!auto || i >= last) return;
        const id = window.setTimeout(() => setI(x => Math.min(last, x + 1)), SLIDE_MS);
        return () => window.clearTimeout(id);
    }, [i, last, auto]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setI(x => Math.min(last, x + 1)); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); setI(x => Math.max(0, x - 1)); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [last]);

    return (
        <div role="dialog" aria-modal="true" aria-label={t('Аптанын жыйынтыгы')} className="dark story fixed inset-0 z-[80] select-none"
            onClick={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); go(e.clientX - r.left < r.width / 3 ? i - 1 : i + 1); }}>
            <StarField count={80} />
            <span className="hero-glow" aria-hidden="true" />
            {/* Progress: one segment per slide. */}
            <div className="absolute top-0 left-0 right-0 flex gap-1.5 px-4 pt-[max(0.9rem,env(safe-area-inset-top))]">
                {slides.map((s, n) => (
                    <span key={s.key} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                        <span key={`${s.key}-${i}`} className={`block h-full ${n === i && auto ? 'story-progress' : ''}`} style={{ backgroundColor: 'var(--gold)', width: n < i || (n === i && !auto) ? '100%' : n === i ? undefined : '0%', animationDuration: `${SLIDE_MS}ms` }} />
                    </span>
                ))}
            </div>
            <button onClick={e => { e.stopPropagation(); onClose(); }} aria-label={t('Жабуу')} className="absolute right-3 top-[max(1.6rem,calc(env(safe-area-inset-top)+0.9rem))] w-11 h-11 inline-flex items-center justify-center z-10" style={{ color: 'var(--text-secondary)' }}>
                <X className="w-5 h-5" />
            </button>
            <div key={slides[i].key} className="absolute inset-0 flex items-center justify-center px-6 pt-16 pb-10 overflow-y-auto">
                {slides[i].node}
            </div>
            <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 text-center text-[0.75rem] tabular" style={{ color: 'var(--text-muted)' }}>
                {i + 1} / {slides.length}
            </div>
        </div>
    );
};
