import React, { useId } from 'react';
import type { BadgeIcon, Tier } from '../utils/badges';
import { HORN_PATHS } from '../utils/ornament';

// An award, drawn like a struck medal: a reeded edge, the badge's name
// engraved around the rim, and an emblem built from Kyrgyz ornament at the
// center — every badge has its own drawing, nothing is a stock icon. One
// metal per tier, line only (a "seal" award is the one filled disc).

const METAL: Record<Tier, string> = {
    gold: 'var(--metal-gold)',
    silver: 'var(--metal-silver)',
    bronze: 'var(--metal-bronze)',
    seal: 'var(--metal-gold)'
};

const L = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const horn = (transform: string, sw = 3) => (
    <g transform={transform}>{HORN_PATHS.map((d, i) => <path key={i} d={d} {...L} strokeWidth={sw} />)}</g>
);

const diamond = (cx: number, cy: number, r: number) => `M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z`;

// Emblems live in a 100×100 box; strokes are scaled with it.
const Emblem: React.FC<{ icon: BadgeIcon; clipId: string }> = ({ icon, clipId }) => {
    switch (icon) {
        case 'star': // Апта жылдызы — eight-pointed star around a point of light
            return <g {...L} strokeWidth={2.2}>
                <rect x="29" y="29" width="42" height="42" />
                <rect x="29" y="29" width="42" height="42" transform="rotate(45 50 50)" />
                <circle cx="50" cy="50" r="8" />
            </g>;
        case 'podium': // Сыйлык тепкичи — three plinths
            return <g {...L} strokeWidth={2.2}>
                <path d="M18 80 H82" /><path d="M24 80 V60 H40 V80" /><path d="M40 80 V44 H60 V80" /><path d="M60 80 V66 H76 V80" />
                <path d={diamond(50, 32, 6)} />
            </g>;
        case 'target': // Толук план — тумар, the amulet that is complete
            return <g {...L} strokeWidth={2.2}>
                <path d="M50 14 L84 70 L16 70 Z" /><path d="M50 30 L70 64 L30 64 Z" />
                <path d="M32 70 V80 M50 70 V86 M68 70 V80" /><circle cx="50" cy="52" r="3" />
            </g>;
        case 'flame': // Темир тартип — a chain of diamonds, one per week
            return <g {...L} strokeWidth={2.2}>
                {[24, 50, 76].map(y => <path key={y} d={diamond(50, y, 10)} />)}
                <path d="M50 34 V40 M50 60 V66" />
            </g>;
        case 'chain5': // Болот тартип — five links
            return <g {...L} strokeWidth={2}>
                {[16, 33, 50, 67, 84].map(y => <path key={y} d={diamond(50, y, 6.5)} />)}
                <path d="M30 50 H40 M60 50 H70" />
            </g>;
        case 'zap': // Эки эсе — кош мүйүз, the horn doubled and facing itself
            return <g>{horn('rotate(-90 50 50) translate(25 -2) scale(0.5)', 4.4)}{horn('rotate(90 50 50) translate(25 -2) scale(0.5)', 4.4)}</g>;
        case 'leap': // Чоң секирик — a saw-tooth ridge climbing
            return <g {...L} strokeWidth={2.2}>
                <path d="M16 78 L30 62 L40 70 L56 46 L64 54 L82 26" />
                <path d="M82 26 L72 28 M82 26 L80 36" /><path d="M16 84 H84" strokeWidth={1.2} />
            </g>;
        case 'rising': // Өсүү жолу — three steps up
            return <g {...L} strokeWidth={2.2}>
                <path d="M20 78 H38 V62 H56 V46 H74 V30" /><path d={diamond(74, 22, 5)} />
                <path d="M20 84 H80" strokeWidth={1.2} />
            </g>;
        case 'steady': // Туруктуу — кереге көз, the yurt lattice
            return <g>
                <clipPath id={clipId}><circle cx="50" cy="50" r="30" /></clipPath>
                <g clipPath={`url(#${clipId})`} {...L} strokeWidth={1.8}>
                    {[-40, -20, 0, 20, 40].map(c => <path key={`a${c}`} d={`M${20 + c} 20 L${80 + c} 80`} />)}
                    {[-40, -20, 0, 20, 40].map(c => <path key={`b${c}`} d={`M${80 + c} 20 L${20 + c} 80`} />)}
                </g>
                <circle cx="50" cy="50" r="30" {...L} strokeWidth={2} />
            </g>;
        case 'crown': // Аптанын үйү — the horn as a crown on its plinth
            return <g>{horn('translate(14 4) scale(0.72)', 3.2)}<path d="M26 84 H74" {...L} strokeWidth={2} /></g>;
        case 'moon': // Айдын үйү — the crescent holding a түндүк
            return <g {...L} strokeWidth={2.2}>
                <path d="M60 20 A31 31 0 1 0 60 80 A25 25 0 1 1 60 20 Z" />
                <circle cx="62" cy="50" r="9" /><path d="M58 42 Q56 50 58 58 M66 42 Q68 50 66 58 M54 47 Q62 45 70 47 M54 53 Q62 55 70 53" strokeWidth={1.4} />
            </g>;
        case 'unity': // Бир жүрөк — four horns meeting at one center
            return <g>{[0, 90, 180, 270].map(r => <g key={r}>{horn(`rotate(${r} 50 50) translate(32 4) scale(0.36)`, 5.4)}</g>)}<circle cx="50" cy="50" r="3" fill="currentColor" /></g>;
        case 'card': // Мини-карта устаты — seven beads (мончок) on a thread
            return <g {...L} strokeWidth={1.8}>
                <path d="M18 40 Q50 88 82 40" strokeWidth={1.1} />
                {Array.from({ length: 7 }).map((_, i) => {
                    const t = i / 6, x = (1 - t) * (1 - t) * 18 + 2 * (1 - t) * t * 50 + t * t * 82, y = (1 - t) * (1 - t) * 40 + 2 * (1 - t) * t * 88 + t * t * 40;
                    return <circle key={i} cx={x} cy={y} r={i === 3 ? 6 : 4.5} />;
                })}
            </g>;
        case 'rocket': // Үйдүн секириги — Ala-Too: two peaks and the sun
            return <g {...L} strokeWidth={2.2}>
                <path d="M14 76 L38 40 L50 56 L62 34 L86 76" /><path d="M32 49 L38 53 L44 49 M56 43 L62 47 L68 43" strokeWidth={1.4} />
                <circle cx="76" cy="24" r="5" /><path d="M14 82 H86" strokeWidth={1.2} />
            </g>;
        case 'tunduk': // Толук сезон — the yurt crown: a whole season under one roof
            return <g {...L} strokeWidth={2}>
                <circle cx="50" cy="50" r="32" /><circle cx="50" cy="50" r="26" strokeWidth={1.2} />
                <path d="M41 22 Q35 50 41 78 M50 21 V79 M59 22 Q65 50 59 78 M22 41 Q50 35 78 41 M21 50 H79 M22 59 Q50 65 78 59" strokeWidth={1.6} />
            </g>;
        case 'medallion': // Сезондун үйү — eight horns around one center
            return <g>{Array.from({ length: 8 }).map((_, i) => <g key={i}>{horn(`rotate(${i * 45} 50 50) translate(39 4) scale(0.22)`, 8)}</g>)}<circle cx="50" cy="50" r="9" {...L} strokeWidth={2} /></g>;
        default:
            return <g {...L} strokeWidth={2.2}><path d={diamond(50, 50, 22)} /></g>;
    }
};

