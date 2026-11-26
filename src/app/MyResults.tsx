// #/house/me — "Менин жыйынтыгым": a member's own results, after signing in.
// The week (any week of the season, not only the latest), the number against
// the plan, every metric with how far it went, the season's path, and the
// person's own awards with the next ones in reach. Computed from the member's
// own house only (the database gives them nothing else).
import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, ChevronDown, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import type { Theme } from '../theme';
import { Medallion } from '../components/Ornament';
import { t } from '../i18n';
import type { Self } from './self';
import { AppFrame, Section, Waiting } from './AppFrame';
import { useMemberData } from './memberData';
import { SELF_CONTAINED, houseOnly, myAwards, nextGoals, STRONG_METRICS } from './myResults';
import { JattooProfile } from '../components/Jattoo';
import { Avatar } from '../components/Avatar';
import { BadgeMedal } from '../components/BadgeMedal';
import { PlanRows } from '../components/PlanRows';
import { BADGES, computeAwards, metricsAtPlan, strongWeek } from '../utils/badges';
import type { MemberSeries, MemberWeek } from '../utils/insights';
import { PLAN_SCORE, ROLE_LABEL, buildInsights, longestStreak, roleAt, seasonSummary } from '../utils/insights';
import { defaultSeasonId, seasonView } from '../utils/seasons';
import { formatWeekRange } from '../utils/weekDates';
import { roman } from '../utils/roman';
import { go } from './route';

const ShareSheet = lazy(() => import('../components/ShareSheet').then(m => ({ default: m.ShareSheet })));

