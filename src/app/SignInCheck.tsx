// #/kiruu — the Google sign-in, checked step by step, in words. Made for the
// admin (or a member) to open on a phone and send a screenshot: each line
// says what the site sees and, when something is wrong, what to change.
import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, CircleDashed, Loader2 } from 'lucide-react';
import type { Theme } from '../theme';
import { t } from '../i18n';
import { AppFrame } from './AppFrame';
import { supabase } from '../lib/supabase';
import { signInWithGoogle, signOutMember } from '../services/memberService';
import { isStandaloneApp } from '../lib/authReturn';

type State = 'ok' | 'bad' | 'none';
interface Step { label: string; state: State; text: string; fix?: string }

const readReturn = (): { at: string; code: boolean; error: string | null; origin: string; exchangeError?: string } | null => {
    try { return JSON.parse(sessionStorage.getItem('tdjamaat-auth-return') ?? 'null'); } catch { return null; }
};

export const SignInCheck: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const [steps, setSteps] = useState<Step[] | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        (async () => {
            const out: Step[] = [];
            const origin = window.location.origin;
            if (isStandaloneApp()) out.push({ label: t('Колдонмо режими'), state: 'bad', text: t('Сайт телефонго орнотулган колдонмо катары ачылган.'), fix: t('iPhone\'до орнотулган колдонмо Google кирүүсүн өзүнчө браузерде аяктайт. Биринчи жолу Safari\'де кириңиз.') });
            out.push({ label: t('Сайттын дареги'), state: 'none', text: origin, fix: t('Supabase → Authentication → URL Configuration → Redirect URLs тизмесинде «{0}/**» болушу керек.', origin) });

            const back = readReturn();
            if (!back) out.push({ label: t('Google\'дан кайтуу'), state: 'none', text: t('Бул браузерде азырынча Google аркылуу кирүү аракети болгон жок. Төмөнкү баскыч менен кирип, бул бетке кайра келиңиз.') });
            else if (back.error) out.push({ label: t('Google\'дан кайтуу'), state: 'bad', text: back.error, fix: /exchange external code/i.test(back.error) ? t('Supabase Google\'дан код алды, бирок Google аны кабыл алган жок. Supabase\'теги Google Client Secret же Client ID туура эмес. Google Cloud → APIs & Services → Credentials → OAuth client бөлүмүндө жаңы Client secret түзүңүз, анан Client ID менен Client secret экөөн тең Supabase → Authentication → Sign In / Providers → Google\'га чаптап, Save басыңыз.') : /signups? not allowed|signup.*disabled/i.test(back.error) ? t('Supabase → Authentication → Sign In / Providers → «Allow new users to sign up» күйгүзүлүшү керек.') : /provider is not enabled|unsupported provider/i.test(back.error) ? t('Supabase → Authentication → Providers → Google күйгүзүлүшү керек.') : undefined });
            else if (back.exchangeError) out.push({ label: t('Google\'дан кайтуу'), state: 'bad', text: back.exchangeError, fix: t('Кирүү башка браузерде аяктады. Сайтты Safari же Chrome\'до ачып, ошол жерден кайра «Google менен кирүү» басыңыз (Gmail, Telegram, Instagram ичиндеги браузерден эмес).') })
            else out.push({ label: t('Google\'дан кайтуу'), state: 'ok', text: t('Google кирүүнү кабыл алды ({0}).', new Date(back.at).toLocaleString()) });

            const { data, error } = await supabase.auth.getSession();
            const user = data.session?.user;
            if (error) out.push({ label: t('Сессия'), state: 'bad', text: error.message, fix: t('Кирүүнү ушул эле браузерде баштап, ушул эле браузерде аяктаңыз (мисалы, Gmail колдонмосунун ичиндеги браузерде эмес).') });
            else if (!user) out.push({ label: t('Сессия'), state: back?.code ? 'bad' : 'none', text: t('Сайтка кирилген эмес.'), fix: back?.code ? t('Google коду келди, бирок сессия ачылган жок. Көбүнчө себеби: кирүү башка даректен (мисалы, preview шилтемеден) башталып, башка даректе аяктаган. Supabase\'теги Site URL жана Redirect URLs ушул дарекке туура келиши керек.') : undefined });
            else {
                const role = (user.app_metadata as { role?: string } | undefined)?.role;
                out.push({ label: t('Сессия'), state: 'ok', text: `${user.email ?? '—'} · ${user.app_metadata?.provider ?? '—'}` });
                if (role) out.push({ label: t('Ролу'), state: 'bad', text: role, fix: t('Бул аккаунт капитандыкы же админдики. Мүчө катары кирүү үчүн башка Gmail колдонуңуз.') });
                else {
                    out.push({ label: t('Почта ырасталганбы'), state: user.email_confirmed_at ? 'ok' : 'bad', text: user.email_confirmed_at ? t('ооба') : t('жок'), fix: user.email_confirmed_at ? undefined : t('Google аккаунттун почтасы ырасталган болушу керек.') });
                    const { data: link, error: linkError } = await supabase.rpc('link_member_account');
                    if (linkError) out.push({ label: t('Мүчө менен байланыш'), state: 'bad', text: linkError.message, fix: t('supabase/members-2026-11.sql иштетилгенин текшериңиз.') });
                    else if (!link) out.push({ label: t('Мүчө менен байланыш'), state: 'none', text: t('Жеке аккаунт: «{0}» дареги эч бир мүчөгө жазылган эмес.', user.email ?? ''), fix: t('Капитан же админ: Меню → «Мүчөлөрдүн кирүүсү» → ушул адамга так ушул Gmail дарегин жазып, «Сактоо» басыңыз. Анан бул бетти жаңыртыңыз.') });
                    else {
                        const l = link as { name?: string; house_name?: string };
                        out.push({ label: t('Мүчө менен байланыш'), state: 'ok', text: `${l.name ?? ''} · ${l.house_name ?? ''}` });
                    }
                }
            }
            setSteps(out);
        })().catch(e => setSteps([{ label: t('Ката'), state: 'bad', text: String((e as Error)?.message ?? e) }]));
    }, []);

    const icon = (s: State) => s === 'ok' ? <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--success)' }} />
        : s === 'bad' ? <CircleAlert className="w-5 h-5" style={{ color: 'var(--danger)' }} />
            : <CircleDashed className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />;

    return (
        <AppFrame page="today" title={t('Кирүүнү текшерүү')} kicker={t('Google менен кирүү')} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[40rem] mx-auto">
                <p className="text-[0.95rem] leading-relaxed text-center" style={{ color: 'var(--text-secondary)' }}>{t('Бул бет Google менен кирүүнү кадам-кадамы менен текшерет. Кызыл белги кайсы жерде токтогонун көрсөтөт. Скриншотун админге жиберсеңиз болот.')}</p>
                {!steps ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--gold)' }} /></div> : (
                    <ol className="mt-8" style={{ borderTop: '1px solid var(--gold-dim)' }}>
                        {steps.map((s, i) => (
                            <li key={i} className="flex gap-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                                <span className="pt-0.5 flex-shrink-0">{icon(s.state)}</span>
                                <span className="min-w-0">
                                    <span className="eyebrow block">{s.label}</span>
                                    <span className="block mt-1 break-words" style={{ color: 'var(--text-primary)' }}>{s.text}</span>
                                    {s.fix && s.state !== 'ok' && <span className="block text-[0.85rem] mt-1.5 italic" style={{ color: 'var(--text-secondary)' }}>{s.fix}</span>}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
                <div className="flex flex-wrap justify-center gap-3 mt-8">
                    <button className="btn btn-primary" disabled={busy} onClick={() => { setBusy(true); signInWithGoogle('#/kiruu').catch(() => setBusy(false)); }}>{t('Google менен кирүү')}</button>
                    <button className="btn btn-ghost" onClick={() => { signOutMember().finally(() => window.location.reload()); }}>{t('Чыгуу')}</button>
                </div>
            </div>
        </AppFrame>
    );
};
