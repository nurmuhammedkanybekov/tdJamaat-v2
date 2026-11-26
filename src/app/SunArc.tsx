// The day as the sun's path: a half circle from sunrise to Maghrib with
// Dhuhr and Asr on it, Fajr and Isha on the horizon at either end, and the
// sun (or, at night, the moon) where it is now.
import React from 'react';
import type { PrayerKey } from '../utils/prayer';
import { PRAYER_NAMES, clock } from '../utils/prayer';

const W = 340, H = 190, CX = 170, CY = 150, R = 118;

export const SunArc: React.FC<{ times: Record<PrayerKey, Date>; now: Date; tz: string; current: PrayerKey | null }> = ({ times, now, tz, current }) => {
    const rise = times.sunrise.getTime(), set = times.maghrib.getTime();
    const u = (d: Date) => Math.min(1, Math.max(0, (d.getTime() - rise) / (set - rise)));
    const onArc = (v: number) => ({ x: CX - R * Math.cos(Math.PI * v), y: CY - R * Math.sin(Math.PI * v) });
    const day = now.getTime() >= rise && now.getTime() <= set;
    const sun = onArc(u(now));
    const marks: Array<{ k: PrayerKey; x: number; y: number; below?: boolean }> = [
        { k: 'fajr', x: 18, y: CY },
        { k: 'sunrise', ...onArc(0), below: true },
        { k: 'dhuhr', ...onArc(u(times.dhuhr)) },
        { k: 'asr', ...onArc(u(times.asr)) },
        { k: 'maghrib', ...onArc(1), below: true },
        { k: 'isha', x: W - 18, y: CY }
    ];
    // At night the moon travels the horizon from Isha's side back towards Fajr's.
    const nightX = now.getTime() > set ? CX + R * 0.62 : CX - R * 0.62;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="sun-arc" role="img" aria-label={marks.map(m => `${PRAYER_NAMES[m.k]} ${clock(times[m.k], tz)}`).join(', ')}>
            <line x1="4" x2={W - 4} y1={CY} y2={CY} className="sun-arc-horizon" />
            <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} className="sun-arc-path" />
            {(day || now.getTime() > set) && <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${day ? sun.x : CX + R} ${day ? sun.y : CY}`} className="sun-arc-done" />}
            {marks.map(m => {
                const on = m.k === current;
                return (
                    <g key={m.k}>
                        <rect x={m.x - 4.5} y={m.y - 4.5} width="9" height="9" transform={`rotate(45 ${m.x} ${m.y})`} className={`sun-arc-mark ${on ? 'is-on' : ''} ${times[m.k] <= now ? 'is-past' : ''}`} />
                        <text x={m.x} y={m.below ? m.y + 20 : m.y - 22} textAnchor="middle" className={`sun-arc-name ${on ? 'is-on' : ''}`}>{PRAYER_NAMES[m.k]}</text>
                        <text x={m.x} y={m.below ? m.y + 34 : m.y - 9} textAnchor="middle" className={`sun-arc-time ${on ? 'is-on' : ''}`}>{clock(times[m.k], tz)}</text>
                    </g>
                );
            })}
            {day
                ? <g className="sun-arc-sun"><circle cx={sun.x} cy={sun.y} r="13" className="halo" /><circle cx={sun.x} cy={sun.y} r="7" /></g>
                : <g className="sun-arc-moon" transform={`translate(${nightX} ${CY - 34})`}><circle r="8" /><circle r="7" cx="4" cy="-3" className="cut" /></g>}
        </svg>
    );
};
