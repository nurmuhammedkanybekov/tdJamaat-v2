import React, { useEffect, useRef, useState } from 'react';
import {
    ChevronLeft, ChevronRight, Download, ExternalLink, History, Info, Lock, LogIn, LogOut,
    Menu, Moon, PenLine, Settings2, Share2, Sun
} from 'lucide-react';
import type { AuthUser } from '../services/authService';
import type { Theme } from '../theme';
import type { InstallMode } from '../pwa';
import { Crown, Horn } from './Ornament';

interface AppHeaderProps {
    authUser: AuthUser | null;
    houseName: string | null;
    theme: Theme;
    onToggleTheme: () => void;
    onLogin: () => void;
    onLogout: () => void;
    onDataEntry: () => void;
    onFormula: () => void;
    onAdmin: () => void;
    onHistory: () => void;
    onShare: () => void;
    installMode: InstallMode;
    onInstall: () => void;
    /** Week switcher; omitted on season-wide views. */
    week?: { number: number; date: string; locked: boolean; canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void; isLatest: boolean };
    /** The big centered statement: who leads and by how much. */
    monument?: { kicker: string; title: string; value: string; sub: string };
    seasonLabel?: string;
    /** Name of the season on screen. */
    seasonName?: string;
    /** Season picker, shown when there is more than one season. */
    season?: { options: Array<{ id: number; name: string }>; selectedId: number; onChange: (id: number) => void };
}

type MenuItem = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void; href?: string; tone?: 'danger' };

