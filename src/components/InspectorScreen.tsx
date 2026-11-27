// The Тазалык inspector's whole website: rate every house's cleanliness for a
// week. The inspector sees no results (the database shows them none).
import React from 'react';
import { LogOut, Moon, Sun } from 'lucide-react';
import { Mark } from './Ornament';
import { HornBand } from './motion';
import { TazalykPanel } from './TazalykPanel';
import { signOut } from '../services/authService';
import { t } from '../i18n';
import { LangSwitch } from './LangSwitch';
import type { Theme } from '../theme';

export const InspectorScreen: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const quiet = 'w-10 h-10 inline-flex items-center justify-center transition-colors hover:text-[var(--gold)]';
    return (
        <div className="min-h-[100dvh] page-gutter" style={{ backgroundColor: 'var(--page-plane)', paddingTop: 'max(0.5rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
            <div className="mx-auto max-w-[40rem]">
                <header className="flex items-center gap-2 h-16">
                    <span className="flex items-center gap-2.5 flex-1 min-w-0" style={{ color: 'var(--gold)' }}><Mark size={38} solid /><span className="font-display text-[1.35rem] leading-none">tdJamaat</span></span>
                    <LangSwitch className={`${quiet} text-[0.72rem] font-semibold tracking-[0.16em]`} style={{ color: 'var(--text-secondary)' }} />
                    <button onClick={onToggleTheme} aria-label={theme === 'dark' ? t('Жарык тема') : t('Караңгы тема')} className={quiet} style={{ color: 'var(--text-secondary)' }}>
                        {theme === 'dark' ? <Sun className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} /> : <Moon className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} />}
                    </button>
                    <button onClick={() => signOut()} aria-label={t('Чыгуу')} className={quiet} style={{ color: 'var(--text-secondary)' }}><LogOut className="w-[1.1rem] h-[1.1rem]" strokeWidth={1.5} /></button>
                </header>
                <div className="text-center pt-6 pb-2">
                    <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Тазалык текшерүүчү')}</div>
                    <h1 className="font-display text-[2.6rem] leading-tight mt-2" style={{ color: 'var(--text-primary)' }}>{t('Тазалык')}</h1>
                    <p className="text-[0.92rem] mt-2 max-w-[28rem] mx-auto" style={{ color: 'var(--text-muted)' }}>{t('Ар бир пунктту 0дөн 5ке чейин баалаңыз. Үй эң көп 25 упай алат.')}</p>
                </div>
                <HornBand className="my-6" />
                <TazalykPanel canEdit isAdmin={false} />
            </div>
        </div>
    );
};
