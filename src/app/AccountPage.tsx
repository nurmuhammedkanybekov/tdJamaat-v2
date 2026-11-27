// #/account — the personal account: who is signed in, what is saved with the
// account and when it was last saved, and the way out (sign out, or delete
// the account and everything it saved).
import React, { useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Check, CloudOff, Loader2, LogOut, RefreshCw, Trash2 } from 'lucide-react';
import type { Theme } from '../theme';
import { t } from '../i18n';
import { AppFrame } from './AppFrame';
import { AppContext } from './context';
import { go } from './route';
import { loadPractice } from './practice';
import { loadMarks, loadLastRead } from './quranStore';
import { loadZikr } from '../utils/zikr';
import { loadCity } from '../utils/city';
import { OrnamentDivider } from '../components/Ornament';
import type { GoogleUser } from '../services/memberService';
import { googleSession, signInWithGoogle, signOutMember } from '../services/memberService';
import { cloudStatus, deleteMyAccount, onCloudStatus, syncCloud } from '../services/cloudStore';

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');

/** What this device holds, in a few numbers. */
const useHeld = () => {
    const zikr = loadZikr(), practice = loadPractice(), last = loadLastRead();
    const counts = Object.values(zikr.days).reduce((s, d) => s + Object.values(d).reduce((a, n) => a + n, 0), 0);
    const tasbihat = Object.values(practice.tasbihat).reduce((s, d) => s + d.length, 0);
    const pages = Object.values(practice.pages).reduce((s, d) => s + d.length, 0);
    return { counts, tasbihat, pages, last, marks: loadMarks().length, city: loadCity().name };
};

