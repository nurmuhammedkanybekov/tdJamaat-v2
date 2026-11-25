// Үйүм — a member's own house: its rating week by week, the mini-card, the
// people of the house in this week's order (own row marked), Тазалык and
// Жаттоо — and the member's own photo, which they set themselves. The
// database gives a member nothing about other houses.
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { DataFile } from '../types';
import type { Self } from './self';
import { useSelf } from './self';
import { HouseChat } from './HouseChat';
import { GoalBanner } from './Community';
import { countUnread } from '../services/chatService';
import { Camera, ChevronRight, Loader2, MessageCircle } from 'lucide-react';
import type { Theme } from '../theme';
import { t } from '../i18n';
import { AppFrame, Section, Waiting } from './AppFrame';
import { useMemberData } from './memberData';
import { MemberResults } from './MemberResults';
import { Avatar } from '../components/Avatar';
import { Beads } from '../components/ui';
import { SumTerm, Trajectory } from '../components/HouseParts';
import { roman } from '../utils/roman';
import { MINI_CARD_POINTS, calculateHouseRating, calculateMemberAverage, calculateMemberScore, calculateMiniCardBonus, tazalykBonus } from '../utils/scoring';
import { cardName } from '../utils/metrics';
import { formatWeekRange } from '../utils/weekDates';
import { TAZALYK_MAX } from '../utils/tazalyk';
import type { MiniCard } from '../types';
import { uploadMemberPhoto } from '../services/dataService';
import { signInWithGoogle } from '../services/memberService';
import { AppContext } from './context';
import { go } from './route';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

const MyPhoto: React.FC<{ houseId: string; memberId: string; name: string; photoUrl: string | null; onChanged: () => void }> = ({ houseId, memberId, name, photoUrl, onChanged }) => {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [url, setUrl] = useState(photoUrl);
    const [error, setError] = useState('');
    const pick = async (file: File | undefined) => {
        if (!file) return;
        setBusy(true); setError('');
        try { setUrl(await uploadMemberPhoto(houseId, memberId, file)); onChanged(); }
        catch (e) { setError(/row-level|policy|not allowed|403/i.test(String((e as Error)?.message)) ? t('Сүрөт коюу азырынча ачыла элек — админ supabase/member-photos-2026-11.sql файлын иштетиши керек.') : (e as Error)?.message ?? ''); }
        finally { setBusy(false); }
    };
    return (
        <div className="flex items-center gap-4">
            <button type="button" onClick={() => input.current?.click()} className="relative flex-shrink-0" aria-label={t('Сүрөтүмдү алмаштыруу')}>
                <Avatar name={name} role="member" photoUrl={url} size="lg" />
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full inline-flex items-center justify-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--gold)', color: 'var(--gold)' }}>
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </span>
            </button>
            <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0])} />
            <div className="min-w-0">
                <div className="font-display text-[1.6rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{name}</div>
                <button type="button" onClick={() => input.current?.click()} className="text-[0.72rem] tracking-[0.16em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}>{t('Сүрөтүмдү алмаштыруу')}</button>
                {error && <p className="text-[0.82rem] mt-1" style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>
        </div>
    );
};

