import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { fetchHouses, fetchMembers } from '../services/dataService';
import { signInAsHouse, signInAsAdmin } from '../services/authService';
import type { House } from '../types';
import { Sheet } from './ui';
import { t } from '../i18n';

interface LoginModalProps {
    onSuccess: () => void;
    onClose: () => void;
}

// Two ways in: a house's captain (one password per house) and the admin.
// Everyone else only views the site and never needs to log in.
type Mode = 'captain' | 'admin';
const LAST_HOUSE = 'tdjamaat-login-house';

const readLastHouse = () => { try { return localStorage.getItem(LAST_HOUSE) ?? ''; } catch { return ''; } };

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess, onClose }) => {
    const [mode, setMode] = useState<Mode>('captain');
    const [houses, setHouses] = useState<House[]>([]);
    const [captains, setCaptains] = useState<Record<string, string>>({});
    const [houseSlug, setHouseSlug] = useState(readLastHouse);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        Promise.all([fetchHouses(), fetchMembers().catch(() => [])]).then(([list, members]) => {
            setHouses(list);
            setCaptains(Object.fromEntries(members.filter(m => m.role === 'imam').map(m => [m.houseId, m.name])));
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
            onSuccess();
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
        } finally {
            setLoading(false);
        }
    };

    const field: React.CSSProperties = { backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' };

    return (
        <Sheet
            title={t('Кирүү')}
            onClose={onClose}
            width="27rem"
            footer={
                <button type="submit" form="login-form" disabled={loading} className="btn btn-primary w-full" style={{ minHeight: '3rem' }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    {loading ? t('Кирүүдө…') : t('Кирүү')}
                </button>
            }
        >
            <form id="login-form" onSubmit={handleSubmit} className="px-5 sm:px-7 py-6 space-y-5" noValidate>
                <div className="flex" role="tablist" aria-label={t('Ким катары кирүү')}>
                    <button type="button" role="tab" aria-selected={mode === 'captain'} className={`chip ${mode === 'captain' ? 'is-active' : ''}`} onClick={() => switchMode('captain')}>{t('Капитан')}</button>
                    <button type="button" role="tab" aria-selected={mode === 'admin'} className={`chip ${mode === 'admin' ? 'is-active' : ''}`} onClick={() => switchMode('admin')}>{t('Админ')}</button>
                </div>

                <p className="text-[0.88rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {mode === 'captain'
                        ? t('Апталык жыйынтыктарды үйдүн капитаны киргизет. Сыр сөздү билбесеңиз, админге кайрылыңыз.')
                        : t('Админ апталарды ачат, курамды жана пландарды башкарат.')}
                </p>

                {mode === 'captain' && (
                    <label className="block">
                        <span className="eyebrow block mb-2">{t('Үй')}</span>
                        <select value={houseSlug} onChange={e => { setHouseSlug(e.target.value); setError(''); }} className="w-full px-3.5 py-3 text-base" style={field}>
                            {houses.map(house => (
                                <option key={house.id} value={house.slug}>
                                    {captains[house.id] ? `${house.name} — ${captains[house.id]}` : house.name}
                                </option>
                            ))}
                        </select>
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
                            className="w-full pl-3.5 pr-12 py-3 text-base"
                            style={field}
                            // Don't pop the phone keyboard over the house picker on open.
                            autoFocus={mode === 'admin' || !window.matchMedia('(pointer: coarse)').matches}
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
            </form>
        </Sheet>
    );
};
