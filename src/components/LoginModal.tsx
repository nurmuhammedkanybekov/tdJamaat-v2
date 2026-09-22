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
        backgroundColor: 'var(--page-plane)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)'
    };

    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in oklab, var(--text-primary) 45%, transparent)' }}>
            <div className="rounded-3xl shadow-2xl p-8 max-w-md w-full relative border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-full transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center mb-6">
                    <div className="p-4 rounded-2xl mb-4 shadow-lg" style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-strong))` }}>
                        <Lock className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Кирүү</h2>
                    <p className="text-center mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                        Маалымат киргизүү үчүн сыр сөзүңүздү жазыңыз
                    </p>
                </div>

                <div className="flex rounded-xl p-1 mb-6" style={{ backgroundColor: 'var(--page-plane)' }}>
                    <button
                        type="button"
                        onClick={() => setMode('leader')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all"
                        style={mode === 'leader'
                            ? { backgroundColor: 'var(--surface)', color: 'var(--accent)', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
                            : { color: 'var(--text-muted)' }}
                    >
                        <Home className="w-4 h-4" /> Үй жетекчиси
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('admin')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all"
                        style={mode === 'admin'
                            ? { backgroundColor: 'var(--surface)', color: 'var(--accent)', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
                            : { color: 'var(--text-muted)' }}
                    >
                        <ShieldCheck className="w-4 h-4" /> Админ
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'leader' && (
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Үй</label>
                            <select
                                value={selectedHouseSlug}
                                onChange={e => setSelectedHouseSlug(e.target.value)}
                                className="w-full px-4 py-3 border rounded-xl outline-none transition-all"
                                style={inputStyle}
                            >
                                {houses.map(house => (
                                    <option key={house.id} value={house.slug}>{house.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Сыр сөз</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border rounded-xl outline-none transition-all"
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
                        className="w-full text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-60 disabled:translate-y-0"
                        style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-strong))` }}
                    >
                        <LogIn className="w-5 h-5" />
                        {loading ? 'Кирүүдө...' : 'Кирүү'}
                    </button>
                </form>
            </div>
        </div>
    );
};
