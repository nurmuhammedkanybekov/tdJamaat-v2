import type React from 'react';
import { Award, BarChart3, Home, LayoutDashboard, TrendingUp, Users } from 'lucide-react';
import { t } from '../i18n';

export type ActiveView = 'overview' | 'teams' | 'progress' | 'reports' | 'awards' | 'community';

export const TABS: { key: ActiveView; label: string; short: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
    { key: 'overview', label: t('Жалпы көрүнүш'), short: t('Жалпы'), icon: LayoutDashboard },
    { key: 'teams', label: t('Үй ичиндеги рейтинг'), short: t('Үйлөр'), icon: Home },
    { key: 'progress', label: t('Апталык прогресс'), short: t('Прогресс'), icon: TrendingUp },
    { key: 'reports', label: t('Отчеттор'), short: t('Отчет'), icon: BarChart3 },
    { key: 'awards', label: t('Сыйлыктар'), short: t('Сыйлык'), icon: Award },
    { key: 'community', label: t('Жамаат'), short: t('Жамаат'), icon: Users }
];
