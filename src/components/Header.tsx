import React from 'react';
import { Award, Info, LogIn, Settings, ShieldCheck, Home } from 'lucide-react';
import type { AuthUser } from '../services/authService';
import type { Theme } from '../theme';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
    showFormula: boolean;
    setShowFormula: (show: boolean) => void;
    authUser: AuthUser | null;
    houseName: string | null;
    onLoginClick: () => void;
    onDataEntryClick: () => void;
    onLogout: () => void;
    theme: Theme;
    onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    showFormula, setShowFormula, authUser, houseName, onLoginClick, onDataEntryClick, onLogout, theme, onToggleTheme
}) => {
    return (
        <div className="rounded-2xl shadow-sm border p-6 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl shadow-lg" style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-strong))` }}>
                        <Award className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Үйлөр боюнча рейтинг системасы</h1>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Жааматтын ишмердүүлүгүн талдоо</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <a
                        href="https://addua.vercel.app/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-xl hover:bg-amber-600 transition-colors font-medium text-sm"
                    >
                        Санарип тасбихат
                    </a>

                    <button
                        onClick={() => setShowFormula(!showFormula)}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors font-medium text-sm"
                    >
                        <Info className="w-4 h-4" /> Формула
                    </button>

                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />

                    {authUser ? (
                        <>
                            <span
                                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
                                style={{ backgroundColor: 'color-mix(in oklab, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
                            >
                                {authUser.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                                {authUser.role === 'admin' ? 'Админ' : houseName ?? 'Үй жетекчиси'}
                            </span>
                            <button
                                onClick={onDataEntryClick}
                                className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl transition-colors font-medium text-sm"
                                style={{ backgroundColor: 'var(--accent)' }}
                            >
                                <Settings className="w-4 h-4" /> Маалымат кошуу
                            </button>
                            <button
                                onClick={onLogout}
                                className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-3 py-2.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors font-medium text-sm"
                            >
                                Чыгуу
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onLoginClick}
                            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl transition-colors font-medium text-sm"
                            style={{ backgroundColor: 'var(--accent)' }}
                        >
                            <LogIn className="w-4 h-4" /> Кирүү
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