/** For a captain or the admin: which person of a house am I? Asked once. */
const ChooseSelf: React.FC<{ data: DataFile; onlyHouse: string | null; onChoose: (s: Omit<Self, 'via'>) => void }> = ({ data, onlyHouse, onChoose }) => {
    const latest = data.weeks[data.weeks.length - 1];
    const teams = (latest?.teams ?? []).filter(tm => !onlyHouse || tm.id === onlyHouse);
    const [house, setHouse] = useState(teams[0]?.id ?? '');
    const team = teams.find(tm => tm.id === house) ?? teams[0];
    return (
        <div className="max-w-[36rem] mx-auto pt-8">
            <p className="text-center text-[1rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('Сиз да бир үйдүн адамысыз. Ким экениңизди бир жолу тандаңыз — анан өз үйүңүздү, сүрөтүңүздү, үйдүн сөзүн көрөсүз, ал эми колдонмодогу сандарыңыз формага түшөт.')}</p>
            {teams.length > 1 && (
                <div className="chip-row mt-6 justify-center" role="tablist">
                    {teams.map(tm => <button key={tm.id} role="tab" aria-selected={tm.id === team?.id} className={`chip ${tm.id === team?.id ? 'is-active' : ''}`} onClick={() => setHouse(tm.id)}>{tm.name}</button>)}
                </div>
            )}
            <ul className="mt-4">
                {team?.members.map(m => (
                    <li key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <button onClick={() => onChoose({ memberId: m.id, name: m.name, houseId: team.id, houseName: team.name, manual: true })} className="row-link w-full text-left py-3 px-1 flex items-center gap-3">
                            <Avatar name={m.name} role={m.role} photoUrl={m.photoUrl} size="sm" />
                            <span className="flex-1 font-display text-[1.25rem]" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                            <span className="text-[0.72rem] tracking-[0.16em] uppercase" style={{ color: 'var(--gold)' }}>{t('Мен')}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

/** The way into the house's conversation, with what is new. */
const ChatEntry: React.FC<{ self: Self }> = ({ self }) => {
    const [unread, setUnread] = useState(0);
    useEffect(() => { countUnread(self.houseId, self.memberId).then(setUnread).catch(() => undefined); }, [self]);
    return (
        <button onClick={() => go('#/house/chat')} className="row-link w-full text-left mt-8 py-4 flex items-center gap-4" style={{ borderTop: '1px solid var(--gold)', borderBottom: '1px solid var(--border)' }}>
            <span className="w-11 h-11 rounded-full inline-flex items-center justify-center flex-shrink-0 relative" style={{ border: '1px solid var(--gold)', color: 'var(--gold)' }}>
                <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
                {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full text-[0.7rem] font-semibold inline-flex items-center justify-center" style={{ backgroundColor: 'var(--gold)', color: 'var(--page-plane)' }}>{unread > 99 ? '99+' : unread}</span>}
            </span>
            <span className="flex-1 min-w-0">
                <span className="block font-display text-[1.4rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{t('Үйдүн сөзү')}</span>
                <span className="block text-[0.85rem]" style={{ color: unread ? 'var(--gold)' : 'var(--text-muted)' }}>{unread ? t('{0} жаңы билдирүү', unread) : t('Үйдүн адамдары менен баарлашуу, дуба, эскертүү')}</span>
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--gold)' }} />
        </button>
    );
};

export const HousePage: React.FC<{ arg?: string | null; theme: Theme; onToggleTheme: () => void }> = ({ arg, theme, onToggleTheme }) => {
    const ctx = useContext(AppContext);
    const { self, canChoose, choose } = useSelf();
    const link = self;
    const { data, failed, reload } = useMemberData();

    const series = useMemo(() => {
        if (!data || !link) return [];
        return data.weeks.map(w => ({ week: w, team: w.teams.find(tm => tm.id === link.houseId) })).filter(r => r.team && r.team.members.length > 0);
    }, [data, link]);

    if (link && arg === 'chat') {
        return <HouseChat self={link} canModerate={ctx.role === 'admin' || (ctx.role === 'leader' && ctx.houseId === link.houseId)} theme={theme} onToggleTheme={onToggleTheme} />;
    }

    if (!link && canChoose) {
        return (
            <AppFrame page="house" title={t('Мен киммин?')} kicker={t('Менин үйүм')} theme={theme} onToggleTheme={onToggleTheme}>
                {data ? <ChooseSelf data={data} onlyHouse={ctx.role === 'leader' ? ctx.houseId ?? null : null} onChoose={choose} /> : <Waiting />}
            </AppFrame>
        );
    }

    if (!link) {
        return (
            <AppFrame page="house" title={t('Үйүм')} kicker={t('Мүчөлөр үчүн')} theme={theme} onToggleTheme={onToggleTheme}>
                <div className="max-w-[40rem] mx-auto text-center pt-10">
                    <p className="text-[1rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('Үйүңүздүн жыйынтыктарын көрүү үчүн Google аккаунтуңуз менен кириңиз. Капитаныңыз Gmail дарегиңизди жазып койгон болушу керек.')}</p>
                    <button className="btn btn-primary mt-6" onClick={() => { signInWithGoogle().catch(() => undefined); }}>{t('Google менен кирүү')}</button>
                    <div className="mt-4"><button className="text-[0.75rem] tracking-[0.16em] uppercase" style={{ color: 'var(--text-muted)' }} onClick={() => go('#/overview')}>{t('Капитандар үчүн кирүү')}</button></div>
                </div>
            </AppFrame>
        );
    }

    const latest = series[series.length - 1];
    const team = latest?.team;
    const rating = team?.submitted ? calculateHouseRating(team) : null;
    const me = team?.members.find(m => m.id === link.memberId);
    const people = team ? [...team.members].map(m => ({ m, score: m.excused ? null : calculateMemberScore(m) })).sort((a, b) => (b.score ?? -1) - (a.score ?? -1)) : [];
    const cardKeys = team ? (Object.keys(team.miniCard) as Array<keyof MiniCard>) : [];
    const myPlace = (() => { const i = people.findIndex(p => p.m.id === link.memberId && p.score !== null); return i >= 0 ? i + 1 : null; })();
    const trajectory = series.slice(-10).map((r, i) => ({ weekIndex: i, weekNumber: r.week.weekNumber, avg: r.team!.submitted ? calculateHouseRating(r.team!) : 0, rank: null, submitted: r.team!.submitted }));

    return (
        <AppFrame page="house" title={link.houseName} kicker={t('Менин үйүм')} sub={latest ? `${t('{0}-апта', latest.week.weekNumber)}${latest.week.startDate ? ` · ${formatWeekRange(latest.week.startDate, latest.week.endDate ?? null)}` : ''}` : undefined} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[46rem] mx-auto">
                {failed && <p className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>{t('Жыйынтыктар жүктөлгөн жок.')}</p>}
                {!data && !failed && <Waiting />}
                {data && team && (
                    <>
                        {/* The house: its number, how it is made, and how it moved. */}
                        <section className="house-hero mt-8" style={{ '--house': 'var(--gold)' } as React.CSSProperties}>
                            <div className="text-center">
                                <div className="eyebrow">{t('Үйдүн рейтинги')}</div>
                                <div className="font-display tabular leading-none mt-3 text-[4.4rem] sm:text-[5.4rem] gold-sheen">{rating === null ? '—' : fmt(rating)}</div>
                                {!team.submitted && <div className="text-[0.85rem] italic mt-2" style={{ color: 'var(--text-muted)' }}>{t('бул аптанын маалыматы али киргизиле элек')}</div>}
                            </div>
                            {team.submitted && (
                                <div className="house-sum">
                                    <SumTerm value={fmt(calculateMemberAverage(team))} label={t('мүчөлөрдүн орточосу')} />
                                    <span className="house-sum-op">+</span>
                                    <SumTerm value={fmt(calculateMiniCardBonus(team.miniCard))} of={MINI_CARD_POINTS * 7} label={t('мини-карта')} />
                                    {team.tazalyk && <>
                                        <span className="house-sum-op">+</span>
                                        <SumTerm value={fmt(tazalykBonus(team))} of={TAZALYK_MAX} label={t('тазалык')} />
                                    </>}
                                </div>
                            )}
                            {trajectory.length > 1 && <Trajectory weeks={trajectory} current={trajectory[trajectory.length - 1].weekIndex} color="var(--gold)" />}
                        </section>

                        {/* Me: my photo, my number this week and my place in the house. */}
                        <section className="plate mt-10">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0"><MyPhoto houseId={link.houseId} memberId={link.memberId} name={link.name} photoUrl={me?.photoUrl ?? null} onChanged={reload} /></div>
                                {myPlace && (
                                    <div className="text-right flex-shrink-0">
                                        <div className="eyebrow">{t('Үйдөгү орун')}</div>
                                        <div className="font-display text-[2rem] sm:text-[2.4rem] leading-none tabular mt-1.5 whitespace-nowrap" style={{ color: 'var(--gold)' }}>{roman(myPlace)}<span className="text-[1rem]" style={{ color: 'var(--text-muted)' }}> / {people.filter(p => p.score !== null).length}</span></div>
                                    </div>
                                )}
                            </div>
                            {link.via === 'staff' && <button onClick={() => choose(null)} className="mt-3 text-[0.72rem] tracking-[0.16em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}>{t('Башка адамды тандоо')}</button>}
                            <MemberResults link={link} />
                        </section>

                        <ChatEntry self={link} />
                        <GoalBanner houseId={link.houseId} week={latest?.week.globalWeek ?? null} canEdit={ctx.role === 'admin' || (ctx.role === 'leader' && ctx.houseId === link.houseId)} />

                        <Section eyebrow={t('Үйдүн адамдары')}>
                            <ol>
                                {people.map(({ m, score }, i) => {
                                    const mine = m.id === link.memberId;
                                    return (
                                        <li key={m.id} className="flex items-center gap-3 py-3 px-2 -mx-2" style={{ borderBottom: '1px solid var(--border)', backgroundColor: mine ? 'var(--gold-soft)' : undefined }}>
                                            <span className="w-8 text-center font-display text-[1.1rem] tabular" style={{ color: i < 3 && score !== null ? 'var(--gold)' : 'var(--text-muted)' }}>{score === null ? '·' : roman(i + 1)}</span>
                                            <Avatar name={m.name} role={m.role} photoUrl={m.photoUrl} size="sm" />
                                            <span className="flex-1 min-w-0 font-display text-[1.2rem] truncate" style={{ color: 'var(--text-primary)' }}>{m.name}{mine && <span className="eyebrow ml-2" style={{ color: 'var(--gold)' }}>{t('сиз')}</span>}</span>
                                            <span className="font-display text-[1.3rem] tabular" style={{ color: mine ? 'var(--gold)' : 'var(--text-primary)' }}>{score === null ? <span className="text-[0.85rem] italic" style={{ color: 'var(--text-muted)' }}>{t('себептүү')}</span> : fmt(score)}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </Section>

                        {team.submitted && (
                            <Section eyebrow={t('Мини-карта')}>
                                <ul>
                                    {cardKeys.map(k => {
                                        const v = team.miniCard[k];
                                        const done = v.target > 0 && v.actual >= v.target;
                                        return (
                                            <li key={k} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                                                <span className="flex-1 min-w-0 truncate text-[0.98rem]" style={{ color: 'var(--text-primary)' }}>{cardName(k)}</span>
                                                <span className="hidden min-[420px]:inline-flex"><Beads actual={v.actual} target={v.target} /></span>
                                                <span className="w-[3.6rem] text-right font-display tabular text-[1.3rem]" style={{ color: done ? 'var(--gold)' : 'var(--text-primary)' }}>{v.actual}<span className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}> / {v.target}</span></span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Section>
                        )}

                        {team.tazalyk && (
                            <Section eyebrow={t('Тазалык')}>
                                <div className="flex items-baseline justify-between pt-4">
                                    <span className="text-[0.95rem] italic" style={{ color: 'var(--text-secondary)' }}>{team.tazalyk.note || t('Бул аптанын баасы')}</span>
                                    <span className="font-display text-[2.2rem] tabular" style={{ color: 'var(--gold)' }}>{fmt(team.tazalyk.total)}<span className="text-[1rem]" style={{ color: 'var(--text-muted)' }}> / {TAZALYK_MAX}</span></span>
                                </div>
                            </Section>
                        )}
                    </>
                )}
                {data && !team && <p className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>{t('Азырынча үйүңүздүн жыйынтыгы жок.')}</p>}
            </div>
        </AppFrame>
    );
};
