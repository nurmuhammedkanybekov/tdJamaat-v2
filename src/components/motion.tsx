// Small motion helpers: numbers that count up, sections that reveal on
// scroll, and the night sky. Everything respects "reduce motion".
import React, { useEffect, useRef, useState } from 'react';
import { reduced, useReveal } from '../hooks/useReveal';

const easeOut = (x: number) => 1 - Math.pow(1 - x, 4);

/** A number that counts from where it was to `value` (from 0 the first time). */
export const CountUp: React.FC<{ value: number; decimals?: number; duration?: number; group?: boolean; className?: string; style?: React.CSSProperties }> = ({ value, decimals = 1, duration = 1400, group, className, style }) => {
    const [shown, setShown] = useState(() => (reduced() ? value : 0));
    const from = useRef(reduced() ? value : 0);
    const el = useRef<HTMLSpanElement>(null);
    // Counting starts once the number is on screen (not while scrolled away).
    const [seen, setSeen] = useState(() => reduced() || typeof IntersectionObserver === 'undefined');
    useEffect(() => {
        if (seen || !el.current) return;
        const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
        io.observe(el.current);
        return () => io.disconnect();
    }, [seen]);
    useEffect(() => {
        if (!seen) return;
        if (reduced() || !Number.isFinite(value)) { setShown(value); from.current = value; return; }
        const start = performance.now(), a = from.current, b = value;
        let raf = 0;
        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            setShown(a + (b - a) * easeOut(p));
            if (p < 1) raf = requestAnimationFrame(tick); else from.current = b;
        };
        raf = requestAnimationFrame(tick);
        return () => { cancelAnimationFrame(raf); from.current = b; };
    }, [value, duration, seen]);
    const factor = Math.pow(10, decimals);
    const rounded = Math.round(shown * factor) / factor;
    // group: thousands apart (20 984), the way the community page writes them
    const text = group ? rounded.toLocaleString('ru-RU') : rounded.toString();
    return <span ref={el} className={className} style={style}>{text}</span>;
};

/** A section that rises into view. */
export const Reveal: React.FC<React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' }> = ({ as = 'div', className = '', children, ...rest }) => {
    const ref = useReveal<HTMLElement>();
    const Tag = as as 'div';
    return <Tag ref={ref as React.Ref<HTMLDivElement>} className={`reveal ${className}`} {...rest}>{children}</Tag>;
};

// Deterministic "random" so the sky is the same on every render.
const rand = (i: number) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

/** Faint twinkling stars (dark theme only; hidden by CSS in the light one). */
export const StarField: React.FC<{ count?: number; className?: string }> = ({ count = 46, className = '' }) => (
    <div className={`starfield ${className}`} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
            <i
                key={i}
                className={rand(i + 7) > 0.86 ? 'big' : undefined}
                style={{
                    left: `${(rand(i) * 100).toFixed(2)}%`,
                    top: `${(rand(i + 101) * 100).toFixed(2)}%`,
                    ['--d' as string]: `${(3.5 + rand(i + 33) * 5).toFixed(2)}s`,
                    ['--delay' as string]: `${(rand(i + 55) * 6).toFixed(2)}s`,
                    ['--o' as string]: (0.35 + rand(i + 77) * 0.55).toFixed(2)
                }}
            />
        ))}
    </div>
);

/** Gold sparks bursting once from the centre (a week that is complete). */
export const Sparks: React.FC<{ count?: number }> = ({ count = 22 }) => (
    <span className="sparks" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => {
            const angle = (i / count) * Math.PI * 2 + rand(i) * 0.4;
            const dist = 120 + rand(i + 9) * 150;
            return (
                <i
                    key={i}
                    style={{
                        ['--x' as string]: `${(Math.cos(angle) * dist).toFixed(1)}px`,
                        ['--y' as string]: `${(Math.sin(angle) * dist * 0.6).toFixed(1)}px`,
                        ['--delay' as string]: `${(1500 + rand(i + 21) * 350).toFixed(0)}ms`,
                        ['--s' as string]: (0.6 + rand(i + 4) * 0.9).toFixed(2)
                    }}
                />
            );
        })}
    </span>
);

/** The sky behind the header: tinted by the time of day (src/utils/sky.ts),
 *  with the sun or the moon on its arc when `body` is set. */
export const SkyLayer: React.FC<{ phase: string; body?: 'sun' | 'moon'; progress?: number }> = ({ phase, body, progress = 0.5 }) => (
    <div className={`sky sky-${phase}`} aria-hidden="true">
        {body && (
            <span className={`sky-body sky-${body}`} style={{ left: `${8 + progress * 84}%`, top: `${30 - Math.sin(progress * Math.PI) * 22}%` }}>
                {body === 'moon' && (
                    <svg viewBox="0 0 40 40" width="100%" height="100%"><defs><mask id="sky-moon"><rect width="40" height="40" fill="#fff" /><circle cx="26" cy="15" r="13" fill="#000" /></mask></defs><circle cx="20" cy="20" r="15" fill="currentColor" mask="url(#sky-moon)" /></svg>
                )}
            </span>
        )}
    </div>
);

/** A border of ram's horns (кочкор мүйүз), as on the edge of a шырдак. */
export const HornBand: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg className={`horn-band ${className}`} width="100%" height="16" aria-hidden="true">
        <defs>
            <pattern id="horn-tile" width="56" height="16" patternUnits="userSpaceOnUse">
                <path d="M28 9 C 23 9, 20 3.5, 15 3.5 C 11 3.5, 10 8.5, 13.5 9 C 16 9.4, 16.6 6.8, 14.8 6.6" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <path d="M28 9 C 33 9, 36 3.5, 41 3.5 C 45 3.5, 46 8.5, 42.5 9 C 40 9.4, 39.4 6.8, 41.2 6.6" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <path d="M28 6.6 L30 9 L28 11.4 L26 9 Z" fill="none" stroke="currentColor" strokeWidth="0.9" />
                <path d="M0 13.5 H56" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
            </pattern>
        </defs>
        <rect width="100%" height="16" fill="url(#horn-tile)" />
    </svg>
);
