import React, { useEffect, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Loader2, Lock, LogIn, Moon, Sun } from 'lucide-react';
import { fetchHouses } from '../services/dataService';
import { signInAsHouse, signInAsAdmin } from '../services/authService';
import type { House } from '../types';
import type { Theme } from '../theme';
import { Corners, Crown, Mark, Medallion } from './Ornament';
import { StarField } from './motion';
import { isEnglish, setLang, t } from '../i18n';

// The site is private: nothing is shown until a captain or the admin logs in.
// The database enforces it too (supabase/private-site-2026-11.sql) — before
// logging in, only the house names can be read, for the picker below.
type Mode = 'captain' | 'admin';
const LAST_HOUSE = 'tdjamaat-login-house';

const readLastHouse = () => { try { return localStorage.getItem(LAST_HOUSE) ?? ''; } catch { return ''; } };

export const LoginScreen: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const [mode, setMode] = useState<Mode>('captain');
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

    const switchMode = (next: Mode) => { setMode(next); setError(''); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setError('');
        if (mode === 'captain' && !houseSlug) { setError(t('Үйдү тандаңыз')); return; }
        if (!password) { setError(t('Сыр сөздү жазыңыз')); return; }
        setLoading(true);
        try {
            if (mode === 'admin') await signInAsAdmin(password);
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
        <main className="hero min-h-[100dvh] flex flex-col page-gutter overflow-hidden" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <StarField count={70} />
            <div className="flex items-center justify-end h-14 gap-1" style={{ color: 'var(--text-secondary)' }}>
                <button
                    onClick={() => setLang(isEnglish() ? 'ky' : 'en')}
                    lang={isEnglish() ? 'ky' : 'en'}
                    aria-label={isEnglish() ? 'Кыргызча' : 'English'}
                    className={`${iconBtn} text-[0.72rem] font-semibold tracking-[0.16em]`}
                >
                    {isEnglish() ? 'КЫР' : 'EN'}
                </button>
                <button onClick={onToggleTheme} aria-label={theme === 'dark' ? t('Жарык тема') : t('Караңгы тема')} className={iconBtn}>
                    {theme === 'dark' ? <Sun className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} /> : <Moon className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} />}
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-6">
                <div className="w-full max-w-[25rem] animate-fade-up">
                    <div className="relative flex flex-col items-center text-center">
                        {/* A large ornament turning very slowly behind the mark, and a soft light. */}
                        <span aria-hidden="true" className="absolute left-1/2 top-[2.2rem] -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none">
                            <Medallion size={300} className="spin-slow" style={{ color: 'var(--gold)', opacity: 0.05 }} />
                        </span>
                        <span className="hero-glow" aria-hidden="true" style={{ top: '2.2rem', width: '26rem' }} />
                        <Mark size={64} className="pop-in" style={{ color: 'var(--gold)' }} />
                        <div className="font-display text-[2.4rem] leading-none mt-4 gold-sheen">tdJamaat</div>
                        <Crown className="draw-in w-[min(13rem,60%)] h-auto mt-4" style={{ color: 'var(--gold)' }} />
                        <p className="eyebrow mt-4 inline-flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                            <Lock className="w-3 h-3" aria-hidden="true" />{t('Жабык сайт')}
                        </p>
                        <p className="text-[0.95rem] leading-relaxed mt-3 max-w-[22rem]" style={{ color: 'var(--text-secondary)' }}>
                            {t('Жыйынтыктарды үйлөрдүн капитандары жана админ гана көрө алат.')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate className="relative mt-8 card card-pad pb-10! space-y-5" style={{ boxShadow: 'var(--shadow-lift)' }}>
                        <Corners inset={6} size={22} />
                        <div className="flex justify-center" role="tablist" aria-label={t('Ким катары кирүү')}>
                            <button type="button" role="tab" aria-selected={mode === 'captain'} className={`chip ${mode === 'captain' ? 'is-active' : ''}`} onClick={() => switchMode('captain')}>{t('Капитан')}</button>
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
                    </form>

                    <p className="text-center text-[0.82rem] mt-6" style={{ color: 'var(--text-muted)' }}>
                        {t('Сыр сөздү билбесеңиз, админге кайрылыңыз.')}
                    </p>
                </div>
            </div>
        </main>
    );
};
