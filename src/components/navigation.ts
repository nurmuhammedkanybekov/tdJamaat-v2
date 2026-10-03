import type React from 'react';
import { Award, BarChart3, Home, LayoutDashboard, TrendingUp } from 'lucide-react';

export type ActiveView = 'overview' | 'teams' | 'progress' | 'reports' | 'awards';

export const TABS: { key: ActiveView; label: string; short: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
    { key: 'overview', label: 'Жалпы көрүнүш', short: 'Жалпы', icon: LayoutDashboard },
    { key: 'teams', label: 'Үй ичиндеги рейтинг', short: 'Үйлөр', icon: Home },
    { key: 'progress', label: 'Апталык прогресс', short: 'Прогресс', icon: TrendingUp },
    { key: 'reports', label: 'Отчёттор', short: 'Отчёт', icon: BarChart3 },
    { key: 'awards', label: 'Сыйлыктар', short: 'Сыйлык', icon: Award }
];
