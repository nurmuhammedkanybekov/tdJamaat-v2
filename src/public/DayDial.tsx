// The day as a circle — a 24-hour dial shaped like a түндүк (the crown of a
// yurt): noon at the top, midnight at the bottom, the six times of the day
// set around it, and the sun (or the moon) standing where the day is now.
import React from 'react';
import type { City, PrayerKey } from '../utils/prayer';
import { PRAYER_NAMES, PRAYER_ORDER, clock, nextPrayer, prayerTimes, untilText } from '../utils/prayer';
import { t } from '../i18n';

// The box is wider than it is tall: the names of the times stand outside the ring.
const W = 520, S = 400, PAD = (W - S) / 2, C = S / 2, R = 150;
const minutesOf = (d: Date, tz: string) => { const [h, m] = clock(d, tz).split(':').map(Number); return h * 60 + m; };
/** degrees clockwise from the top (12:00) */
const angleOf = (minutes: number) => ((minutes - 720) / 1440) * 360;
const point = (deg: number, r: number): [number, number] => { const a = (deg * Math.PI) / 180; return [C + r * Math.sin(a), C - r * Math.cos(a)]; };
const arc = (from: number, to: number, r: number) => {
    const sweep = ((to - from) % 360 + 360) % 360;
    const [x1, y1] = point(from, r), [x2, y2] = point(from + sweep, r);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

export const DayDial: React.FC<{ city: City; now: Date; className?: string }> = ({ city, now, className }) => {
    const times = prayerTimes(city, now);
    const next = nextPrayer(city, now);
    const at = Object.fromEntries(PRAYER_ORDER.map(k => [k, angleOf(minutesOf(times[k], city.tz))])) as Record<PrayerKey, number>;
    const nowAngle = angleOf(minutesOf(now, city.tz));
    const daylight = now >= times.sunrise && now < times.maghrib;
    // The prayer whose time it is now (the arc runs from it to this moment).
    let current: PrayerKey = 'isha';
    for (const k of PRAYER_ORDER) if (k !== 'sunrise' && times[k] <= now) current = k;
    const [sx, sy] = point(nowAngle, R);
    return (
        <div className={`relative mx-auto ${className ?? ''}`} style={{ width: 'min(33rem, 100%)', aspectRatio: `${W} / ${S}` }}>
            <svg viewBox={`${-PAD} 0 ${W} ${S}`} className="absolute inset-0 w-full h-full" role="img" aria-label={t('Күндүн айланасы: намаз убактылары')}>
                {/* the түндүк: a ring and its crossing ribs, very faint */}
                <g fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.13">
                    <circle cx={C} cy={C} r={R - 34} />
                    {[-1, 0, 1].map(i => <path key={`a${i}`} d={`M${C - (R - 34)} ${C + i * 34} Q${C} ${C + i * 34 - 54} ${C + (R - 34)} ${C + i * 34}`} />)}
                    {[-1, 0, 1].map(i => <path key={`b${i}`} d={`M${C + i * 34} ${C - (R - 34)} Q${C + i * 34 + 54} ${C} ${C + i * 34} ${C + (R - 34)}`} />)}
                </g>
                {/* the day: a thin ring, the hours as ticks, daylight a little brighter */}
                <circle cx={C} cy={C} r={R} fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />
                <circle cx={C} cy={C} r={R - 9} fill="none" stroke="var(--text-muted)" strokeWidth="4" strokeDasharray={`1 ${(2 * Math.PI * (R - 9)) / 24 - 1}`} opacity="0.35" transform={`rotate(-90 ${C} ${C})`} />
                <path d={arc(at.sunrise, at.maghrib, R)} fill="none" stroke="var(--gold-dim)" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
                <path d={arc(at[current], nowAngle, R)} fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" />
                {PRAYER_ORDER.map(k => {
                    const [x, y] = point(at[k], R);
                    const [lx, ly] = point(at[k], R + 24);
                    const isNext = k === next.key, passed = times[k] <= now;
                    const side = Math.sin((at[k] * Math.PI) / 180);
                    const size = isNext ? 8 : 5.5;
                    return (
                        <g key={k}>
                            <rect x={x - size} y={y - size} width={size * 2} height={size * 2} transform={`rotate(45 ${x} ${y})`} fill={isNext ? 'var(--gold)' : passed ? 'var(--gold-dim)' : 'var(--page-plane)'} stroke="var(--gold)" strokeWidth="1.3" />
                            <text x={lx} y={ly} dy="0.35em" textAnchor={side > 0.25 ? 'start' : side < -0.25 ? 'end' : 'middle'} fontSize="15" fontFamily="var(--font-serif)" fontWeight={isNext ? 600 : 400} fill={isNext ? 'var(--gold)' : 'var(--text-muted)'}>{PRAYER_NAMES[k]}</text>
                        </g>
                    );
                })}
                {/* now: the sun by day, the moon by night */}
                <circle cx={sx} cy={sy} r="15" fill="var(--gold)" opacity="0.18" />
                {daylight
                    ? <circle cx={sx} cy={sy} r="8" fill="var(--gold)" stroke="var(--page-plane)" strokeWidth="2" />
                    : <g transform={`translate(${sx} ${sy})`}><circle r="8.5" fill="var(--gold)" stroke="var(--page-plane)" strokeWidth="2" /><circle cx="3.6" cy="-2.6" r="6.4" fill="var(--page-plane)" /></g>}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t('Кийинки намаз')}</div>
                <div className="font-display leading-none mt-1.5" style={{ fontSize: 'clamp(1.35rem, 5.6vw, 2rem)', color: 'var(--text-primary)' }}>{PRAYER_NAMES[next.key]}</div>
                <div className="font-display leading-none tabular gold-sheen mt-1" style={{ fontSize: 'clamp(2.6rem, 11.5vw, 4.1rem)' }}>{clock(next.at, city.tz)}</div>
                <div className="text-[0.85rem] mt-1.5" style={{ color: 'var(--text-muted)' }}>{untilText(next.at.getTime() - now.getTime())}</div>
            </div>
        </div>
    );
};
