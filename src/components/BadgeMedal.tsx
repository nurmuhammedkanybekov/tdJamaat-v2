import React, { useId } from 'react';
import { Award as AwardIcon, CalendarCheck2, Crown, Flame, LayoutGrid, Medal, Moon, Rocket, Shield, Star, Target, TrendingUp, Users, Zap } from 'lucide-react';
import type { BadgeIcon, Tier } from '../utils/badges';

// A badge medallion: an eight-pointed star (the same rub el hizb geometry as
// the site mark) in the tier's metal, a ring of frieze dots, and the badge's
// emblem at the center. Gold and seal tiers get ribbon tails. Unearned
// badges render in grey.

const ICONS: Record<BadgeIcon, React.ComponentType<React.SVGProps<SVGSVGElement> & { strokeWidth?: number }>> = {
    star: Star, medal: Medal, target: Target, flame: Flame, zap: Zap, leap: TrendingUp, steady: CalendarCheck2,
    rising: TrendingUp, crown: Crown, moon: Moon, unity: Users, card: LayoutGrid, rocket: Rocket
};

const TIER_VARS: Record<Tier, [string, string]> = {
    bronze: ['var(--tier-bronze-1)', 'var(--tier-bronze-2)'],
    silver: ['var(--tier-silver-1)', 'var(--tier-silver-2)'],
    gold: ['var(--tier-gold-1)', 'var(--tier-gold-2)'],
    seal: ['var(--tier-seal-1)', 'var(--tier-seal-2)']
};

interface BadgeMedalProps {
    icon: BadgeIcon;
    tier: Tier;
    size?: number;
    count?: number;
    locked?: boolean;
    title?: string;
}

export const BadgeMedal: React.FC<BadgeMedalProps> = ({ icon, tier, size = 64, count, locked, title }) => {
    const uid = useId().replace(/:/g, '');
    const [c1, c2] = locked ? ['#d8d5cc', '#9c978a'] : TIER_VARS[tier];
    const Icon = ICONS[icon] ?? (tier === 'seal' ? Shield : AwardIcon);
    const ribbon = !locked && (tier === 'gold' || tier === 'seal');
    const iconColor = '#fffaf0';
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={title} style={{ flexShrink: 0, overflow: 'visible', opacity: locked ? 0.55 : 1 }}>
            {title && <title>{title}</title>}
            <defs>
                <linearGradient id={`m${uid}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={c1} />
                    <stop offset="1" stopColor={c2} />
                </linearGradient>
                <linearGradient id={`i${uid}`} x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stopColor={c2} />
                    <stop offset="1" stopColor={c1} />
                </linearGradient>
                <filter id={`s${uid}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.22" />
                </filter>
            </defs>
            {ribbon && (
                <g>
                    <path d="M34 66 L26 96 L36 90 L42 98 L48 70 Z" fill={c2} />
                    <path d="M66 66 L74 96 L64 90 L58 98 L52 70 Z" fill={c2} />
                </g>
            )}
            <g filter={`url(#s${uid})`}>
                <rect x="20" y="20" width="60" height="60" rx="7" fill={`url(#m${uid})`} />
                <rect x="20" y="20" width="60" height="60" rx="7" fill={`url(#m${uid})`} transform="rotate(45 50 50)" />
            </g>
            <circle cx="50" cy="50" r="29" fill={c2} opacity="0.9" />
            <circle cx="50" cy="50" r="26" fill="none" stroke={c1} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 5.1" />
            <circle cx="50" cy="50" r="22" fill={`url(#i${uid})`} />
            <Icon x={35} y={35} width={30} height={30} color={iconColor} strokeWidth={2} />
            {count !== undefined && count > 1 && (
                <g>
                    <circle cx="84" cy="18" r="13" fill="var(--surface)" stroke={c2} strokeWidth="2" />
                    <text x="84" y="23" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text-primary)" fontFamily="var(--font-serif)">×{count}</text>
                </g>
            )}
        </svg>
    );
};
