// Үйүм — a member's own house: its rating week by week, the mini-card, the
// people of the house in this week's order (own row marked), Тазалык and
// Жаттоо — and the member's own photo, which they set themselves. The
// database gives a member nothing about other houses.
import React, { useContext, useMemo, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import type { Theme } from '../theme';
import { t } from '../i18n';
import { AppFrame, Section, Waiting } from './AppFrame';
import { useMemberData } from './memberData';
import { MemberResults } from './MemberResults';
import { Avatar } from '../components/Avatar';
import { Sparkline } from '../components/ui';
import { calculateHouseRating, calculateMemberScore, calculateMiniCardBonus, tazalykBonus } from '../utils/scoring';
import { cardName } from '../utils/metrics';
import { formatWeekRange } from '../utils/weekDates';
import { TAZALYK_MAX } from '../utils/tazalyk';
import type { MiniCard } from '../types';
import { uploadMemberPhoto } from '../services/dataService';
import { signInWithGoogle } from '../services/memberService';
import { AppContext } from './context';
import { go } from './route';

const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

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

export const HousePage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const { member } = useContext(AppContext);
    const link = member?.status === 'linked' ? member.link : null;
    const { data, failed, reload } = useMemberData();

    const series = useMemo(() => {
        if (!data || !link) return [];
        return data.weeks.map(w => ({ week: w, team: w.teams.find(tm => tm.id === link.houseId) })).filter(r => r.team && r.team.members.length > 0);
    }, [data, link]);

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
    const trend = series.filter(r => r.team!.submitted).map(r => calculateHouseRating(r.team!));
    const me = team?.members.find(m => m.id === link.memberId);
    const people = team ? [...team.members].map(m => ({ m, score: m.excused ? null : calculateMemberScore(m) })).sort((a, b) => (b.score ?? -1) - (a.score ?? -1)) : [];
    const cardKeys = team ? (Object.keys(team.miniCard) as Array<keyof MiniCard>) : [];

    return (
        <AppFrame page="house" title={link.houseName} kicker={t('Менин үйүм')} sub={latest ? `${t('{0}-апта', latest.week.weekNumber)}${latest.week.startDate ? ` · ${formatWeekRange(latest.week.startDate, latest.week.endDate ?? null)}` : ''}` : undefined} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[46rem] mx-auto">
                {failed && <p className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>{t('Жыйынтыктар жүктөлгөн жок.')}</p>}
                {!data && !failed && <Waiting />}
                {data && team && (
                    <>
                        {/* The house's number, as the results show a week's. */}
                        <div className="text-center pt-8">
                            <div className="eyebrow">{t('Үйдүн рейтинги')}</div>
                            <div className="font-display tabular leading-none mt-3 text-[4.6rem] sm:text-[5.6rem] gold-sheen">{rating === null ? '—' : fmt(rating)}</div>
                            {trend.length > 1 && <div className="flex justify-center mt-3"><Sparkline values={trend} color="var(--gold)" width={180} height={34} label={t('Үйдүн рейтинги апта сайын')} /></div>}
                            <div className="text-[0.85rem] mt-2" style={{ color: 'var(--text-muted)' }}>
                                {team.submitted ? t('мини-карта +{0}', fmt(calculateMiniCardBonus(team.miniCard))) : t('бул аптанын маалыматы али киргизиле элек')}
                                {team.tazalyk ? ` · ${t('тазалык +{0}', fmt(tazalykBonus(team)))}` : ''}
                            </div>
                        </div>

                        <Section eyebrow={t('Үйдүн адамдары')}>
                            <ol>
                                {people.map(({ m, score }, i) => {
                                    const mine = m.id === link.memberId;
                                    return (
                                        <li key={m.id} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border)', backgroundColor: mine ? 'var(--accent-soft)' : undefined }}>
                                            <span className="w-6 text-right font-display tabular" style={{ color: 'var(--gold)' }}>{score === null ? '·' : i + 1}</span>
                                            <Avatar name={m.name} role={m.role} photoUrl={m.photoUrl} size="sm" />
                                            <span className="flex-1 min-w-0 font-display text-[1.2rem] truncate" style={{ color: 'var(--text-primary)' }}>{m.name}{mine && <span className="text-[0.8rem] ml-2" style={{ color: 'var(--gold)' }}>{t('сиз')}</span>}</span>
                                            <span className="font-display text-[1.25rem] tabular" style={{ color: mine ? 'var(--gold)' : 'var(--text-primary)' }}>{score === null ? t('себептүү') : fmt(score)}</span>
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
                                            <li key={k} className="flex items-baseline gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                                                <span className="text-[0.95rem]" style={{ color: 'var(--text-secondary)' }}>{cardName(k)}</span>
                                                <span className="leader" />
                                                <span className="tabular text-[1.05rem]" style={{ color: done ? 'var(--gold)' : 'var(--text-primary)' }}>{v.actual}</span>
                                                <span className="tabular text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>/ {v.target}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Section>
                        )}

                        {team.tazalyk && (
                            <Section eyebrow={t('Тазалык')}>
                                <div className="flex items-baseline justify-between pt-4">
                                    <span className="text-[0.95rem]" style={{ color: 'var(--text-secondary)' }}>{team.tazalyk.note || t('Бул аптанын баасы')}</span>
                                    <span className="font-display text-[2rem] tabular" style={{ color: 'var(--gold)' }}>{fmt(team.tazalyk.total)}<span className="text-[1rem]" style={{ color: 'var(--text-muted)' }}> / {TAZALYK_MAX}</span></span>
                                </div>
                            </Section>
                        )}

                        <Section eyebrow={t('Мен')}>
                            <div className="pt-5">
                                <MyPhoto houseId={link.houseId} memberId={link.memberId} name={link.name} photoUrl={me?.photoUrl ?? null} onChanged={reload} />
                            </div>
                            <MemberResults link={link} />
                        </Section>
                    </>
                )}
                {data && !team && <p className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>{t('Азырынча үйүңүздүн жыйынтыгы жок.')}</p>}
            </div>
        </AppFrame>
    );
};
