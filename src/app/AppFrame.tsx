// The frame of the everyday pages (Бүгүн, Куран, Тасбихат, Зикир): the same
// wordmark, crown and border of ram's horns as the results, the page's name
// under them, and the sections as text tabs (wide screen) or a bar within
// thumb reach (phone). The last section is the results themselves.
import React, { useContext, useState } from 'react';
import { ArrowLeft, BookOpen, CircleDot, Moon, ScrollText, Sun, SunMedium, Trophy, UserRound, Home as HomeIcon } from 'lucide-react';
import { Crown, Mark } from '../components/Ornament';
import { HornBand, SkyLayer, StarField } from '../components/motion';
import { useNow } from '../hooks/useNow';
import { loadCity } from '../utils/city';
import { skyAt } from '../utils/sky';
import { isEnglish, setLang, t } from '../i18n';
import type { Theme } from '../theme';
import type { AppPage } from './route';
import { go } from './route';
import { AppContext } from './context';
import { useSelf, useUnread } from './self';
import { AccountMark, AccountSheet } from './AccountSheet';

const SECTIONS: Array<{ page: AppPage | 'results'; label: () => string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }> = [
    { page: 'today', label: () => t('Күнүм'), icon: SunMedium },
    { page: 'quran', label: () => t('Куран'), icon: BookOpen },
    { page: 'tasbihat', label: () => t('Тасбихат'), icon: ScrollText },
    { page: 'zikr', label: () => t('Зикир'), icon: CircleDot },
    { page: 'results', label: () => t('Жыйынтык'), icon: Trophy }
];

const quiet = 'transition-colors hover:text-[var(--gold)]';

