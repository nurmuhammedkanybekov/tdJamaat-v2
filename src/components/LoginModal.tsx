import React, { useEffect, useState } from 'react';
import { Lock, LogIn, X, Home, ShieldCheck } from 'lucide-react';
import { fetchHouses } from '../services/dataService';
import { signInAsHouse, signInAsAdmin } from '../services/authService';
import type { House } from '../types';

interface LoginModalProps {
    onSuccess: () => void;
    onClose: () => void;
}

type Mode = 'leader' | 'admin';

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess, onClose }) => {
    const [mode, setMode] = useState<Mode>('leader');
    const [houses, setHouses] = useState<House[]>([]);
    const [selectedHouseSlug, setSelectedHouseSlug] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchHouses().then(list => {
            setHouses(list);
            if (list.length > 0) setSelectedHouseSlug(list[0].slug);
        }).catch(() => {
            // Non-fatal — the leader dropdown will just be empty, admin tab still works.
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'admin') {
                await signInAsAdmin(password);
            } else {
                if (!selectedHouseSlug) {
                    setError('Үйдү тандаңыз');
                    setLoading(false);
                    return;
                }
                await signInAsHouse(selectedHouseSlug, password);
            }
            onSuccess();
        } catch {
            setError('Туура эмес сыр сөз');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '3px',
        color: 'var(--text-primary)'
    };

    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in oklab, var(--text-primary) 45%, transparent)' }}>
            <div className="max-w-md w-full relative">
            <div className="p-8 relative" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-1 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center mb-7">
                    <Lock className="w-6 h-6 mb-3" style={{ color: 'var(--accent)' }} />
                    <h2 className="font-serif text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Кирүү</h2>
                    <p className="text-center mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                        Маалымат киргизүү үчүн сыр сөзүңүздү жазыңыз
                    </p>
                </div>

                <div className="flex gap-6 mb-7" style={{ borderBottom: '1px solid var(--border)' }}>
                    <button
                        type="button"
                        onClick={() => setMode('leader')}
                        className="flex items-center gap-1.5 pb-3"
                        style={{
                            fontSize: '13px', fontWeight: 600,
                            color: mode === 'leader' ? 'var(--text-primary)' : 'var(--text-muted)',
                            borderBottom: mode === 'leader' ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                            marginBottom: '-1px'
                        }}
                    >
                        <Home className="w-3.5 h-3.5" /> Үй жетекчиси
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('admin')}
                        className="flex items-center gap-1.5 pb-3"
                        style={{
                            fontSize: '13px', fontWeight: 600,
                            color: mode === 'admin' ? 'var(--text-primary)' : 'var(--text-muted)',
                            borderBottom: mode === 'admin' ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                            marginBottom: '-1px'
                        }}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" /> Админ
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'leader' && (
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Үй</label>
                            <select
                                value={selectedHouseSlug}
                                onChange={e => setSelectedHouseSlug(e.target.value)}
                                className="w-full px-4 py-2.5 outline-none transition-all"
                                style={inputStyle}
                            >
                                {houses.map(house => (
                                    <option key={house.id} value={house.slug}>{house.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Сыр сөз</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-2.5 outline-none transition-all"
                            style={inputStyle}
                            placeholder="Сыр сөз"
                            autoFocus
                        />
                        {error && (
                            <p className="text-sm mt-2 ml-1 flex items-center gap-1.5" style={{ color: '#e34948' }}>
                                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#e34948' }} />
                                {error}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{ backgroundColor: 'var(--accent)', color: '#ffffff', borderRadius: '3px', letterSpacing: '0.02em', fontSize: '13px' }}
                    >
                        <LogIn className="w-4 h-4" />
                        {loading ? 'Кирүүдө…' : 'Кирүү'}
                    </button>
                </form>
            </div>
            </div>
        </div>
    );
};
