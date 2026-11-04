import type React from 'react';
import { Award, CalendarDays, Home, TrendingUp, Users } from 'lucide-react';
import { t } from '../i18n';

// Five tabs, from the most immediate to the widest view:
//   this week → one house → the season so far → awards → the whole community.
export type ActiveView = 'overview' | 'teams' | 'season' | 'awards' | 'community';

export const TABS: { key: ActiveView; label: string; short: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
    { key: 'overview', label: t('Апта'), short: t('Апта'), icon: CalendarDays },
    { key: 'teams', label: t('Үйлөр'), short: t('Үйлөр'), icon: Home },
    { key: 'season', label: t('Сезон'), short: t('Сезон'), icon: TrendingUp },
    { key: 'awards', label: t('Сыйлыктар'), short: t('Сыйлык'), icon: Award },
    { key: 'community', label: t('Жамаат'), short: t('Жамаат'), icon: Users }
];

/** Old addresses (#/progress, #/reports) open the Season tab. */
export const LEGACY_VIEWS: Record<string, ActiveView> = { progress: 'season', reports: 'season' };
