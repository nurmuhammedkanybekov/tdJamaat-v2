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

// Layout (size, padding, display) lives in classes so it can change per
// breakpoint — it used to be inline styles, which silently beat Tailwind's
// responsive classes (that's why the "Админ" chip never hid on phones).
// Buttons are 40px tall on phones: a comfortable thumb target.
const btn = 'inline-flex items-center justify-center gap-1.5 sm:gap-2 min-h-10 sm:min-h-0 px-3 sm:px-3.5 py-2 text-[12.5px] font-semibold rounded-[3px] transition-colors whitespace-nowrap';

const ghostStyle: React.CSSProperties = { border: '1px solid var(--border)', color: 'var(--text-secondary)', letterSpacing: '0.01em' };
const outlineStyle: React.CSSProperties = { border: '1px solid var(--text-primary)', color: 'var(--text-primary)', letterSpacing: '0.02em' };
const fillStyle: React.CSSProperties = { border: '1px solid var(--accent)', color: '#ffffff', backgroundColor: 'var(--accent)', letterSpacing: '0.02em' };

export const Header: React.FC<HeaderProps> = ({
    showFormula, setShowFormula, authUser, houseName, onLoginClick, onDataEntryClick, onLogout, theme, onToggleTheme
}) => {
    return (
        <div className="mb-6 sm:mb-7">
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 pb-5">
                <div className="min-w-0">
                    <h1
                        className="font-serif text-[24px] md:text-[26px] font-semibold tracking-tight leading-tight"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        tdJamaat
                    </h1>
                    <p className="text-[12.5px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        Жамааттын активдүүлүгүн талдоого багытталган үйлөрдүн рейтинги
                    </p>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap xl:flex-nowrap">
                    <a href="https://addua.vercel.app/" target="_blank" rel="noreferrer" className={btn} style={ghostStyle}>
                        Санарип тасбихат <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                        onClick={() => setShowFormula(!showFormula)}
                        className={btn}
                        style={ghostStyle}
                        aria-label="Формула"
                        aria-expanded={showFormula}
                    >
                        <Info className="w-3.5 h-3.5" /><span className="hidden min-[400px]:inline">Формула</span>
                    </button>

                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />

                    {authUser ? (
                        <>
                            {/* Break to a new row on phones so the signed-in actions
                                stay together instead of wrapping one by one. */}
                            <span className="basis-full h-0 sm:hidden" aria-hidden="true" />
                            <span className={`${btn} cursor-default`} style={{ ...ghostStyle, borderStyle: 'dashed' }}>
                                {authUser.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Home className="w-3.5 h-3.5" />}
                                {authUser.role === 'admin' ? 'Админ' : houseName ?? 'Үй жетекчиси'}
                            </span>
                            <button onClick={onDataEntryClick} className={`${btn} flex-1 sm:flex-none`} style={fillStyle}>
                                <Settings className="w-3.5 h-3.5" /> Маалымат кошуу
                            </button>
                            <button onClick={onLogout} className={btn} style={{ ...ghostStyle, color: '#a4453f' }} aria-label="Чыгуу">
                                <LogOut className="w-3.5 h-3.5" /><span className="hidden min-[400px]:inline">Чыгуу</span>
                            </button>
                        </>
                    ) : (
                        <button onClick={onLoginClick} className={`${btn} ml-auto sm:ml-0`} style={outlineStyle}>
                            <LogIn className="w-3.5 h-3.5" /> Кирүү
                        </button>
                    )}
                </div>
            </div>
            <OrnamentDivider />
        </div>
    );
};
