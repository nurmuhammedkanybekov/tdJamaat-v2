// The frame around every open page: the mark, a way back, language and theme.
import React from 'react';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { Mark } from '../components/Ornament';
import { isEnglish, setLang, t } from '../i18n';
import type { Theme } from '../theme';
import { go } from './route';

export const PublicFrame: React.FC<{ title?: string; back?: string; theme: Theme; onToggleTheme: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, back, theme, onToggleTheme, children, wide }) => (
    <div className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: 'var(--page-plane)', color: 'var(--text-primary)' }}>
        <header className="page-gutter sticky top-0 z-30" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', backgroundColor: 'color-mix(in oklab, var(--page-plane) 92%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: title ? '1px solid var(--border)' : undefined }}>
            <div className={`mx-auto flex items-center gap-2 h-14 ${wide ? 'max-w-[60rem]' : 'max-w-[40rem]'}`}>
                {back !== undefined ? (
                    <button onClick={() => go(back)} aria-label={t('Артка')} className="w-10 h-10 -ml-2 inline-flex items-center justify-center transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-secondary)' }}>
                        <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                ) : (
                    <span className="flex items-center gap-2.5" style={{ color: 'var(--gold)' }}><Mark size={34} solid /><span className="font-display text-[1.3rem] leading-none">tdJamaat</span></span>
                )}
                <h1 className="flex-1 min-w-0 truncate font-display text-[1.35rem]" style={{ color: 'var(--text-primary)' }}>{title}</h1>
                <button onClick={() => setLang(isEnglish() ? 'ky' : 'en')} lang={isEnglish() ? 'ky' : 'en'} aria-label={isEnglish() ? 'Кыргызча' : 'English'} className="h-10 min-w-10 px-1.5 text-[0.72rem] font-semibold tracking-[0.16em] transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-secondary)' }}>{isEnglish() ? 'КЫР' : 'EN'}</button>
                <button onClick={onToggleTheme} aria-label={theme === 'dark' ? t('Жарык тема') : t('Караңгы тема')} className="w-10 h-10 inline-flex items-center justify-center transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-secondary)' }}>
                    {theme === 'dark' ? <Sun className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} /> : <Moon className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} />}
                </button>
            </div>
        </header>
        <main className={`page-gutter flex-1 w-full mx-auto ${wide ? 'max-w-[63rem]' : 'max-w-[43rem]'}`} style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
            {children}
        </main>
    </div>
);
