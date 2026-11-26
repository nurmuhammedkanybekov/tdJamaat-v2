import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, Eye, EyeOff, KeyRound, Loader2, LogIn, Moon, Sun } from 'lucide-react';
import { fetchHouses } from '../services/dataService';
import { signInAsHouse, signInAsAdmin, signInAsInspector } from '../services/authService';
import type { House } from '../types';
import type { Theme } from '../theme';
import { Crown, Mark, Medallion } from './Ornament';
import { signInWithGoogle } from '../services/memberService';
import { StarField } from './motion';
import { isEnglish, setLang, t } from '../i18n';

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
    const staff = mode !== 'member';
    const google = () => { setLoading(true); signInWithGoogle().catch(err => { setLoading(false); setError(t('Кирүү мүмкүн болгон жок: {0}', err instanceof Error ? err.message : String(err))); }); };

    return (
        <main className="gate min-h-[100dvh]">
            {/* The brand: night, the шырдак medallion turning slowly, the name. No words to read. */}
            <section className="gate-brand" aria-hidden="true">
                <StarField count={50} />
                <span className="gate-medallion"><Medallion size={620} className="spin-slow" /></span>
                <div className="gate-brand-inner">
                    <Mark size={88} className="pop-in" />
                    <div className="font-display gate-word gold-sheen">tdJamaat</div>
                    <Crown className="draw-in gate-crown" />
                    <div className="gate-tag">{t('Жамааттын апталык жыйынтыктары')}</div>
                </div>
            </section>

            {/* The way in: one obvious action, the rest below it, quieter. */}
            <section className="gate-form">
                <div className="gate-controls">
                    <button onClick={() => setLang(isEnglish() ? 'ky' : 'en')} lang={isEnglish() ? 'ky' : 'en'} aria-label={isEnglish() ? 'Кыргызча' : 'English'} className={`${iconBtn} text-[0.72rem] font-semibold tracking-[0.16em]`}>
                        {isEnglish() ? 'КЫР' : 'EN'}
                    </button>
                    <button onClick={onToggleTheme} aria-label={theme === 'dark' ? t('Жарык тема') : t('Караңгы тема')} className={iconBtn}>
                        {theme === 'dark' ? <Sun className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} /> : <Moon className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} />}
                    </button>
                </div>

                <div className="gate-body animate-fade-up">
                    <h1 className="font-display gate-h">{t('Кирүү')}</h1>

                    {!staff ? (
                        <>
                            <button type="button" onClick={google} disabled={loading} className="gate-google">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleG />}
                                <span>{t('Google менен кирүү')}</span>
                            </button>
                            {error && <p id="login-error" role="alert" className="gate-error">{error}</p>}
                            <div className="gate-or"><span>{t('же')}</span></div>
                            <button type="button" className="gate-staff-link" onClick={() => switchMode('captain')}>
                                <KeyRound className="w-4 h-4" strokeWidth={1.5} />{t('Капитан, CL же админ')}
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate className="space-y-5">
                            <div className="door-roles" role="tablist" aria-label={t('Ким катары кирүү')}>
                                {([['captain', t('Капитан')], ['inspector', 'CL'], ['admin', t('Админ')]] as const).map(([m, label]) => (
                                    <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'is-on' : ''} onClick={() => switchMode(m)} title={m === 'inspector' ? t('Тазалык текшерүүчү') : undefined}>{label}</button>
                                ))}
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
                            <label className="block">
                                <span className="eyebrow block mb-2">{t('Сыр сөз')}</span>
                                <span className="relative block">
                                    <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" enterKeyHint="go" value={password} autoFocus
                                        onChange={e => { setPassword(e.target.value); setError(''); }}
                                        aria-invalid={!!error || undefined} aria-describedby={error ? 'login-error' : undefined}
                                        className="login-field w-full pl-3.5 pr-12 py-3 text-base" style={field} />
                                    <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? t('Сыр сөздү жашыруу') : t('Сыр сөздү көрсөтүү')} aria-pressed={showPassword}
                                        className="absolute right-0 top-0 h-full w-12 inline-flex items-center justify-center transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}>
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </span>
                            </label>
                            {error && <p id="login-error" role="alert" className="gate-error">{error}</p>}
                            <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ minHeight: '3.25rem' }}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                                {loading ? t('Кирүүдө…') : t('Кирүү')}
                            </button>
                            <button type="button" onClick={() => switchMode('member')} className="gate-back"><ArrowLeft className="w-3.5 h-3.5" />{t('Google менен кирүү')}</button>
                        </form>
                    )}
                </div>

                {/* The everyday pages need no account. */}
                <nav className="gate-open" aria-label={t('Баарына ачык')}>
                    {([['#/today', t('Намаз убактысы')], ['#/quran', t('Куран')], ['#/tasbihat', t('Тасбихат')], ['#/zikr', t('Зикир')]] as const).map(([href, label]) => (
                        <a key={href} href={href}>{label}</a>
                    ))}
                </nav>
            </section>
        </main>
    );
};

/** Google's "G" in its own colours, as Google asks sign-in buttons to show it. */
const GoogleG: React.FC = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
);