export const AccountPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const { member, signedIn } = useContext(AppContext);
    const status = useSyncExternalStore(onCloudStatus, cloudStatus);
    const [who, setWho] = useState<GoogleUser | null>(member?.status === 'unlinked' ? member : null);
    const [asking, setAsking] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const held = useHeld();
    const linked = member?.status === 'linked' ? member.link : null;
    const personal = !!linked || member?.status === 'unlinked';

    useEffect(() => { if (personal) googleSession().then(setWho).catch(() => undefined); }, [personal]);

    const leave = async () => { setBusy(true); await signOutMember().catch(() => undefined); go('#/today'); window.location.reload(); };
    const remove = async () => {
        setBusy(true); setErr('');
        try { await deleteMyAccount(); go('#/today'); window.location.reload(); }
        catch (e) { setErr((e as Error)?.message ?? String(e)); setBusy(false); }
    };

    const statusLine = status.state === 'saving' ? <><Loader2 className="w-4 h-4 animate-spin" />{t('Сакталууда…')}</>
        : status.state === 'saved' ? <><Check className="w-4 h-4" />{t('Сакталды · {0}', time(status.at))}</>
            : status.state === 'offline' ? <><CloudOff className="w-4 h-4" />{t('Интернет жок: бул түзмөктө калды, кийин сакталат')}</>
                : status.state === 'off' ? <><CloudOff className="w-4 h-4" />{t('Аккаунтта сактоо азырынча күйгүзүлө элек')}</>
                    : null;

    return (
        <AppFrame page="today" title={t('Менин аккаунтум')} kicker={t('Жеке')} theme={theme} onToggleTheme={onToggleTheme}>
            <div className="max-w-[40rem] mx-auto pt-8">
                {!personal ? (
                    <section className="acct-out">
                        <p className="font-display text-[1.6rem] leading-snug" style={{ color: 'var(--text-primary)' }}>{signedIn ? t('Бул бет Google аккаунттары үчүн.') : t('Зикир, тасбихат жана Куран бир аккаунтта, ар бир түзмөгүңүздө.')}</p>
                        {!signedIn && <button onClick={() => { signInWithGoogle('#/account').catch(() => undefined); }} className="btn btn-primary mt-6"><span className="font-semibold text-[1.05rem]" aria-hidden="true">G</span>{t('Google менен кирүү')}</button>}
                    </section>
                ) : (
                    <>
                        <header className="acct-who">
                            {who?.photo ? <img src={who.photo} alt="" referrerPolicy="no-referrer" className="acct-face" /> : <span className="acct-face acct-initial font-display" aria-hidden="true">{(linked?.name ?? who?.name ?? '·').slice(0, 1)}</span>}
                            <div className="min-w-0">
                                <h2 className="font-display text-[1.9rem] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{linked?.name ?? who?.name ?? ''}</h2>
                                <div className="text-[0.9rem] truncate" style={{ color: 'var(--text-muted)' }}>{who?.email}</div>
                                <div className="eyebrow mt-2" style={{ color: 'var(--gold)' }}>{linked ? t('Жамааттын мүчөсү · {0}', linked.houseName) : t('Жеке аккаунт')}</div>
                            </div>
                        </header>

                        <OrnamentDivider className="mt-10" />

                        <section className="mt-8">
                            <div className="text-center">
                                <h3 className="font-display text-[2rem]" style={{ color: 'var(--text-primary)' }}>{t('Аккаунтта сакталат')}</h3>
                                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 mt-1">
                                    {statusLine && <span className="acct-status" data-state={status.state}>{statusLine}</span>}
                                    <button className="acct-sync" onClick={() => { syncCloud().catch(() => undefined); }} disabled={status.state === 'saving'}><RefreshCw className="w-3.5 h-3.5" />{t('Азыр сактоо')}</button>
                                </div>
                            </div>
                            <dl className="acct-held">
                                <div><dt>{t('Зикир')}</dt><dd className="tabular">{held.counts.toLocaleString()}</dd></div>
                                <div><dt>{t('Тасбихат')}</dt><dd className="tabular">{held.tasbihat}</dd></div>
                                <div><dt>{t('Куран, бет')}</dt><dd className="tabular">{held.pages}</dd></div>
                                <div><dt>{t('Белгилер')}</dt><dd className="tabular">{held.marks}</dd></div>
                            </dl>
                            <p className="text-[0.88rem] mt-5 leading-relaxed text-center italic" style={{ color: 'var(--text-muted)' }}>
                                {held.last ? t('Куранда акыркы жолу: {0}, {1}-аят.', held.last.name, held.last.ayah) + ' ' : ''}{t('Шаар: {0}.', held.city)}
                            </p>
                            <p className="text-[0.95rem] mt-5 leading-relaxed text-center max-w-[32rem] mx-auto" style={{ color: 'var(--text-secondary)' }}>
                                {linked ? t('Мунун баарын сиз гана көрөсүз. Жамааттын мүчөсү катары салават, зикир, тасбихат жана Куран сандарыңыз апталык жыйынтык үчүн капитаныңызга да барат.') : t('Мунун баарын сиз гана көрөсүз: капитан да, админ да көрбөйт.')}
                            </p>
                        </section>

                        {!linked && who && (
                            <section className="mt-10 acct-note">
                                <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Жамааттын мүчөсүсүзбү?')}</div>
                                <p className="mt-2 text-[0.95rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('Капитаныңызга ушул даректи айтыңыз. Ал жазгандан кийин үйүңүз жана жыйынтыктарыңыз ушул эле аккаунтта ачылат.')}</p>
                                <p className="font-display text-[1.25rem] mt-2 break-all" style={{ color: 'var(--text-primary)' }}>{who.email}</p>
                            </section>
                        )}

                        <OrnamentDivider className="mt-12" />

                        <section className="mt-6 acct-out-actions">
                            <button onClick={leave} disabled={busy} className="acct-action"><LogOut className="w-4 h-4" />{t('Аккаунттан чыгуу')}</button>
                            {!asking ? (
                                <button onClick={() => setAsking(true)} disabled={busy} className="acct-action is-danger"><Trash2 className="w-4 h-4" />{t('Аккаунтту өчүрүү')}</button>
                            ) : (
                                <div className="acct-confirm" role="alertdialog" aria-label={t('Аккаунтту өчүрүү')}>
                                    <p>{t('Аккаунт жана анда сакталгандардын баары өчөт. Бул түзмөктөгү көчүрмө калат. Кайтарып болбойт.')}{linked ? ' ' + t('Жамааттагы жыйынтыктарыңыз үйүңүздө калат.') : ''}</p>
                                    <div className="flex flex-wrap gap-3 mt-4">
                                        <button onClick={remove} disabled={busy} className="btn btn-danger">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}{t('Ооба, өчүрүү')}</button>
                                        <button onClick={() => setAsking(false)} disabled={busy} className="btn btn-ghost">{t('Жок')}</button>
                                    </div>
                                    {err && <p className="mt-3 text-[0.85rem]" style={{ color: 'var(--danger)' }}>{err}</p>}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </AppFrame>
    );
};