interface BadgeMedalProps {
    icon: BadgeIcon;
    tier: Tier;
    size?: number;
    count?: number;
    locked?: boolean;
    title?: string;
    /** Engraved around the top of the rim (badge name). Omit on tiny medals. */
    label?: string;
}

export const BadgeMedal: React.FC<BadgeMedalProps> = ({ icon, tier, size = 64, count, locked, title, label }) => {
    const uid = useId().replace(/:/g, '');
    const metal = locked ? 'var(--text-muted)' : METAL[tier];
    const seal = tier === 'seal' && !locked;
    const engrave = label && size >= 64;
    return (
        <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={title ?? label} style={{ flexShrink: 0, color: metal, opacity: locked ? 0.42 : 1 }}>
            {(title ?? label) && <title>{title ?? label}</title>}
            <defs>
                <path id={`t${uid}`} d="M16 60 A44 44 0 0 1 104 60" />
                <path id={`b${uid}`} d="M14 60 A46 46 0 0 0 106 60" />
            </defs>
            {/* reeded edge */}
            <g stroke="currentColor" strokeWidth={0.7} opacity={0.75}>
                {Array.from({ length: 90 }).map((_, i) => {
                    const a = (i / 90) * Math.PI * 2;
                    return <line key={i} x1={60 + Math.cos(a) * 56.5} y1={60 + Math.sin(a) * 56.5} x2={60 + Math.cos(a) * 59} y2={60 + Math.sin(a) * 59} />;
                })}
            </g>
            <circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" strokeWidth={1.3} />
            <circle cx="60" cy="60" r={engrave ? 36 : 50} fill={seal ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={0.8} />
            {engrave && (
                <g fill="currentColor" fontFamily="Inter, system-ui, sans-serif" fontSize="7" letterSpacing="1.6">
                    <text><textPath href={`#t${uid}`} startOffset="50%" textAnchor="middle">{label!.toUpperCase()}</textPath></text>
                    <text fontSize="6.2" letterSpacing="2"><textPath href={`#b${uid}`} startOffset="50%" textAnchor="middle">{count && count > 1 ? `${count} ЖОЛУ` : '· TDJAMAAT ·'}</textPath></text>
                    <path d="M20 60 h3 M97 60 h3" stroke="currentColor" strokeWidth={0.8} />
                </g>
            )}
            <g transform={engrave ? 'translate(32 32) scale(0.56)' : 'translate(29 29) scale(0.62)'} style={{ color: seal ? 'var(--page-plane)' : metal }}>
                <Emblem icon={icon} clipId={`c${uid}`} />
            </g>
            {!engrave && count !== undefined && count > 1 && (
                <text x="60" y="113" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="12" fill="currentColor">×{count}</text>
            )}
        </svg>
    );
};
