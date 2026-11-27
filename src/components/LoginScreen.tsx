import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, Eye, EyeOff, Loader2, LogIn, Moon, Sun } from 'lucide-react';
import { fetchHouses } from '../services/dataService';
import { signInAsHouse, signInAsAdmin, signInAsInspector } from '../services/authService';
import type { House } from '../types';
import type { Theme } from '../theme';
import { Corners, Crown, Mark, Medallion } from './Ornament';
import { signInWithGoogle } from '../services/memberService';
import { SkyLayer, StarField } from './motion';
import { skyAt } from '../utils/sky';
import { loadCity } from '../utils/city';
import { t } from '../i18n';
import { LangSwitch } from './LangSwitch';

// The site is private: nothing is shown until a captain or the admin logs in.
// The database enforces it too (supabase/private-site-2026-11.sql) — before
// logging in, only the house names can be read, for the picker below.
type Mode = 'member' | 'captain' | 'admin' | 'inspector';
const MODE_KEY = 'tdjamaat-login-mode';
const LAST_HOUSE = 'tdjamaat-login-house';

const readLastHouse = () => { try { return localStorage.getItem(LAST_HOUSE) ?? ''; } catch { return ''; } };

export const LoginScreen: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const [mode, setMode] = useState<Mode>(() => {
        // The tab chosen last time on this phone; a new visitor is most likely a member.
        try { const m = localStorage.getItem(MODE_KEY); if (m === 'member' || m === 'captain' || m === 'admin' || m === 'inspector') return m; } catch { /* not critical */ }
        return 'member';
    });
    const sky = skyAt(loadCity(), new Date());
    const [houses, setHouses] = useState<House[]>([]);
    const [houseSlug, setHouseSlug] = useState(readLastHouse);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchHouses().then(list => {
            setHouses(list);
            setHouseSlug(prev => (list.some(h => h.slug === prev) ? prev : list[0]?.slug ?? ''));
        }).catch(() => {
            // Non-fatal: the house list stays empty, the admin tab still works.
        });
    }, []);

    const switchMode = (next: Mode) => { setMode(next); setError(''); try { localStorage.setItem(MODE_KEY, next); } catch { /* not critical */ } };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setError('');
        if (mode === 'captain' && !houseSlug) { setError(t('Үйдү тандаңыз')); return; }
        if (!password) { setError(t('Сыр сөздү жазыңыз')); return; }
        setLoading(true);
        try {
            if (mode === 'admin') await signInAsAdmin(password);
            else if (mode === 'inspector') await signInAsInspector(password);
            else {
                await signInAsHouse(houseSlug, password);
                try { localStorage.setItem(LAST_HOUSE, houseSlug); } catch { /* not critical */ }
            }
            // The auth listener in the app shell takes it from here.
        } catch (err) {
            // Only a credentials rejection means "wrong password" — a network
            // failure must not send someone retyping a password that was right.
            const message = err instanceof Error ? err.message : '';
            const status = (err as { status?: number })?.status;
            setError(/invalid login credentials/i.test(message)
                ? t('Туура эмес сыр сөз')
                : status === 429 || /too many|rate limit/i.test(message)
                    ? t('Аракет өтө көп болду. Бир мүнөттөн кийин кайра аракет кылыңыз.')
                    : t('Кирүү мүмкүн болгон жок: {0}', message || t('интернетти текшериңиз')));
            setLoading(false);
        }
    };

    const field: React.CSSProperties = { backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' };
    const iconBtn = 'w-10 h-10 inline-flex items-center justify-center transition-colors hover:text-[var(--gold)]';

    return (
        <main className="hero login-sky min-h-[100dvh] flex flex-col page-gutter overflow-hidden" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            {/* The same sky as the day page: tinted by the hour, stars at night. */}
            <SkyLayer phase={sky.phase} progress={sky.progress} />
            <StarField count={120} />
            <div className="flex items-center h-14 gap-1" style={{ color: 'var(--text-secondary)' }}>
                <a href="#/today" className="flex-1 inline-flex items-center gap-2 text-[0.7rem] tracking-[0.2em] uppercase transition-colors hover:text-[var(--gold)]">
                    <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />{t('Менин күнүм')}
                </a>
                <LangSwitch className={`${iconBtn} text-[0.72rem] font-semibold tracking-[0.16em]`} />
                <button onClick={onToggleTheme} aria-label={theme === 'dark' ? t('Жарык тема') : t('Караңгы тема')} className={iconBtn}>
                    {theme === 'dark' ? <Sun className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} /> : <Moon className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} />}
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center sm:justify-center pt-2 pb-2 sm:py-6">
                <div className="w-full max-w-[25rem] flex-1 sm:flex-none flex flex-col animate-fade-up">
                    <div className="relative flex flex-col items-center text-center">
                        {/* A large ornament turning very slowly behind the mark, and a soft light. */}
                        <span aria-hidden="true" className="absolute left-1/2 top-[4.6rem] -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none">
                            <Medallion size={460} className="spin-slow" style={{ color: 'var(--gold)', opacity: 0.13 }} />
                        </span>
                        <span className="hero-glow" aria-hidden="true" style={{ top: '4.6rem', width: '26rem' }} />
                        <Mark size={76} className="pop-in" style={{ color: 'var(--gold)' }} />
                        <div className="font-display text-[3rem] sm:text-[3.4rem] leading-none mt-4 gold-sheen">tdJamaat</div>
                        <Crown className="draw-in w-[min(13rem,60%)] h-auto mt-4" style={{ color: 'var(--gold)' }} />
                        <p className="eyebrow mt-4 inline-flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                            {t('Жамааттын апталык жыйынтыктары')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate className="relative mt-auto sm:mt-8 mb-0 card card-pad pb-10! space-y-5 login-card" style={{ boxShadow: 'var(--shadow-lift)' }}>
                        <Corners inset={6} size={22} />
                        <div className="flex justify-center" role="tablist" aria-label={t('Ким катары кирүү')}>
                            <button type="button" role="tab" aria-selected={mode === 'member'} className={`chip ${mode === 'member' ? 'is-active' : ''}`} onClick={() => switchMode('member')}>Google</button>
                            <button type="button" role="tab" aria-selected={mode === 'captain'} className={`chip ${mode === 'captain' ? 'is-active' : ''}`} onClick={() => switchMode('captain')}>{t('Капитан')}</button>
                            <button type="button" role="tab" aria-selected={mode === 'inspector'} className={`chip ${mode === 'inspector' ? 'is-active' : ''}`} onClick={() => switchMode('inspector')} title={t('Тазалык текшерүүчү')}>CL</button>
                            <button type="button" role="tab" aria-selected={mode === 'admin'} className={`chip ${mode === 'admin' ? 'is-active' : ''}`} onClick={() => switchMode('admin')} style={{ marginRight: 0 }}>{t('Админ')}</button>
                        </div>

                        {mode === 'captain' && (
                            <label className="block">
                                <span className="eyebrow block mb-2">{t('Үй')}</span>
                                <span className="relative block">
                                    <select value={houseSlug} onChange={e => { setHouseSlug(e.target.value); setError(''); }} className="login-field w-full appearance-none pl-3.5 pr-12 py-3 text-base" style={field}>
                                        {houses.map(house => <option key={house.id} value={house.slug}>{house.name}</option>)}
                                    </select>
                                    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--gold-dim)' }} />
                                </span>
                            </label>
                        )}

                        {mode === 'member' ? (
                            <div className="text-center pt-1">
                                <button type="button" onClick={() => { setLoading(true); signInWithGoogle().catch(err => { setLoading(false); setError(t('Кирүү мүмкүн болгон жок: {0}', err instanceof Error ? err.message : String(err))); }); }} disabled={loading} className="btn btn-primary w-full" style={{ minHeight: '3rem' }}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-semibold text-[1.05rem]" aria-hidden="true">G</span>}{t('Google менен кирүү')}
                                </button>
                                <p className="text-[0.8rem] mt-3" style={{ color: 'var(--text-muted)' }}>{t('Зикир, тасбихат жана Куран аккаунтуңузда сакталат. Жамааттын мүчөсү болсоңуз, капитаныңыз Gmail дарегиңизди жазып коёт, анан үйүңүз да ушул жерде ачылат.')}</p>
                                {error && <p id="login-error" role="alert" className="text-[0.88rem] px-3 py-2 mt-3 text-left" style={{ borderLeft: '2px solid var(--danger)', color: 'var(--danger)' }}>{error}</p>}
                            </div>
                        ) : (<>
                        <label className="block">
                            <span className="eyebrow block mb-2">{t('Сыр сөз')}</span>
                            <span className="relative block">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    enterKeyHint="go"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(''); }}
                                    aria-invalid={!!error || undefined}
                                    aria-describedby={error ? 'login-error' : undefined}
                                    className="login-field w-full pl-3.5 pr-12 py-3 text-base"
                                    style={field}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? t('Сыр сөздү жашыруу') : t('Сыр сөздү көрсөтүү')}
                                    aria-pressed={showPassword}
                                    className="absolute right-0 top-0 h-full w-12 inline-flex items-center justify-center transition-colors hover:text-[var(--gold)]"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </span>
                        </label>

                        {error && (
                            <p id="login-error" role="alert" className="text-[0.88rem] px-3 py-2" style={{ borderLeft: '2px solid var(--danger)', color: 'var(--danger)' }}>
                                {error}
                            </p>
                        )}

                        <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ minHeight: '3rem' }}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                            {loading ? t('Кирүүдө…') : t('Кирүү')}
                        </button>
                        </>)}
                    </form>

                    {mode !== 'member' && (
                        <p className="text-center text-[0.82rem] mt-6" style={{ color: 'var(--text-muted)' }}>
                            {t('Сыр сөздү билбесеңиз, админге кайрылыңыз.')}
                        </p>
                    )}

                    {/* The everyday pages need no account. */}
                    <nav className="mt-auto sm:mt-6 pt-5 text-center" style={{ borderTop: '1px solid var(--border)' }} aria-label={t('Баарына ачык')}>
                        <div className="eyebrow">{t('Баарына ачык')}</div>
                        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[0.95rem]">
                            {([['#/today', t('Күнүм')], ['#/quran', t('Куран')], ['#/tasbihat', t('Тасбихат')], ['#/zikr', t('Зикир')]] as const).map(([href, label]) => (
                                <a key={href} href={href} className="font-display text-[1.15rem] transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-secondary)' }}>{label}</a>
                            ))}
                        </div>
                    </nav>
                </div>
            </div>
        </main>
    );
};