// Dropdown anchored under its button; closes on outside tap or Escape.
const Dropdown: React.FC<{ button: (open: boolean, toggle: () => void) => React.ReactNode; items: MenuItem[]; header?: React.ReactNode }> = ({ button, items, header }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);
    return (
        <div ref={ref} className="relative">
            {button(open, () => setOpen(o => !o))}
            {open && (
                <div
                    role="menu"
                    className="absolute right-0 mt-2 z-40 w-[17rem] max-w-[calc(100vw-2rem)] py-2 animate-fade-in"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lift)' }}
                >
                    {header && <div className="px-5 pt-2 pb-3 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>{header}</div>}
                    {items.map(item => {
                        const content = (
                            <>
                                <item.icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.href && <ExternalLink className="w-3.5 h-3.5 opacity-50" />}
                            </>
                        );
                        const cls = 'w-full flex items-center gap-3.5 px-5 py-2.5 text-[0.95rem] transition-colors hover:text-[var(--gold)]';
                        const style = { color: item.tone === 'danger' ? 'var(--danger)' : 'var(--text-secondary)' };
                        return item.href ? (
                            <a key={item.key} role="menuitem" href={item.href} target="_blank" rel="noreferrer" className={cls} style={style} onClick={() => setOpen(false)}>{content}</a>
                        ) : (
                            <button key={item.key} role="menuitem" className={cls} style={style} onClick={() => { setOpen(false); item.onClick?.(); }}>{content}</button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const IconButton: React.FC<{ label: string; onClick: () => void; children: React.ReactNode; expanded?: boolean }> = ({ label, onClick, children, expanded }) => (
    <button onClick={onClick} aria-label={label} title={label} aria-expanded={expanded} className="w-10 h-10 inline-flex items-center justify-center transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-secondary)' }}>
        {children}
    </button>
);

export const AppHeader: React.FC<AppHeaderProps> = ({
    authUser, houseName, theme, onToggleTheme, onLogin, onLogout, onDataEntry, onFormula, onAdmin, onHistory, onShare,
    installMode, onInstall, week, monument, seasonLabel, seasonName, season
}) => {
    const isAdmin = authUser?.role === 'admin';
    const who = isAdmin ? 'Админ' : houseName ?? 'Үй жетекчиси';
    const ThemeIcon = theme === 'dark' ? Sun : Moon;

    const items: MenuItem[] = [
        ...(authUser ? [
            { key: 'entry', label: 'Маалымат кошуу', icon: PenLine, onClick: onDataEntry },
            { key: 'history', label: 'Өзгөртүүлөр тарыхы', icon: History, onClick: onHistory },
            ...(isAdmin ? [{ key: 'admin', label: 'Админ панели', icon: Settings2, onClick: onAdmin }] : [])
        ] : []),
        { key: 'formula', label: 'Упай формуласы', icon: Info, onClick: onFormula },
        { key: 'share', label: 'Жыйынтыкты бөлүшүү', icon: Share2, onClick: onShare },
        ...(installMode !== 'none' ? [{ key: 'install', label: 'Телефонго орнотуу', icon: Download, onClick: onInstall }] : []),
        { key: 'tasbih', label: 'Санарип тасбихат', icon: ExternalLink, href: 'https://addua.vercel.app/' },
        authUser
            ? { key: 'logout', label: 'Чыгуу', icon: LogOut, onClick: onLogout, tone: 'danger' as const }
            : { key: 'login', label: 'Кирүү', icon: LogIn, onClick: onLogin }
    ];

    return (
        <header className="hero page-gutter" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
            <div className="app-container">
                {/* Wordmark bar */}
                <div className="flex items-center gap-3 h-16">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0" style={{ color: 'var(--gold)' }}>
                        <Horn size={26} strokeWidth={3} />
                        <span className="font-display text-[1.45rem] leading-none tracking-[0.02em]">tdJamaat</span>
                    </div>
                    <div className="flex items-center">
                        {authUser && (
                            <button onClick={onDataEntry} className="btn btn-ghost hidden sm:inline-flex mr-2">
                                <PenLine className="w-3.5 h-3.5" /> Маалымат кошуу
                            </button>
                        )}
                        {!authUser && (
                            <button onClick={onLogin} className="hidden sm:inline-flex mr-1 px-3 h-10 items-center text-[0.7rem] tracking-[0.22em] uppercase transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-secondary)' }}>
                                Кирүү
                            </button>
                        )}
                        <IconButton label={theme === 'dark' ? 'Жарык тема' : 'Караңгы тема'} onClick={onToggleTheme}><ThemeIcon className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} /></IconButton>
                        <Dropdown
                            items={items}
                            header={authUser ? <div className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>Кирген: <span style={{ color: 'var(--gold)' }}>{who}</span></div> : undefined}
                            button={(open, toggle) => (
                                <IconButton label="Меню" onClick={toggle} expanded={open}><Menu className="w-[1.2rem] h-[1.2rem]" strokeWidth={1.5} /></IconButton>
                            )}
                        />
                    </div>
                </div>

                {/* Monument */}
                <div className="flex flex-col items-center text-center pt-6 sm:pt-10 pb-10 sm:pb-14">
                    <Crown className="draw-in w-[min(19rem,78%)] h-auto" style={{ color: 'var(--gold)' }} />

                    {season && (
                        <label className="relative mt-3 inline-flex items-center gap-2 eyebrow cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                            Сезон
                            <select
                                value={season.selectedId}
                                onChange={e => season.onChange(Number(e.target.value))}
                                aria-label="Сезонду тандоо"
                                className="appearance-none bg-transparent pr-4 outline-none cursor-pointer"
                                style={{ color: 'var(--gold)', letterSpacing: 'inherit', textTransform: 'inherit', font: 'inherit' }}
                            >
                                {season.options.map(o => <option key={o.id} value={o.id} style={{ color: '#141413' }}>{o.name}</option>)}
                            </select>
                            <ChevronRight className="w-3 h-3 rotate-90 absolute right-0 pointer-events-none" style={{ color: 'var(--gold)' }} />
                        </label>
                    )}

                    {week ? (
                        <div className="flex items-center gap-4 mt-3">
                            <button onClick={week.onPrev} disabled={!week.canPrev} aria-label="Мурунку апта" className="w-9 h-9 inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-20 hover:text-[var(--gold)]" style={{ border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}>
                                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                            <div className="eyebrow inline-flex items-center gap-2" style={{ color: 'var(--gold)' }} aria-live="polite">
                                {monument?.kicker ?? `${week.number}-апта`}
                                {week.locked && <Lock className="w-3 h-3" aria-label="кулпуланган" />}
                            </div>
                            <button onClick={week.onNext} disabled={!week.canNext} aria-label="Кийинки апта" className="w-9 h-9 inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-20 hover:text-[var(--gold)]" style={{ border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}>
                                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                        </div>
                    ) : (
                        !season && <div className="eyebrow mt-3" style={{ color: 'var(--gold)' }}>Сезон {seasonName ?? ''}</div>
                    )}

                    {monument ? (
                        <>
                            <h1 className="font-display leading-none mt-5 text-[2.4rem] sm:text-[3.2rem] lg:text-[3.6rem]" style={{ color: 'var(--text-primary)' }}>{monument.title}</h1>
                            <div className="font-display tabular leading-[0.9] mt-2 text-[5.2rem] sm:text-[7.5rem] lg:text-[9rem]" style={{ color: 'var(--gold)' }}>{monument.value}</div>
                            <p className="mt-3 text-[0.9rem] tracking-[0.04em]" style={{ color: 'var(--text-muted)' }}>{monument.sub}</p>
                        </>
                    ) : (
                        <h1 className="font-display leading-none mt-5 text-[2.6rem] sm:text-[3.4rem] lg:text-[4rem]" style={{ color: 'var(--text-primary)' }}>
                            {seasonLabel ?? (week ? `${week.number}-апта` : '')}
                        </h1>
                    )}
                    {week?.date && !monument && <p className="mt-3 text-[0.9rem]" style={{ color: 'var(--text-muted)' }}>{week.date.replace(' -- ', ' — ')}</p>}
                </div>
            </div>
        </header>
    );
};
