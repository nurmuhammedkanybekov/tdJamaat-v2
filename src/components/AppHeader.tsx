import React, { useEffect, useRef, useState } from 'react';
import {
    ChevronLeft, ChevronRight, Download, ExternalLink, History, Home, Info, Lock, LogIn, LogOut,
    Menu, Moon, PenLine, Settings2, Share2, ShieldCheck, Sun
} from 'lucide-react';
import type { AuthUser } from '../services/authService';
import type { Theme } from '../theme';
import type { InstallMode } from '../pwa';

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
    seasonLabel?: string;
    /** Right-hand side of the hero (summary figures). */
    aside?: React.ReactNode;
}

type MenuItem = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void; href?: string; tone?: 'danger' };

const Logo: React.FC<{ size?: number }> = ({ size = 40 }) => (
    <img src="/favicon.svg" alt="" width={size} height={size} className="flex-shrink-0" style={{ borderRadius: size * 0.22, boxShadow: '0 0 0 1px rgba(233,205,150,0.25), 0 6px 18px -6px rgba(0,0,0,0.5)' }} />
);

// Dropdown that also works as a phone menu: anchored under its button,
// closes on outside tap or Escape.
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
                    className="absolute right-0 mt-2 z-40 w-[16.5rem] max-w-[calc(100vw-2rem)] py-1.5 animate-fade-up"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lift)', color: 'var(--text-primary)' }}
                >
                    {header && <div className="px-4 pt-2 pb-2.5 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>{header}</div>}
                    {items.map(item => {
                        const content = (
                            <>
                                <item.icon className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.href && <ExternalLink className="w-3.5 h-3.5 opacity-60" />}
                            </>
                        );
                        const cls = 'w-full flex items-center gap-3 px-4 py-2.5 text-[0.88rem] font-bold transition-colors hover:bg-[var(--surface-2)]';
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

export const AppHeader: React.FC<AppHeaderProps> = ({
    authUser, houseName, theme, onToggleTheme, onLogin, onLogout, onDataEntry, onFormula, onAdmin, onHistory, onShare,
    installMode, onInstall, week, seasonLabel, aside
}) => {
    const isAdmin = authUser?.role === 'admin';
    const who = isAdmin ? 'Админ' : houseName ?? 'Үй жетекчиси';

    const common: MenuItem[] = [
        { key: 'tasbih', label: 'Санарип тасбихат', icon: ExternalLink, href: 'https://addua.vercel.app/' },
        { key: 'formula', label: 'Упай формуласы', icon: Info, onClick: onFormula },
        { key: 'share', label: 'Жыйынтыкты бөлүшүү', icon: Share2, onClick: onShare },
        ...(installMode !== 'none' ? [{ key: 'install', label: 'Телефонго орнотуу', icon: Download, onClick: onInstall }] : [])
    ];
    const signedIn: MenuItem[] = authUser ? [
        { key: 'entry', label: 'Маалымат кошуу', icon: PenLine, onClick: onDataEntry },
        { key: 'history', label: 'Өзгөртүүлөр тарыхы', icon: History, onClick: onHistory },
        ...(isAdmin ? [{ key: 'admin', label: 'Админ панели', icon: Settings2, onClick: onAdmin }] : []),
        { key: 'logout', label: 'Чыгуу', icon: LogOut, onClick: onLogout, tone: 'danger' as const }
    ] : [];

    const ThemeIcon = theme === 'dark' ? Sun : Moon;

    return (
        <header className="hero page-gutter" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
            <div className="app-container">
                {/* Brand row */}
                <div className="flex items-center gap-3 py-3 sm:py-4">
                    <Logo size={42} />
                    <div className="min-w-0 flex-1">
                        <div className="font-display font-bold leading-none text-[1.7rem] sm:text-[1.95rem]" style={{ color: 'var(--hero-ink)', letterSpacing: '0.01em' }}>tdJamaat</div>
                        <p className="text-[0.72rem] sm:text-[0.8rem] mt-1 leading-snug line-clamp-2" style={{ color: 'var(--hero-muted)' }}>
                            Жамааттын активдүүлүгүн талдоого багытталган үйлөрдүн рейтинги
                        </p>
                    </div>

                    {/* Desktop actions */}
                    <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                        <a href="https://addua.vercel.app/" target="_blank" rel="noreferrer" className="btn btn-hero">
                            Санарип тасбихат <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                        </a>
                        <button onClick={onFormula} className="btn btn-hero"><Info className="w-4 h-4" /> Формула</button>
                        <button onClick={onShare} className="btn btn-hero btn-icon" aria-label="Жыйынтыкты бөлүшүү" title="Жыйынтыкты бөлүшүү"><Share2 className="w-4 h-4" /></button>
                        {installMode !== 'none' && (
                            <button onClick={onInstall} className="btn btn-hero btn-icon" aria-label="Телефонго орнотуу" title="Тиркеме катары орнотуу"><Download className="w-4 h-4" /></button>
                        )}
                        <button onClick={onToggleTheme} className="btn btn-hero btn-icon" aria-label={theme === 'dark' ? 'Жарык тема' : 'Караңгы тема'} title={theme === 'dark' ? 'Жарык тема' : 'Караңгы тема'}>
                            <ThemeIcon className="w-4 h-4" />
                        </button>
                        {authUser ? (
                            <>
                                <button onClick={onDataEntry} className="btn btn-gold"><PenLine className="w-4 h-4" /> Маалымат кошуу</button>
                                <Dropdown
                                    items={signedIn.filter(i => i.key !== 'entry')}
                                    header={<div className="text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>Кирген: <b style={{ color: 'var(--text-primary)' }}>{who}</b></div>}
                                    button={(open, toggle) => (
                                        <button onClick={toggle} aria-expanded={open} className="btn btn-hero">
                                            {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                                            <span className="max-w-[9rem] truncate">{who}</span>
                                        </button>
                                    )}
                                />
                            </>
                        ) : (
                            <button onClick={onLogin} className="btn btn-gold"><LogIn className="w-4 h-4" /> Кирүү</button>
                        )}
                    </div>

                    {/* Phone / tablet actions */}
                    <div className="flex lg:hidden items-center gap-1.5 flex-shrink-0">
                        <button onClick={onToggleTheme} className="btn btn-hero btn-icon" aria-label={theme === 'dark' ? 'Жарык тема' : 'Караңгы тема'}>
                            <ThemeIcon className="w-4 h-4" />
                        </button>
                        <Dropdown
                            items={[...signedIn.filter(i => i.key !== 'logout'), ...common, ...(authUser ? signedIn.filter(i => i.key === 'logout') : [{ key: 'login', label: 'Кирүү', icon: LogIn, onClick: onLogin }])]}
                            header={authUser ? <div className="text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>Кирген: <b style={{ color: 'var(--text-primary)' }}>{who}</b></div> : undefined}
                            button={(open, toggle) => (
                                <button onClick={toggle} aria-expanded={open} aria-label="Меню" className="btn btn-hero btn-icon"><Menu className="w-4.5 h-4.5" /></button>
                            )}
                        />
                    </div>
                </div>

                {/* Week + summary */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 pt-5 sm:pt-8 pb-8 sm:pb-12">
                    <div className="min-w-0">
                        {week ? (
                            <>
                                <div className="eyebrow flex items-center gap-2" style={{ color: 'var(--gold-bright)' }}>
                                    Апталык рейтинг
                                    {week.isLatest && <span className="px-1.5 py-[1px] rounded text-[0.6rem]" style={{ background: 'rgba(233,205,150,0.16)', color: 'var(--hero-ink)' }}>акыркы</span>}
                                    {week.locked && <span className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[0.6rem]" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--hero-ink)' }}><Lock className="w-2.5 h-2.5" /> кулпуланган</span>}
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4 mt-2">
                                    <button onClick={week.onPrev} disabled={!week.canPrev} aria-label="Мурунку апта" className="btn btn-hero btn-icon rounded-full disabled:opacity-25 disabled:cursor-not-allowed">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h1 className="font-display font-bold leading-none tabular text-[3rem] sm:text-[3.8rem] lg:text-[4.4rem]" style={{ color: 'var(--hero-ink)' }} aria-live="polite">
                                        {week.number}<span className="text-[0.5em] font-semibold ml-1.5" style={{ color: 'var(--hero-muted)' }}>-апта</span>
                                    </h1>
                                    <button onClick={week.onNext} disabled={!week.canNext} aria-label="Кийинки апта" className="btn btn-hero btn-icon rounded-full disabled:opacity-25 disabled:cursor-not-allowed">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                                {week.date && <div className="text-[0.8rem] mt-2" style={{ color: 'var(--hero-muted)' }}>{week.date.replace(' -- ', ' — ')}</div>}
                            </>
                        ) : (
                            <>
                                <div className="eyebrow" style={{ color: 'var(--gold-bright)' }}>Сезон 2026–27</div>
                                <h1 className="font-display font-bold leading-none mt-2 text-[2.6rem] sm:text-[3.4rem] lg:text-[4rem]" style={{ color: 'var(--hero-ink)' }}>{seasonLabel}</h1>
                            </>
                        )}
                        {authUser && (
                            <button onClick={onDataEntry} className="btn btn-gold mt-5 lg:hidden"><PenLine className="w-4 h-4" /> Маалымат кошуу</button>
                        )}
                    </div>
                    {aside && <div className="min-w-0 md:max-w-[60%]">{aside}</div>}
                </div>
            </div>
            <div className="horn-band absolute left-0 right-0 bottom-3 opacity-25" aria-hidden="true" />
        </header>
    );
};