const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${fmt(Math.abs(n))}`;

export const MyResults: React.FC<{ link: Self; theme: Theme; onToggleTheme: () => void }> = ({ link, theme, onToggleTheme }) => {
    const { data, failed } = useMemberData();
    const view = useMemo(() => {
        if (!data) return null;
        const sid = defaultSeasonId(data);
        const season = data.seasons.find(s => s.id === sid);
        const d = houseOnly(sid !== null ? seasonView(data, sid) : data, link.houseId);
        const ins = buildInsights(d);
        const series = ins.members.get(link.memberId) ?? null;
        const awards = computeAwards(d, ins, { seasonClosed: !!season && season.lastWeek !== null, seasonName: season?.name });
        return { d, ins, series, awards, seasonName: season?.name ?? '' };
    }, [data, link.houseId, link.memberId]);
    const [picked, setPicked] = useState<number | null>(null);
    const [share, setShare] = useState<'week' | 'season' | null>(null);
    // #/house/me?jattoo opens at Жаттоо.
    const ready = !!view;
    useEffect(() => { if (ready && window.location.hash.includes('jattoo')) window.setTimeout(() => document.getElementById('jattoo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300); }, [ready]);

    const frame = (body: React.ReactNode) => (
        <AppFrame page="house" title={t('Менин жыйынтыгым')} kicker={link.houseName} back="#/house" theme={theme} onToggleTheme={onToggleTheme}>{body}</AppFrame>
    );
    if (failed) return frame(<p className="text-center py-10" style={{ color: 'var(--text-muted)' }}>{t('Жыйынтыктар жүктөлгөн жок.')}</p>);
    if (!view) return frame(<Waiting />);
    const { series } = view;
    if (!series || series.weeks.length === 0) return frame(<p className="text-center py-10 max-w-[30rem] mx-auto" style={{ color: 'var(--text-muted)' }}>{t('Азырынча сиздин жыйынтыгыңыз жок. Капитан аптанын маалыматын киргизгенде бул жерде көрүнөт.')}</p>);

    const weeks = series.weeks;
    const pos = picked === null ? weeks.length - 1 : Math.max(0, Math.min(weeks.length - 1, weeks.findIndex(w => w.weekIndex === picked)));
    const cur = weeks[pos];
    const pick = (w: MemberWeek) => setPicked(w.weekIndex);

    return frame(
        <div className="max-w-[46rem] mx-auto">
            <Hero series={series} cur={cur} pos={pos} weeks={weeks} data={view.d} ins={view.ins} onPick={i => pick(weeks[i])} />
            {/* A picture of my week or my season, ready for WhatsApp / Telegram. */}
            <nav className="almanac mine-share" aria-label={t('Бөлүшүү')}>
                <button disabled={!cur.submitted} onClick={() => setShare('week')}><Share2 className="w-[1.05rem] h-[1.05rem]" strokeWidth={1.4} /><span>{t('Аптамды бөлүшүү')}</span></button>
                <button onClick={() => setShare('season')}><Share2 className="w-[1.05rem] h-[1.05rem]" strokeWidth={1.4} /><span>{t('Сезонумду бөлүшүү')}</span></button>
            </nav>
            <AgainstPlan w={cur} />
            {weeks.length > 1 && <Path series={series} houseWeeks={view.ins.houses.get(link.houseId)?.weeks ?? []} cur={cur} onPick={pick} />}
            <SeasonNumbers series={series} ins={view.ins} total={view.d.weeks.length} name={view.seasonName} onPick={pick} />
            <Awards memberId={link.memberId} awards={view.awards} weeks={weeks} />
            <MyJattoo data={view.d} memberId={link.memberId} />
            <div className="text-center mt-10"><button className="btn btn-ghost" onClick={() => go('#/house')}>{t('Үйгө кайтуу')}</button></div>
            {share && (
                <Suspense fallback={null}>
                    <ShareSheet data={view.d} weekIndex={cur.weekIndex} insights={view.ins} awards={view.awards.filter(a => SELF_CONTAINED.has(a.def.id))}
                        target={{ type: 'person', memberId: link.memberId, card: share }} siteTheme={theme === 'dark' ? 'dark' : 'light'}
                        seasonName={view.seasonName} seasonFinished={false} onClose={() => setShare(null)} />
                </Suspense>
            )}
        </div>
    );
};

/* ── The week: who, which week, the number against the plan ─────────────── */

const Hero: React.FC<{ series: MemberSeries; cur: MemberWeek; pos: number; weeks: MemberWeek[]; data: { weeks: Array<{ startDate?: string | null; endDate?: string | null }> }; ins: ReturnType<typeof buildInsights>; onPick: (i: number) => void }> = ({ series, cur, pos, weeks, data, ins, onPick }) => {
    const wk = data.weeks[cur.weekIndex];
    const range = wk ? formatWeekRange(wk.startDate ?? null, wk.endDate ?? null) : '';
    const prev = [...weeks.slice(0, pos)].reverse().find(w => w.submitted);
    const delta = cur.submitted && prev ? cur.score - prev.score : null;
    const of = [...ins.members.values()].filter(s => s.weeks.some(w => w.weekIndex === cur.weekIndex && w.submitted)).length;
    const scale = Math.max(PLAN_SCORE * 1.6, cur.score * 1.08);
    const pct = Math.round((cur.score / PLAN_SCORE) * 100);
    const arrow = 'w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors hover:text-[var(--gold)] disabled:opacity-30';

    return (
        <section className="mine-hero">
            <div className="flex flex-col items-center text-center">
                {/* The face inside the шырдак medallion, as the mark sits on the sign-in page. */}
                <span className="mine-face">
                    <span className="mine-face-medallion" aria-hidden="true"><Medallion size={230} className="spin-slow" /></span>
                    <Avatar name={series.name} role={roleAt(series, cur.weekIndex)} photoUrl={series.photoUrl} size="2xl" />
                </span>
                <h1 className="font-display text-[2.3rem] sm:text-[2.7rem] leading-tight mt-3" style={{ color: 'var(--text-primary)' }}>{series.name}</h1>
                <div className="eyebrow mt-1">{ROLE_LABEL[roleAt(series, cur.weekIndex)]} · {cur.houseName}</div>
            </div>

            {/* Any week: arrows for the next one, the name for the whole list. */}
            <div className="flex items-center justify-center gap-4 mt-7">
                <button className={arrow} style={{ border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }} disabled={pos === 0} onClick={() => onPick(pos - 1)} aria-label={t('Мурунку апта')}><ChevronLeft className="w-5 h-5" /></button>
                <div className="relative text-center min-w-[11rem]">
                    <div className="font-display text-[1.35rem] leading-tight inline-flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>{t('{0}-апта', cur.weekNumber)}{weeks.length > 1 && <ChevronDown className="w-4 h-4" style={{ color: 'var(--gold)' }} />}</div>
                    {range && <div className="text-[0.8rem] italic" style={{ color: 'var(--text-muted)' }}>{range}</div>}
                    {weeks.length > 1 && (
                        <select value={pos} onChange={e => onPick(Number(e.target.value))} aria-label={t('Аптаны тандоо')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                            {weeks.map((w, i) => <option key={w.weekIndex} value={i}>{t('{0}-апта', w.weekNumber)}{w.submitted ? ` · ${fmt(w.score)}` : w.excused ? ` · ${t('себептүү')}` : ''}</option>)}
                        </select>
                    )}
                </div>
                <button className={arrow} style={{ border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }} disabled={pos >= weeks.length - 1} onClick={() => onPick(pos + 1)} aria-label={t('Кийинки апта')}><ChevronRight className="w-5 h-5" /></button>
            </div>

            <div key={cur.weekIndex} className="text-center mt-6 mine-rise">
                {cur.excused ? (
                    <div className="font-display text-[2.4rem]" style={{ color: 'var(--text-secondary)' }}>{t('себептүү')}</div>
                ) : !cur.submitted ? (
                    <>
                        <div className="font-display tabular leading-none text-[4.6rem]" style={{ color: 'var(--text-muted)' }}>—</div>
                        <div className="text-[0.88rem] italic mt-2" style={{ color: 'var(--text-muted)' }}>{t('бул аптанын маалыматы али киргизиле элек')}</div>
                    </>
                ) : (
                    <>
                        <div className="font-display tabular leading-none text-[4.8rem] sm:text-[5.6rem] gold-sheen">{fmt(cur.score)}</div>
                        {/* The number on a scale, with the plan marked on it. */}
                        <div className="mine-meter mt-5" role="img" aria-label={t('Планга {0}%', pct)}>
                            <span className="mine-meter-fill" style={{ width: `${Math.min(100, (cur.score / scale) * 100)}%` }} />
                            <span className="mine-meter-plan" style={{ left: `${(PLAN_SCORE / scale) * 100}%` }}><span>{t('план {0}', PLAN_SCORE)}</span></span>
                        </div>
                        <div className="text-[0.9rem] mt-7" style={{ color: pct >= 100 ? 'var(--gold)' : 'var(--text-secondary)' }}>{pct >= 100 ? t('План {0}% аткарылды', pct) : t('Планга {0}%', pct)}</div>
                    </>
                )}
            </div>

            {cur.submitted && (
                <dl className="mine-facts mt-7">
                    <div><dt className="eyebrow">{t('Үйдө')}</dt><dd className="font-display tabular">{cur.rank ? <>{roman(cur.rank)}<small> / {of}</small></> : '—'}</dd></div>
                    <div><dt className="eyebrow">{t('Өзгөрүү')}</dt><dd className="font-display tabular" style={{ color: delta === null ? 'var(--text-muted)' : delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{delta === null ? '—' : signed(delta)}</dd></div>
                    <div><dt className="eyebrow">{t('Планда')}</dt><dd className="font-display tabular">{metricsAtPlan(cur)}<small> / 8</small></dd></div>
                </dl>
            )}
        </section>
    );
};

/* ── Every metric against its plan ───────────────────────────────────────── */

const AgainstPlan: React.FC<{ w: MemberWeek }> = ({ w }) => w.submitted ? (
    <Section eyebrow={t('Планга каршы')} action={<span className="text-[0.8rem] italic" style={{ color: 'var(--text-muted)' }}>{t('аткарылды / план')}</span>}>
        <PlanRows w={w} />
    </Section>
) : null;

/* ── The season's path: tap a week to open it ───────────────────────────── */

const Path: React.FC<{ series: MemberSeries; houseWeeks: Array<{ weekIndex: number; memberAvg: number; submitted: boolean }>; cur: MemberWeek; onPick: (w: MemberWeek) => void }> = ({ series, houseWeeks, cur, onPick }) => {
    const W = 340, H = 160, L = 14, R = 14, T = 22, B = 24;
    const pts = series.weeks;
    // The range of the numbers themselves (with the plan), so a change of 15 points is visible.
    const vals = [PLAN_SCORE, ...pts.filter(w => w.submitted).map(w => w.score), ...houseWeeks.filter(h => h.submitted).map(h => h.memberAvg)];
    const pad = Math.max(15, (Math.max(...vals) - Math.min(...vals)) * 0.2);
    const lo = Math.max(0, Math.min(...vals) - pad), hi = Math.max(...vals) + pad;
    const x = (i: number) => L + (pts.length === 1 ? (W - L - R) / 2 : (i / (pts.length - 1)) * (W - L - R));
    const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const line = (vals: Array<number | null>) => vals.reduce((acc, v, i) => (v === null ? acc : `${acc}${acc && vals[i - 1] !== null ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`), '');
    const mine = pts.map(w => (w.submitted ? w.score : null));
    const house = pts.map(w => { const h = houseWeeks.find(x => x.weekIndex === w.weekIndex); return h && h.submitted ? h.memberAvg : null; });
    const every = pts.length > 12 ? 3 : pts.length > 7 ? 2 : 1;
    return (
        <Section eyebrow={t('Сезондогу жол')} action={<span className="mine-legend"><i className="is-me" />{t('мен')}<i className="is-house" />{t('үйдүн орточосу')}<i className="is-plan" />{t('план')}</span>}>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-4 mine-path" role="img" aria-label={t('Апта сайын упайым')}>
                <line x1={L} x2={W - R} y1={y(PLAN_SCORE)} y2={y(PLAN_SCORE)} className="mine-path-plan" />
                <path d={line(house)} className="mine-path-house" />
                <path d={`${line(mine)}`} className="mine-path-me" />
                {pts.map((w, i) => (
                    <g key={w.weekIndex} onClick={() => onPick(w)} style={{ cursor: 'pointer' }}>
                        <rect x={x(i) - 14} y={0} width={28} height={H} fill="transparent" />
                        {w.weekIndex === cur.weekIndex && <line x1={x(i)} x2={x(i)} y1={T} y2={H - B + 2} className="mine-path-cursor" />}
                        {w.submitted && <circle cx={x(i)} cy={y(w.score)} r={w.weekIndex === cur.weekIndex ? 5 : 3} className={w.weekIndex === cur.weekIndex ? 'mine-path-dot is-on' : 'mine-path-dot'} />}
                        {w.submitted && w.weekIndex === cur.weekIndex && <text x={x(i) > W - 40 ? x(i) - 9 : x(i) < 40 ? x(i) + 9 : x(i)} y={y(w.score) - 10} textAnchor={x(i) > W - 40 ? 'end' : x(i) < 40 ? 'start' : 'middle'} className="mine-path-value">{fmt(w.score)}</text>}
                        {(i % every === 0 || i === pts.length - 1 || w.weekIndex === cur.weekIndex) && (
                            <text x={x(i)} y={H - 8} textAnchor="middle" className={w.weekIndex === cur.weekIndex ? 'mine-path-label is-on' : 'mine-path-label'}>{w.weekNumber}</text>
                        )}
                    </g>
                ))}
            </svg>
            <p className="text-[0.78rem] italic text-center mt-1" style={{ color: 'var(--text-muted)' }}>{t('Аптаны ачуу үчүн басыңыз')}</p>
        </Section>
    );
};

/* ── The season in numbers ───────────────────────────────────────────────── */

const SeasonNumbers: React.FC<{ series: MemberSeries; ins: ReturnType<typeof buildInsights>; total: number; name: string; onPick: (w: MemberWeek) => void }> = ({ series, ins, total, name, onPick }) => {
    const s = seasonSummary(series, ins, total);
    const counted = series.weeks.filter(w => w.submitted).length;
    const strongBest = longestStreak(series.weeks, strongWeek);
    const none = (text: string) => <span className="text-[1rem] italic" style={{ color: 'var(--text-muted)' }}>{text}</span>;
    return (
        <Section eyebrow={name ? t('Сезон {0}', name) : t('Сезон')}>
            <dl className="mine-stats">
                <div><dt className="eyebrow">{t('Орточо упай')}</dt><dd>{counted ? fmt(s.average) : '—'}</dd></div>
                <div><dt className="eyebrow">{t('Үйдөгү орун')}</dt><dd>{s.rank ? <>{roman(s.rank)}<small> / {s.of}</small></> : '—'}</dd><p>{t('орточо упай боюнча')}</p></div>
                <div>
                    <dt className="eyebrow">{t('Эң мыкты апта')}</dt>
                    <dd>{s.best ? fmt(s.best.score) : '—'}</dd>
                    {s.best && <button className="hit mine-link" onClick={() => onPick(s.best!)}>{t('{0}-апта', s.best.weekNumber)} →</button>}
                </div>
                <div><dt className="eyebrow">{t('Катышуу')}</dt><dd>{counted}<small> / {s.weeksTotal}</small></dd>{s.excusedWeeks > 0 && <p>{t('{0} апта себептүү', s.excusedWeeks)}</p>}</div>
                <div><dt className="eyebrow">{t('Толук план')}</dt><dd>{s.perfectWeeks ? <>{s.perfectWeeks}<small> {t('жолу')}</small></> : none(t('азырынча жок'))}</dd>{s.longestPerfect > 1 && <p>{t('катары менен {0} апта', s.longestPerfect)}</p>}</div>
                <div><dt className="eyebrow">{t('Күчтүү апталар')}</dt><dd>{strongBest ? <>{strongBest}<small> {t('катары')}</small></> : none(t('азырынча жок'))}</dd><p>{t('{0}/8 көрсөткүч планда', STRONG_METRICS)}</p></div>
                {s.growth !== null && <div><dt className="eyebrow">{t('Өсүш')}</dt><dd style={{ color: s.growth > 0 ? 'var(--success)' : s.growth < 0 ? 'var(--danger)' : undefined }}>{signed(s.growth)}</dd><p>{t('сезондун экинчи жарымы биринчисине караганда')}</p></div>}
            </dl>
        </Section>
    );
};

/* ── My awards, and the next ones in reach ───────────────────────────────── */

const Awards: React.FC<{ memberId: string; awards: ReturnType<typeof computeAwards>; weeks: MemberWeek[] }> = ({ memberId, awards, weeks }) => {
    const mine = useMemo(() => myAwards(awards, memberId), [awards, memberId]);
    const goals = nextGoals(weeks, weeks[weeks.length - 1].weekIndex);
    const [open, setOpen] = useState<string | null>(null);
    return (
        <Section eyebrow={t('Менин сыйлыктарым')} action={mine.length > 0 ? <span className="text-[0.8rem] tabular" style={{ color: 'var(--text-muted)' }}>{t('{0} түр', mine.length)}</span> : undefined}>
            {mine.length === 0 ? (
                <p className="text-[0.95rem] italic py-5 text-center" style={{ color: 'var(--text-muted)' }}>{t('Азырынча сыйлык жок. Төмөндө кайсынысына канча калганын көрөсүз.')}</p>
            ) : (
                <ul className="mine-awards">
                    {mine.map(a => {
                        const on = open === a.award.def.id;
                        return (
                            <li key={a.award.def.id}>
                                <button onClick={() => setOpen(on ? null : a.award.def.id)} aria-expanded={on} className="w-full flex flex-col items-center text-center">
                                    <BadgeMedal icon={a.award.def.icon} tier={a.award.def.tier} size={84} count={a.count} label={a.award.def.name} />
                                    <span className="font-display text-[1.1rem] leading-tight mt-2" style={{ color: 'var(--text-primary)' }}>{a.award.def.name}</span>
                                    <span className="text-[0.75rem] tabular mt-0.5" style={{ color: 'var(--gold)' }}>{a.count > 1 ? t('{0} жолу', a.count) : t('{0}-апта', a.weeks[0])}</span>
                                </button>
                                {on && (
                                    <div className="mine-award-why pop-in">
                                        <p className="text-[0.8rem] italic" style={{ color: 'var(--text-secondary)' }}>{a.award.def.rule}</p>
                                        <ul className="mt-2">{a.reasons.map((r, i) => <li key={i} className="text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>{r}</li>)}</ul>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {goals.length > 0 && (
                <div className="mt-8">
                    <div className="eyebrow mb-1">{t('Жакында')}</div>
                    <ul>
                        {goals.map(g => {
                            const def = BADGES[g.id];
                            if (!def) return null;
                            return (
                                <li key={g.id} className="flex items-center gap-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                                    <BadgeMedal icon={def.icon} tier={def.tier} size={46} locked title={def.name} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-display text-[1.08rem]" style={{ color: 'var(--text-primary)' }}>{def.name}</span>
                                            <span className="leader" />
                                            <span className="tabular text-[0.9rem]" style={{ color: 'var(--gold)' }}>{g.have}<span style={{ color: 'var(--text-muted)' }}> / {g.need}</span></span>
                                        </div>
                                        <span className="plan-track mt-1.5 block"><span style={{ width: `${(g.have / g.need) * 100}%` }} /></span>
                                        <p className="text-[0.75rem] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>{def.rule}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
            <p className="text-[0.74rem] italic mt-5 leading-snug" style={{ color: 'var(--text-muted)' }}>{t('«Апта жылдызы», «Сыйлык тепкичи» жана «Чоң секирик» бардык үйлөрдүн жыйынтыгы менен ыйгарылат, ошондуктан бул жерде көрсөтүлбөйт.')}</p>
        </Section>
    );
};

/* ── Жаттоо: what I have memorized, and my plans ─────────────────────────── */

const MyJattoo: React.FC<{ data: Parameters<typeof JattooProfile>[0]['data']; memberId: string }> = ({ data, memberId }) => {
    const has = !!data.jattoo && (data.jattoo.records.some(r => r.memberId === memberId) || data.jattoo.goals.some(g => g.memberId === memberId));
    return (
        <div id="jattoo" className="pt-10 mt-8" style={{ borderTop: '1px solid var(--gold-dim)' }}>
            {has ? <JattooProfile data={data} memberId={memberId} /> : (
                <div className="text-center py-4">
                    <BookOpenCheck className="w-7 h-7 mx-auto" strokeWidth={1.3} style={{ color: 'var(--gold)' }} />
                    <div className="font-display text-[1.6rem] mt-2" style={{ color: 'var(--text-primary)' }}>{t('Жаттоо')}</div>
                    <p className="text-[0.9rem] mt-1 max-w-[28rem] mx-auto" style={{ color: 'var(--text-muted)' }}>{t('Жаттаганыңызды капитанга окуп бериңиз. Ал жазып койгондо, бул жерде көрүнөт.')}</p>
                </div>
            )}
        </div>
    );
};
