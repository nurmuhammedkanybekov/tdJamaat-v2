import React from 'react';
import { Info, LogIn, Settings, ShieldCheck, Home, LogOut, ExternalLink } from 'lucide-react';
import type { AuthUser } from '../services/authService';
import type { Theme } from '../theme';
import { ThemeToggle } from './ThemeToggle';
import { OrnamentDivider } from './Ornament';

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

const ghostBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    fontSize: '12.5px', fontWeight: 600, letterSpacing: '0.01em',
    padding: '8px 14px', borderRadius: '3px',
    border: '1px solid var(--border)', color: 'var(--text-secondary)',
    background: 'transparent', transition: 'border-color 150ms, color 150ms'
};

const outlineBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    fontSize: '12.5px', fontWeight: 600, letterSpacing: '0.02em',
    padding: '9px 18px', borderRadius: '3px',
    border: '1px solid var(--text-primary)', color: 'var(--text-primary)',
    background: 'transparent'
};

const fillBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    fontSize: '12.5px', fontWeight: 600, letterSpacing: '0.02em',
    padding: '9px 18px', borderRadius: '3px',
    border: '1px solid var(--accent)', color: '#ffffff', backgroundColor: 'var(--accent)'
};

export const Header: React.FC<HeaderProps> = ({
    showFormula, setShowFormula, authUser, houseName, onLoginClick, onDataEntryClick, onLogout, theme, onToggleTheme
}) => {
    return (
        <div className="mb-7">
            <div className="flex items-baseline justify-between flex-wrap gap-4 pb-5">
            <div>
                <h1
                    className="font-serif text-[22px] md:text-[26px] font-semibold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                >
                    tdJamaat
                </h1>
                <p className="text-[12.5px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Үйлөр боюнча рейтинг системасы — жааматтын ишмердүүлүгүн талдоо
                </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <a
                    href="https://addua.vercel.app/"
                    target="_blank"
                    rel="noreferrer"
                    style={ghostBtn}
                >
                    Санарип тасбихат <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button onClick={() => setShowFormula(!showFormula)} style={ghostBtn}>
                    <Info className="w-3.5 h-3.5" /> Формула
                </button>

                <ThemeToggle theme={theme} onToggle={onToggleTheme} />

                {authUser ? (
                    <>
                        <span
                            className="hidden sm:inline-flex items-center gap-1.5"
                            style={{ ...ghostBtn, color: 'var(--text-secondary)' }}
                        >
                            {authUser.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Home className="w-3.5 h-3.5" />}
                            {authUser.role === 'admin' ? 'Админ' : houseName ?? 'Үй жетекчиси'}
                        </span>
                        <button onClick={onDataEntryClick} style={fillBtn}>
                            <Settings className="w-3.5 h-3.5" /> Маалымат кошуу
                        </button>
                        <button onClick={onLogout} style={{ ...ghostBtn, color: '#a4453f' }}>
                            <LogOut className="w-3.5 h-3.5" /> Чыгуу
                        </button>
                    </>
                ) : (
                    <button onClick={onLoginClick} style={outlineBtn}>
                        <LogIn className="w-3.5 h-3.5" /> Кирүү
                    </button>
                )}
            </div>
            </div>
            <OrnamentDivider />
        </div>
    );
};