export const AppFrame: React.FC<{
    page: AppPage;
    /** The page's name. */
    title: string;
    /** The small gold line above it. */
    kicker?: string;
    /** A line under the title. */
    sub?: React.ReactNode;
    /** A reading page: a slim bar with a way back, no crown — the text starts at once. */
    back?: string;
    theme: Theme;
    onToggleTheme: () => void;
    /** Leave room at the bottom for the page's own bar (reader controls). */
    ownBar?: boolean;
    /** A full hero in place of the page's name (the first page): the sun or moon is drawn on the sky. */
    hero?: React.ReactNode;
    children: React.ReactNode;
}> = ({ page, title, kicker, sub, back, theme, onToggleTheme, ownBar, hero, children }) => {
    const { signedIn, member } = useContext(AppContext);
    const now = useNow(60_000);
    const sky = skyAt(loadCity(), now);
    const { self } = useSelf();
    const [account, setAccount] = useState(false);
    const unread = useUnread(self);
    const linked = member?.status === 'linked' ? member.link : null;
    // The last section follows who is here: the results (captain, admin), the
    // member's own house, or the way in.
    const sections = SECTIONS.map(x => (x.page !== 'results' ? x
        : signedIn ? x
            : linked ? { page: 'house' as const, label: () => t('Үйүм'), icon: HomeIcon }
                : { page: 'results' as const, label: () => t('Кирүү'), icon: UserRound }));
    const ThemeIcon = theme === 'dark' ? Sun : Moon;
    const open = (p: AppPage | 'results') => go(p === 'results' ? '#/overview' : `#/${p}`);
    return (
        <div className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: 'var(--page-plane)', color: 'var(--text-primary)' }}>
            <header className={`hero page-gutter ${hero ? 'app-hero' : ''}`} style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
                {/* The same sky as the results: tinted by the hour, stars at night. */}
                <SkyLayer phase={sky.phase} body={hero ? sky.body : undefined} progress={sky.progress} />
                {hero && (sky.phase === 'night' || sky.phase === 'sunset' || sky.phase === 'dawn') && <StarField />}
                <div className="app-container">
                    <div className="flex items-center gap-2 h-16">
                        {back !== undefined && (
                            <button onClick={() => go(back)} aria-label={t('Артка')} className={`w-10 h-10 -ml-2 inline-flex items-center justify-center ${quiet}`} style={{ color: 'var(--text-secondary)' }}>
                                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
                            </button>
                        )}
                        <button onClick={() => go('#/today')} aria-label="tdJamaat" className={`${back !== undefined ? 'hidden sm:flex' : 'flex'} items-center gap-2.5 min-w-0`} style={{ color: 'var(--gold)' }}>
                            <Mark size={40} solid />
                            <span className="font-display text-[1.45rem] leading-none tracking-[0.02em]">tdJamaat</span>
                        </button>
                        {back !== undefined && <h1 className="sm:hidden flex-1 min-w-0 truncate font-display text-[1.3rem]" style={{ color: 'var(--text-primary)' }}>{title}</h1>}
                        <span className={back !== undefined ? 'hidden sm:block flex-1' : 'flex-1'} />
                        {/* Who is here: the results for a captain or the admin; a member's
                            own initial; otherwise the way in. */}
                        {signedIn ? (
                            <span className="hidden md:inline-flex mr-1">
                                <button onClick={() => open('results')} className="btn btn-ghost" style={{ minHeight: '2.5rem' }}><Trophy className="w-3.5 h-3.5" />{t('Жыйынтыктар')}</button>
                            </span>
                        ) : !linked && (
                            <button onClick={() => go('#/overview')} className="signin-pill">
                                <UserRound className="w-4 h-4" strokeWidth={1.5} /><span>{t('Кирүү')}</span>
                            </button>
                        )}
                        <button onClick={() => setLang(isEnglish() ? 'ky' : 'en')} lang={isEnglish() ? 'ky' : 'en'} aria-label={isEnglish() ? 'Кыргызча' : 'English'} className={`h-10 min-w-10 px-1.5 inline-flex items-center justify-center text-[0.72rem] font-semibold tracking-[0.16em] ${quiet}`} style={{ color: 'var(--text-secondary)' }}>
                            {isEnglish() ? 'КЫР' : 'EN'}
                        </button>
                        <button onClick={onToggleTheme} aria-label={theme === 'dark' ? t('Жарык тема') : t('Караңгы тема')} className={`w-10 h-10 inline-flex items-center justify-center ${quiet}`} style={{ color: 'var(--text-secondary)' }}>
                            <ThemeIcon className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} />
                        </button>
                        {/* The menu: three lines and the person's face. Every page, named plainly. */}
                        {(signedIn || linked) && <AccountMark onClick={() => setAccount(true)} />}
                    </div>
                    {back === undefined && hero}
                    {back === undefined && !hero && (
                        <div className="monument is-compact flex flex-col items-center text-center pt-1 sm:pt-4 pb-6 sm:pb-8">
                            <Crown className="draw-in h-auto w-[min(10rem,46%)] sm:w-[min(12rem,50%)]" style={{ color: 'var(--gold)' }} />
                            {kicker && <div className="eyebrow mt-3" style={{ color: 'var(--gold)' }}>{kicker}</div>}
                            <h1 className="font-display leading-none mt-3 text-[2.3rem] sm:text-[3rem]" style={{ color: 'var(--text-primary)' }}>{title}</h1>
                            {sub && <div className="mt-3 text-[0.9rem]" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
                        </div>
                    )}
                    {back === undefined && <HornBand className="mb-1" />}
                </div>
            </header>

            {/* Wide screen: the sections as letterspaced text tabs. */}
            <nav className="hidden md:block sticky top-0 z-30 page-gutter" aria-label={t('Бөлүмдөр')} style={{ backgroundColor: 'color-mix(in oklab, var(--page-plane) 90%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div className="app-container flex justify-center gap-2 lg:gap-6">
                    {sections.map(s => {
                        const active = s.page === page;
                        return (
                            <button key={s.page} data-section={s.page} onClick={() => open(s.page)} aria-current={active ? 'page' : undefined} className="relative whitespace-nowrap px-3 py-4 text-[0.68rem] tracking-[0.26em] uppercase transition-colors hover:text-[var(--text-primary)]" style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}>
                                {s.label()}
                                {active && <span aria-hidden="true" className="absolute left-3 right-3 bottom-[-1px] h-[2px]" style={{ backgroundColor: 'var(--gold)' }} />}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <main className="page-gutter flex-1 w-full" style={{ paddingBottom: ownBar ? '9rem' : 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
                <div className="app-container">{children}</div>
            </main>

            {/* Phone: the same sections in a bar at the bottom. */}
            {!ownBar && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40" aria-label={t('Бөлүмдөр')} style={{ backgroundColor: 'color-mix(in oklab, var(--page-plane) 94%, transparent)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}>
                        {sections.map(({ page: p, label, icon: Icon }) => {
                            const active = p === page;
                            return (
                                <button key={p} data-section={p} onClick={() => open(p)} aria-current={active ? 'page' : undefined} className="relative flex flex-col items-center justify-center gap-1.5 pt-3 pb-2.5 min-h-[3.6rem] transition-[color,transform] duration-200 active:scale-[0.94]" style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}>
                                    {active && <span aria-hidden="true" className="absolute top-[-1px] left-1/2 -translate-x-1/2 h-px w-8" style={{ backgroundColor: 'var(--gold)', boxShadow: '0 0 10px var(--gold)' }} />}
                                    <span className="relative"><Icon className="w-[1.2rem] h-[1.2rem]" strokeWidth={1.3} />{p === 'house' && unread > 0 && <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--gold)', boxShadow: '0 0 0 2px var(--page-plane)' }} aria-label={t('{0} жаңы билдирүү', unread)} />}</span>
                                    <span className="text-[0.54rem] min-[360px]:text-[0.58rem] tracking-[0.02em] min-[360px]:tracking-[0.08em] min-[400px]:tracking-[0.14em] uppercase leading-none max-w-full truncate">{label()}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>
            )}
            {account && <AccountSheet onClose={() => setAccount(false)} />}
        </div>
    );
};

/** A section of an everyday page: a gold eyebrow and a hairline, nothing boxed. */
export const Section: React.FC<{ eyebrow: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ eyebrow, action, children, className = '' }) => (
    <section className={`pt-8 ${className}`}>
        <div className="flex items-baseline justify-between gap-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="eyebrow" style={{ color: 'var(--gold)' }}>{eyebrow}</h2>
            {action}
        </div>
        {children}
    </section>
);

export const Problem: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
    <div className="text-center py-16">
        <p style={{ color: 'var(--text-secondary)' }}>{t('Жүктөлгөн жок. Интернетти текшериңиз.')}</p>
        <button className="btn btn-ghost mt-4" onClick={onRetry}>{t('Кайра аракет кылуу')}</button>
    </div>
);

export const Waiting: React.FC = () => <div className="py-20 flex justify-center" aria-busy="true"><div className="skeleton h-1 w-24" /></div>;
