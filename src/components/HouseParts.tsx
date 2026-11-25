// Pieces of a house's own page, shared by the results (Үйлөр) and a
// member's own house (Үйүм): the sum that makes the rating, and the
// rating week by week.
import React from 'react';
import { t } from '../i18n';
import { ROMAN } from '../utils/roman';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

/** One term of the house's sum: a number in the display face over its name. */
export const SumTerm: React.FC<{ value: string; of?: number; label: string; strong?: boolean }> = ({ value, of, label, strong }) => (
    <span className="house-sum-term">
        <span className="font-display tabular leading-none house-sum-value" style={{ color: strong ? 'var(--gold)' : 'var(--text-primary)' }}>
            {value}{of !== undefined && <span className="house-sum-of"> / {of}</span>}
        </span>
        <span className="house-sum-label">{label}</span>
    </span>
);

/** The house's rating week by week: a line in the house's colour, each week's
 *  number above its point, its place below. Weeks without data break the line. */
export const Trajectory: React.FC<{ weeks: Array<{ weekIndex: number; weekNumber: number; avg: number; rank: number | null; submitted: boolean }>; current: number; color: string; label?: string }> = ({ weeks, current, color, label }) => {
    const showRank = weeks.some(w => w.rank !== null);
    if (weeks.length < 2) return null;
    const vals = weeks.filter(w => w.submitted).map(w => w.avg);
    if (vals.length === 0) return null;
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const span = hi - lo || 1;
    const n = weeks.length;
    const x = (i: number) => ((i + 0.5) / n) * 100;
    const y = (v: number) => 82 - ((v - lo) / span) * 64; // 18 … 82 of 100
    // Line segments between consecutive weeks that both have data.
    const segs: string[] = [];
    let cur: string[] = [];
    weeks.forEach((w, i) => {
        if (w.submitted) cur.push(`${x(i)},${y(w.avg)}`);
        else { if (cur.length > 1) segs.push(cur.join(' ')); cur = []; }
    });
    if (cur.length > 1) segs.push(cur.join(' '));
    return (
        <div className="house-trajectory">
            <div className="eyebrow mb-4">{label ?? t('Апта сайын')}</div>
            <div className="relative h-[132px]">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
                    {segs.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />)}
                </svg>
                {weeks.map((w, i) => {
                    const now = w.weekIndex === current;
                    return w.submitted ? (
                        <div key={w.weekIndex} className="absolute -translate-x-1/2" style={{ left: `${x(i)}%`, top: `${y(w.avg)}%` }}>
                            <span className="block w-[9px] h-[9px] rounded-full -translate-y-1/2" style={{ backgroundColor: now ? color : 'var(--surface)', border: `1.5px solid ${color}`, boxShadow: now ? `0 0 0 4px color-mix(in oklab, ${color} 18%, transparent)` : undefined }} />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-[14px] font-display tabular text-[0.95rem] whitespace-nowrap" style={{ color: now ? 'var(--text-primary)' : 'var(--text-muted)' }}>{fmt(w.avg)}</span>
                        </div>
                    ) : null;
                })}
            </div>
            <div className="grid mt-3 pt-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, borderTop: '1px solid var(--border)' }}>
                {weeks.map(w => {
                    const now = w.weekIndex === current;
                    return (
                        <div key={w.weekIndex} className="text-center min-w-0">
                            <div className="text-[0.72rem] tabular truncate" style={{ color: now ? 'var(--gold)' : 'var(--text-muted)' }}>{t('{0}-апта', w.weekNumber)}</div>
                            {showRank && <div className="font-display text-[0.95rem] leading-tight tabular" style={{ color: now ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{w.rank ? ROMAN[w.rank - 1] ?? w.rank : '—'}</div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

