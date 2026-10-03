import React, { useId } from 'react';
import { HORN_PATHS } from '../utils/ornament';

// Kyrgyz ornament, drawn as a single gold hairline.
//
//  - кочкор мүйүз (ram's horn): two spirals rising from one stem — wishes
//    of strength and plenty. The site's signature mark.
//  - түндүк: the crown of the yurt, two sets of three crossing laths in a
//    ring — home, the family, the jamaat under one roof.
//  - тумар: the amulet triangle with pendants — protection.
//  - сынган мүйүз ("broken horn"): the corner curl that frames a field.
//  - ит куйрук ("dog's tail"): the running scroll used along borders.
//
// Every stroke has pathLength="1", so wrapping an ornament in `.draw-in`
// makes it draw itself once, like a pen line. Colors come from
// `currentColor` (normally var(--gold)), so both themes work.

const P = { pathLength: 1, fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };


export const Horn: React.FC<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }> = ({ size = 40, strokeWidth = 2.4, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} style={style} aria-hidden="true">
        {HORN_PATHS.map((d, i) => <path key={i} d={d} {...P} strokeWidth={strokeWidth} />)}
    </svg>
);

export const Tunduk: React.FC<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }> = ({ size = 40, strokeWidth = 1.4, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} style={style} aria-hidden="true">
        <circle cx="50" cy="50" r="42" {...P} strokeWidth={strokeWidth} />
        <circle cx="50" cy="50" r="36" {...P} strokeWidth={strokeWidth * 0.6} />
        {['M39 15 Q31 50 39 85', 'M50 14 L50 86', 'M61 15 Q69 50 61 85', 'M15 39 Q50 31 85 39', 'M14 50 L86 50', 'M15 61 Q50 69 85 61'].map((d, i) => (
            <path key={i} d={d} {...P} strokeWidth={strokeWidth} />
        ))}
    </svg>
);

export const Tumar: React.FC<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }> = ({ size = 40, strokeWidth = 1.4, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} style={style} aria-hidden="true">
        {['M50 10 L88 70 L12 70 Z', 'M50 26 L74 64 L26 64 Z', 'M30 70 L30 82', 'M50 70 L50 88', 'M70 70 L70 82', 'M30 82 L26 89 L34 89 Z', 'M50 88 L46 95 L54 95 Z', 'M70 82 L66 89 L74 89 Z'].map((d, i) => (
            <path key={i} d={d} {...P} strokeWidth={strokeWidth} />
        ))}
    </svg>
);

/**
 * The tdJamaat mark: a ram's horn (кочкор мүйүз) holding a crescent between
 * its spirals, inside a reeded ring like the medals. `solid` draws heavier
 * strokes for small sizes (tab icon, phone icon).
 */
export const Mark: React.FC<{ size?: number; className?: string; style?: React.CSSProperties; solid?: boolean }> = ({ size = 30, className, style, solid }) => {
    const maskId = `mk${useId().replace(/:/g, '')}`;
    // Crescent (outer disc minus offset disc) and horn placement, in the 120 box.
    const c = solid ? { x: 59, y: 30, r: 12.5, cx: 64.5, cy: 26.5, cr: 10.2 } : { x: 60, y: 32.4, r: 9.7, cx: 64.1, cy: 29.6, cr: 7.9 };
    const horns = solid ? 'translate(17 25) scale(0.86)' : 'translate(14 14) scale(0.92)';
    return (
        <svg width={size} height={size} viewBox="0 0 120 120" className={className} style={style} aria-hidden="true">
            <defs>
                <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
                    <rect width="120" height="120" fill="#fff" />
                    <circle cx={c.cx} cy={c.cy} r={c.cr} fill="#000" />
                </mask>
            </defs>
            {!solid && Array.from({ length: 72 }).map((_, i) => {
                const a = (i / 72) * Math.PI * 2;
                return <line key={i} x1={60 + Math.cos(a) * 55.5} y1={60 + Math.sin(a) * 55.5} x2={60 + Math.cos(a) * 58.5} y2={60 + Math.sin(a) * 58.5} stroke="currentColor" strokeWidth={0.9} opacity={0.8} />;
            })}
            <circle cx="60" cy="60" r="53" fill="none" stroke="currentColor" strokeWidth={solid ? 3.4 : 2} />
            <g transform={horns}>
                {[HORN_PATHS[0], HORN_PATHS[1], 'M50 64 L50 88'].map((d, i) => <path key={i} d={d} {...P} strokeWidth={solid ? 6 : 3.6} />)}
            </g>
            <circle cx={c.x} cy={c.y} r={c.r} fill="currentColor" mask={`url(#${maskId})`} />
        </svg>
    );
};

