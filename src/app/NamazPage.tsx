// #/namaz — the prayer times as a page of their own: today, the next prayer,
// the week ahead, the city, and the way to the Qibla.
import React from 'react';
import { Compass } from 'lucide-react';
import type { Theme } from '../theme';
import { t } from '../i18n';
import { AppFrame } from './AppFrame';
import { PrayerTimetable } from '../components/PrayerSheet';
import { go } from './route';

export const NamazPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => (
    <AppFrame page="today" title={t('Намаз убактылары')} kicker={t('Бүгүн жана жуманын калганы')} theme={theme} onToggleTheme={onToggleTheme}>
        <div className="max-w-[38rem] mx-auto pt-6">
            <PrayerTimetable />
            <button onClick={() => go('#/qibla')} className="row-link w-full mt-8 py-4 flex items-center gap-4 text-left" style={{ borderTop: '1px solid var(--gold-dim)', borderBottom: '1px solid var(--border)' }}>
                <Compass className="w-6 h-6 flex-shrink-0" strokeWidth={1.3} style={{ color: 'var(--gold)' }} />
                <span className="flex-1">
                    <span className="block font-display text-[1.3rem]" style={{ color: 'var(--text-primary)' }}>{t('Кыбла')}</span>
                    <span className="block text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>{t('Кааба кайсы тарапта — компас менен')}</span>
                </span>
            </button>
        </div>
    </AppFrame>
);
