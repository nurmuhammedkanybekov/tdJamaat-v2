import React from 'react';

// A light Kyrgyz ornamental accent — not a full motif system, just two
// small marks that carry the theme:
//
//  - HornMark    — a minimal kochkor-muyuz (ram's-horn) scroll, the paired
//    spiral found on shyrdaks, gates and jewelry; sits as a "seal" at the
//    center of every frieze divider.
//  - OrnamentDivider — a woven diamond-chain frieze (pure CSS mask, so it
//    stays crisp at any width and repaints instantly on theme toggle) with
//    the horn-mark seal at its center. The section break, not a hairline.
//  - SunMark     — a small radiating wheel evoking the tunduk, the wooden
//    crown at the peak of a yurt that frames the sky (also the motif on the
//    national flag); used as a signature mark, e.g. in the footer.
//
// Both take their color from the theme tokens (src/index.css) so they hold
// in both light and dark mode.

interface HornMarkProps {
    className?: string;
    color?: string;
}

export const HornMark: React.FC<HornMarkProps> = ({ className, color = 'var(--gold)' }) => (
    <svg
        className={className}
        width="34"
        height="14"
        viewBox="0 0 64 24"
        fill="none"
        role="presentation"
        aria-hidden="true"
    >
        <path
            d="M3,14 C3,6 16,4 16,11 C16,16.5 9,16.5 9,12.5 C9,10.3 11.5,10.3 11.8,11.8"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
        />
        <path
            d="M61,14 C61,6 48,4 48,11 C48,16.5 55,16.5 55,12.5 C55,10.3 52.5,10.3 52.2,11.8"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
        />
        <path d="M16,9.5 L26,9.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M48,9.5 L38,9.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="32" cy="9.5" r="2" fill={color} />
    </svg>
);

interface OrnamentDividerProps {
    className?: string;
    style?: React.CSSProperties;
}

// A woven diamond-chain frieze (see .ornament-frieze, index.css) with a
// circular seal — the horn mark — breaking it at the center. Drop-in
// replacement for a plain `border-bottom`, but reads as trim, not a rule.
export const OrnamentDivider: React.FC<OrnamentDividerProps> = ({ className, style }) => (
    <div className={`flex items-center ${className ?? ''}`} style={style}>
        <span className="ornament-frieze flex-1" />
        <span
            className="flex items-center justify-center flex-shrink-0 mx-3"
            style={{
                width: 36, height: 36, borderRadius: '50%',
                backgroundColor: 'var(--surface)', border: '1.5px solid var(--gold)'
            }}
        >
            <HornMark />
        </span>
        <span className="ornament-frieze flex-1" />
    </div>
);

interface SunMarkProps {
    className?: string;
    size?: number;
    color?: string;
}

export const SunMark: React.FC<SunMarkProps> = ({ className, size = 18, color = 'var(--text-muted)' }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        role="presentation"
        aria-hidden="true"
    >
        <circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth="1.1" />
        <circle cx="12" cy="12" r="7.4" stroke={color} strokeWidth="1.1" />
        {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * Math.PI) / 4;
            const x1 = 12 + Math.cos(angle) * 8.6;
            const y1 = 12 + Math.sin(angle) * 8.6;
            const x2 = 12 + Math.cos(angle) * 10.6;
            const y2 = 12 + Math.sin(angle) * 10.6;
            return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.1" strokeLinecap="round" />
            );
        })}
    </svg>
);