/** The crown over the hero: a ram's horn between two running ит куйрук scrolls. */
export const Crown: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => {
    const scroll = (x: number, flip: boolean) => {
        const segs = [0, 1, 2].map(k => {
            const o = x + (flip ? -k * 38 : k * 38);
            const s = flip ? -1 : 1;
            return `M${o} 58 C${o + 7 * s} 58 ${o + 9 * s} 48 ${o + 18 * s} 48 C${o + 27 * s} 48 ${o + 27 * s} 58 ${o + 20 * s} 58 C${o + 15 * s} 58 ${o + 15 * s} 53 ${o + 19 * s} 53 M${o + 22 * s} 58 L${o + 38 * s} 58`;
        });
        return segs.join(' ');
    };
    return (
        <svg viewBox="0 0 320 72" className={className} style={style} aria-hidden="true">
            <path d={scroll(8, false)} {...P} strokeWidth={1.1} />
            <path d={scroll(312, true)} {...P} strokeWidth={1.1} />
            <g transform="translate(125 -2) scale(0.7)">
                {HORN_PATHS.map((d, i) => <path key={i} d={d} {...P} strokeWidth={1.9} />)}
            </g>
        </svg>
    );
};

/** Four сынган мүйүз corner curls framing whatever sits inside the parent (parent must be relative). */
export const Corners: React.FC<{ inset?: number; size?: number; className?: string }> = ({ inset = 0, size = 34, className }) => {
    const corner = (rot: number, pos: React.CSSProperties) => (
        <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true" style={{ position: 'absolute', transform: `rotate(${rot}deg)`, ...pos }}>
            <path d="M6 54 L6 24 C6 12 14 6 26 6 L54 6" {...P} strokeWidth={1.5} />
            <path d="M6 30 C6 20 12 16 20 16 C28 16 30 24 25 28 C21 31 16 28 18 24" {...P} strokeWidth={1.5} />
        </svg>
    );
    return (
        <div className={`pointer-events-none absolute inset-0 ${className ?? ''}`} style={{ color: 'var(--gold)' }} aria-hidden="true">
            {corner(0, { left: inset, top: inset })}
            {corner(90, { right: inset, top: inset })}
            {corner(180, { right: inset, bottom: inset })}
            {corner(270, { left: inset, bottom: inset })}
        </div>
    );
};

/** Tush-kiyiz medallion: eight horns radiating around a түндүк, in one line weight. */
export const Medallion: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 220, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 300 300" className={className} style={style} aria-hidden="true">
        <circle cx="150" cy="150" r="142" {...P} strokeWidth={0.9} />
        <circle cx="150" cy="150" r="136" {...P} strokeWidth={0.6} strokeDasharray="0.004 0.012" />
        {Array.from({ length: 8 }).map((_, i) => (
            <g key={i} transform={`rotate(${i * 45} 150 150) translate(122 30) scale(0.56)`}>
                {HORN_PATHS.map((d, k) => <path key={k} d={d} {...P} strokeWidth={2.2} />)}
            </g>
        ))}
        <circle cx="150" cy="150" r="36" {...P} strokeWidth={1} />
        <g transform="translate(122 122) scale(0.56)">
            <circle cx="50" cy="50" r="42" {...P} strokeWidth={1.8} />
            {['M39 15 Q31 50 39 85', 'M50 14 L50 86', 'M61 15 Q69 50 61 85', 'M15 39 Q50 31 85 39', 'M14 50 L86 50', 'M15 61 Q50 69 85 61'].map((d, k) => <path key={k} d={d} {...P} strokeWidth={1.8} />)}
        </g>
    </svg>
);

/** Section break: a hairline with a small тумар diamond at its center. */
export const OrnamentDivider: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
    <div className={`rule ${className ?? ''}`} style={style} aria-hidden="true">
        <Horn size={26} strokeWidth={2.6} />
    </div>
);

/** Small signature mark (footer). */
export const SunMark: React.FC<{ className?: string; size?: number; color?: string }> = ({ className, size = 18, color = 'var(--gold-dim)' }) => (
    <Tunduk size={size} className={className} style={{ color }} />
);
