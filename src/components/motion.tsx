// Small motion helpers: numbers that count up, sections that reveal on
// scroll, and the night sky. Everything respects "reduce motion".
import React, { useEffect, useRef, useState } from 'react';
import { reduced, useReveal } from '../hooks/useReveal';

const easeOut = (x: number) => 1 - Math.pow(1 - x, 4);

/** A number that counts from where it was to `value` (from 0 the first time). */
export const CountUp: React.FC<{ value: number; decimals?: number; duration?: number; className?: string; style?: React.CSSProperties }> = ({ value, decimals = 1, duration = 1400, className, style }) => {
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
    const text = (Math.round(shown * factor) / factor).toString();
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
