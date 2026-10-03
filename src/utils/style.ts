// Shared style helpers (theme-aware via CSS custom properties).

/** Color for a percent-of-target: green at/above plan, then navy, amber, red. */
export const perfColor = (pct: number) =>
    pct >= 100 ? 'var(--success)' : pct >= 75 ? 'var(--accent)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';

/** Axis tick style for Recharts, in the site's text font. */
export const axisTick = { fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-serif)' };

/** Y-axis range for score charts: starts a little below the lowest value
 *  instead of at 0, so differences between houses are actually visible. */
export const scoreDomain: [(min: number) => number, (max: number) => number] = [
    min => Math.max(0, Math.floor((min * 0.85) / 10) * 10),
    max => Math.ceil((max * 1.05) / 10) * 10
];
