import React, { useEffect, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Loader2, Lock, LogIn, Moon, Sun } from 'lucide-react';
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
        <main className="hero entrance min-h-[100dvh] flex flex-col page-gutter overflow-hidden" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <StarField count={60} />
            <div className="app-container w-full flex items-center h-14 gap-1" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex-1 inline-flex items-center gap-2.5" style={{ color: 'var(--gold)' }}><Mark size={34} solid /><span className="font-display text-[1.3rem] leading-none">tdJamaat</span></span>
                <button onClick={() => setLang(isEnglish() ? 'ky' : 'en')} lang={isEnglish() ? 'ky' : 'en'} aria-label={isEnglish() ? 'Кыргызча' : 'English'} className={`${iconBtn} text-[0.72rem] font-semibold tracking-[0.16em]`}>
                    {isEnglish() ? 'КЫР' : 'EN'}
                </button>
                <button onClick={onToggleTheme} aria-label={theme === 'dark' ? t('Жарык тема') : t('Караңгы тема')} className={iconBtn}>
                    {theme === 'dark' ? <Sun className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} /> : <Moon className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} />}
                </button>
            </div>

            <div className="app-container w-full flex-1 entrance-grid">
                {/* What this is: a notebook the jamaat keeps together, week by week. */}
                <section className="entrance-story animate-fade-up">
                    <span aria-hidden="true" className="entrance-medallion"><Medallion size={420} className="spin-slow" /></span>
                    <p className="eyebrow inline-flex items-center gap-2" style={{ color: 'var(--gold)' }}><Lock className="w-3 h-3" aria-hidden="true" />{t('Жамааттын ички сайты')}</p>
                    <h1 className="entrance-title font-display">{t('Жамааттын апталык дептери')}</h1>
                    <Crown className="draw-in w-[min(12rem,55%)] h-auto mt-5" style={{ color: 'var(--gold)' }} />
                </section>

                {/* The way in: members by Google, the staff by password. */}
                <section className="entrance-doors animate-fade-up" style={{ animationDelay: '120ms' }}>
                    <div className={`door ${staff ? 'is-folded' : ''}`}>
                        <button type="button" className="door-head" onClick={() => switchMode('member')} aria-expanded={!staff}>
                            <span className="door-k">{t('Мүчө')}</span>
                            <span className="door-t font-display">{t('Мен жамааттын мүчөсүмүн')}</span>
                        </button>
                        {!staff && (
                            <div className="door-body">
                                <button type="button" onClick={google} disabled={loading} className="btn btn-primary w-full mt-2" style={{ minHeight: '3.2rem' }}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-semibold text-[1.05rem]" aria-hidden="true">G</span>}{t('Google менен кирүү')}
                                </button>
                                {error && <p id="login-error" role="alert" className="text-[0.88rem] px-3 py-2 mt-3" style={{ borderLeft: '2px solid var(--danger)', color: 'var(--danger)' }}>{error}</p>}
                            </div>
                        )}
                    </div>

                    <div className={`door door-staff ${staff ? '' : 'is-folded'}`}>
                        <button type="button" className="door-head" onClick={() => switchMode(mode === 'member' ? 'captain' : mode)} aria-expanded={staff}>
                            <span className="door-k">{t('Сыр сөз менен')}</span>
                            <span className="door-t font-display">{t('Капитан, CL же админмин')}</span>
                        </button>
                        {staff && (
                            <form onSubmit={handleSubmit} noValidate className="door-body space-y-5">
                                <div className="door-roles" role="tablist" aria-label={t('Ким катары кирүү')}>
                                    {([['captain', t('Капитан')], ['inspector', 'CL'], ['admin', t('Админ')]] as const).map(([m, label]) => (
                                        <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'is-on' : ''} onClick={() => switchMode(m)} title={m === 'inspector' ? t('Тазалык текшерүүчү') : undefined}>{label}</button>
                                    ))}
                                </div>
                                {mode === 'captain' && (
                                    <label className="block">
                                        <span className="eyebrow block mb-2">{t('Үйүңүз')}</span>
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
                                        <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" enterKeyHint="go" value={password}
                                            onChange={e => { setPassword(e.target.value); setError(''); }}
                                            aria-invalid={!!error || undefined} aria-describedby={error ? 'login-error' : undefined}
                                            className="login-field w-full pl-3.5 pr-12 py-3 text-base" style={field} />
                                        <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? t('Сыр сөздү жашыруу') : t('Сыр сөздү көрсөтүү')} aria-pressed={showPassword}
                                            className="absolute right-0 top-0 h-full w-12 inline-flex items-center justify-center transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}>
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </span>
                                </label>
                                {error && <p id="login-error" role="alert" className="text-[0.88rem] px-3 py-2" style={{ borderLeft: '2px solid var(--danger)', color: 'var(--danger)' }}>{error}</p>}
                                <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ minHeight: '3rem' }}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                                    {loading ? t('Кирүүдө…') : t('Кирүү')}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* The everyday pages need no account. */}
                    <nav className="entrance-open" aria-label={t('Баарына ачык')}>
                        <span className="eyebrow">{t('Кирбей эле')}</span>
                        {([['#/today', t('Намаз убактысы')], ['#/quran', t('Куран')], ['#/tasbihat', t('Тасбихат')], ['#/zikr', t('Зикир')]] as const).map(([href, label]) => (
                            <a key={href} href={href} className="font-display transition-colors hover:text-[var(--gold)]">{label}</a>
                        ))}
                    </nav>
                </section>
            </div>
        </main>
    );
};
