// The frame around every open page. On a phone: a way back, the page's name,
// language and theme. On a wide screen: the mark, the sections as a row of
// links, and the entrance to the results — a site, not a stretched phone.
import React, { useContext } from 'react';
import { ArrowLeft, LogIn, Moon, Sun, Trophy } from 'lucide-react';
import { Mark } from '../components/Ornament';
import { isEnglish, setLang, t } from '../i18n';
import type { Theme } from '../theme';
import { go, parsePublic } from './route';
import { SignedInContext, useHome } from './signedIn';


type Width = 'read' | 'wide' | 'full';
const WIDTH: Record<Width, string> = { read: 'max-w-[44rem]', wide: 'max-w-[64rem]', full: 'max-w-[76rem]' };

const SECTIONS: Array<{ page: string; hash: string; label: () => string }> = [
    { page: 'quran', hash: '#/quran', label: () => t('Куран') },
    { page: 'tasbihat', hash: '#/tasbihat', label: () => t('Тасбихат') },
    { page: 'zikr', hash: '#/zikr', label: () => t('Зикир') },
    { page: 'namaz', hash: '#/namaz', label: () => t('Намаз') }
];

export const PublicFrame: React.FC<{
    /** the page's name (phone header, and the heading on a wide screen) */
    title?: string;
    /** where the back arrow leads; '' = the start; undefined = this is the start */
    back?: string;
    theme: Theme;
    onToggleTheme: () => void;
    width?: Width;
    /** no heading on a wide screen (the page draws its own) */
    plain?: boolean;
    children: React.ReactNode;
}> = ({ title, back, theme, onToggleTheme, width = 'read', plain, children }) => {
    const signedIn = useContext(SignedInContext);
    const home = useHome();
    const here = parsePublic(window.location.hash)?.page ?? 'home';
    const backTo = back === '' ? home : back;
    const quiet = 'transition-colors hover:text-[var(--gold)]';
    return (
        <div className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: 'var(--page-plane)', color: 'var(--text-primary)' }}>
            <header className="page-gutter sticky top-0 z-30" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', backgroundColor: 'color-mix(in oklab, var(--page-plane) 92%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
                <div className="mx-auto max-w-[76rem] flex items-center gap-2 h-14 lg:h-16">
                    {backTo !== undefined && (
                        <button onClick={() => go(backTo)} aria-label={t('Артка')} className={`lg:hidden w-10 h-10 -ml-2 inline-flex items-center justify-center ${quiet}`} style={{ color: 'var(--text-secondary)' }}>
                            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
                        </button>
                    )}
                    <button onClick={() => go('#/home')} aria-label="tdJamaat" className={`${backTo !== undefined ? 'hidden lg:flex' : 'flex'} items-center gap-2.5`} style={{ color: 'var(--gold)' }}>
                        <Mark size={36} solid /><span className="font-display text-[1.35rem] leading-none">tdJamaat</span>
                    </button>
                    {backTo !== undefined && <h1 className="lg:hidden flex-1 min-w-0 truncate font-display text-[1.3rem]" style={{ color: 'var(--text-primary)' }}>{title}</h1>}
                    {backTo === undefined && <span className="flex-1 lg:hidden" />}
                    <nav className="hidden lg:flex flex-1 items-stretch justify-center gap-9 self-stretch" aria-label={t('Бөлүмдөр')}>
                        {SECTIONS.map(s => (
                            <a key={s.page} href={s.hash} aria-current={here === s.page ? 'page' : undefined} className="public-nav">{s.label()}</a>
                        ))}
                    </nav>
                    <button onClick={() => setLang(isEnglish() ? 'ky' : 'en')} lang={isEnglish() ? 'ky' : 'en'} aria-label={isEnglish() ? 'Кыргызча' : 'English'} className={`h-10 min-w-10 px-1.5 text-[0.72rem] font-semibold tracking-[0.14em] ${quiet}`} style={{ color: 'var(--text-secondary)' }}>{isEnglish() ? 'КЫР' : 'EN'}</button>
                    <button onClick={onToggleTheme} aria-label={theme === 'dark' ? t('Жарык тема') : t('Караңгы тема')} className={`w-10 h-10 inline-flex items-center justify-center ${quiet}`} style={{ color: 'var(--text-secondary)' }}>
                        {theme === 'dark' ? <Sun className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} /> : <Moon className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} />}
                    </button>
                    {/* The entrance to the results: always in sight on a wide screen, and on the front door of a phone. */}
                    <button onClick={() => go(signedIn ? '#/overview' : '#/login')} className={`btn btn-ghost ml-1 ${backTo !== undefined ? 'hidden lg:inline-flex' : 'inline-flex'}`} style={{ minHeight: '2.5rem', borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                        {signedIn ? <Trophy className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}{signedIn ? t('Жыйынтыктар') : t('Кирүү')}
                    </button>
                </div>
            </header>
            <main className={`page-gutter flex-1 w-full mx-auto ${WIDTH[width]}`} style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
                {title && !plain && (
                    <div className="hidden lg:block pt-10 pb-2">
                        {backTo !== undefined && backTo !== home && (
                            <button onClick={() => go(backTo)} className={`inline-flex items-center gap-2 text-[0.72rem] tracking-[0.16em] uppercase mb-3 ${quiet}`} style={{ color: 'var(--text-muted)' }}><ArrowLeft className="w-3.5 h-3.5" />{t('Артка')}</button>
                        )}
                        <h1 className="font-display text-[2.6rem] leading-tight" style={{ color: 'var(--text-primary)' }}>{title}</h1>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
};
