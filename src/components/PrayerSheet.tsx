import React, { useMemo, useState } from 'react';
import type { City } from '../utils/prayer';
import { CITIES, PRAYER_NAMES, PRAYER_ORDER, clock, nextPrayer, prayerTimes, untilText } from '../utils/prayer';
import { formatHijri, isRamadan, toHijri } from '../utils/hijri';
import { Sheet } from './ui';
import { loadCity, saveCity } from '../utils/city';
import { useNow } from '../hooks/useNow';


const WEEKDAYS = ['Жш', 'Дш', 'Шш', 'Шр', 'Бш', 'Жм', 'Иш'];
// Short column heads so the week table fits a phone without scrolling.
const SHORT: Record<string, string> = { fajr: 'Баг.', sunrise: 'Күн ч.', dhuhr: 'Беш.', asr: 'Аср', maghrib: 'Шам', isha: 'Куп.' };
const CELL: React.CSSProperties = { paddingLeft: '0.3rem', paddingRight: '0.3rem', textAlign: 'right' };

export const PrayerSheet: React.FC<{ onClose: () => void; onCityChange?: (c: City) => void }> = ({ onClose, onCityChange }) => {
    const [city, setCity] = useState<City>(loadCity);
    const now = useNow();
    const times = useMemo(() => prayerTimes(city, now), [city, now]);
    const next = nextPrayer(city, now);
    const hijri = toHijri(now);
    const ramadan = isRamadan(hijri);
    const week = useMemo(() => Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(now.getTime() + i * 86400000);
        return { d, t: prayerTimes(city, d), h: toHijri(d) };
    }), [city, now]);
    const pick = (c: City) => { setCity(c); saveCity(c); onCityChange?.(c); };

    return (
        <Sheet title="Намаз убактылары" onClose={onClose} width="36rem">
            <div className="px-5 sm:px-7 py-6 space-y-8">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                        <div className="eyebrow">{hijri ? formatHijri(hijri) : ''}</div>
                        <div className="font-display text-[1.5rem] mt-1" style={{ color: 'var(--text-primary)' }}>{city.name}</div>
                    </div>
                    <div className="flex" role="group" aria-label="Шаар">
                        {CITIES.map(c => <button key={c.id} className={`chip ${c.id === city.id ? 'is-active' : ''}`} onClick={() => pick(c)}>{c.name}</button>)}
                    </div>
                </div>

                {ramadan && (
                    <div className="grid grid-cols-2 text-center py-4" style={{ borderTop: '1px solid var(--gold)', borderBottom: '1px solid var(--gold)' }}>
                        <div>
                            <div className="eyebrow">Сахар</div>
                            <div className="text-[0.75rem] italic mt-0.5" style={{ color: 'var(--text-muted)' }}>оозун бекитүү</div>
                            <div className="font-display text-[2.4rem] leading-none mt-2 tabular" style={{ color: 'var(--gold)' }}>{clock(times.fajr, city.tz)}</div>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border)' }}>
                            <div className="eyebrow">Ифтар</div>
                            <div className="text-[0.75rem] italic mt-0.5" style={{ color: 'var(--text-muted)' }}>ооз ачуу</div>
                            <div className="font-display text-[2.4rem] leading-none mt-2 tabular" style={{ color: 'var(--gold)' }}>{clock(times.maghrib, city.tz)}</div>
                        </div>
                    </div>
                )}

                <div className="text-center">
                    <div className="eyebrow">Кийинки намаз</div>
                    <div className="font-display text-[2.6rem] leading-none mt-2" style={{ color: 'var(--text-primary)' }}>{PRAYER_NAMES[next.key]} <span className="tabular" style={{ color: 'var(--gold)' }}>{clock(next.at, city.tz)}</span></div>
                    <div className="text-[0.9rem] italic mt-2" style={{ color: 'var(--text-muted)' }}>{untilText(next.at.getTime() - now.getTime())} калды</div>
                </div>

                <ol>
                    {PRAYER_ORDER.map(k => {
                        const isNext = k === next.key && next.at.toDateString() === now.toDateString();
                        return (
                            <li key={k} className="flex items-baseline gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                                <span className="font-display text-[1.35rem]" style={{ color: isNext ? 'var(--gold)' : k === 'sunrise' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{PRAYER_NAMES[k]}</span>
                                <span className="leader" />
                                <span className="font-display text-[1.45rem] tabular" style={{ color: isNext ? 'var(--gold)' : 'var(--text-primary)' }}>{clock(times[k], city.tz)}</span>
                            </li>
                        );
                    })}
                </ol>

                <div className="overflow-x-auto -mx-1">
                    <table className="data-table w-full" style={{ minWidth: 330 }}>
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: "0.3rem" }}><span className="sr-only">Күн</span></th>
                                {PRAYER_ORDER.map(k => <th key={k} style={{ ...CELL, letterSpacing: '0.06em' }} title={PRAYER_NAMES[k]} aria-label={PRAYER_NAMES[k]}>{SHORT[k] ?? PRAYER_NAMES[k]}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {week.map(({ d, t, h }, i) => (
                                <tr key={i} style={i === 0 ? { color: 'var(--gold)' } : undefined}>
                                    <td className="whitespace-nowrap" style={{ paddingLeft: "0.3rem" }}>{WEEKDAYS[d.getDay()]} <span className="text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>{h ? h.day : ''}</span></td>
                                    {PRAYER_ORDER.map(k => <td key={k} className="tabular text-[0.88rem]" style={CELL}>{clock(t[k], city.tz)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="text-[0.8rem] italic" style={{ color: 'var(--text-muted)' }}>
                    Убакыттар телефондун өзүндө эсептелет (Дүйнөлүк мусулман лигасы, Ханафи мазхабы, интернетсиз да иштейт). Жергиликтүү мечиттин жадыбалынан 1–2 мүнөткө айырмаланышы мүмкүн. Хижрий датасы Умм аль-Кура календары боюнча.
                </p>
            </div>
        </Sheet>
    );
};
