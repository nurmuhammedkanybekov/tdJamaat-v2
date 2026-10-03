import React, { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronRight } from 'lucide-react';
import type { DataFile } from '../types';
import type { Insights } from '../utils/insights';
import { METRICS, ROLE_LABEL, weekOf } from '../utils/insights';
import type { Award } from '../utils/badges';
import type { CompareKind, CompareRow } from '../utils/compare';
import { defaultRival, headToHead, houseRows, metricAverages, personRows, rowWinner } from '../utils/compare';
import { Avatar } from './Avatar';
import { Medallion } from './Ornament';
import { ChartTooltip, Sheet } from './ui';
import { axisTick, scoreDomain } from '../utils/style';

export interface CompareInit {
    kind: CompareKind;
    /** Pre-selected left side (member or house id). */
    a?: string;
}

interface CompareSheetProps {
    data: DataFile;
    insights: Insights;
    awards: Award[];
    weekIndex: number;
    init: CompareInit;
    onClose: () => void;
}

const COLOR_A = 'var(--gold)';
const COLOR_B = 'var(--text-primary)';

const show = (row: CompareRow, v: number | null) =>
    v === null ? '—' : row.format === 'rank' ? `${v}-орун` : row.format === 'pct' ? `${v}%` : String(v);

/** The chosen name in display type, with a transparent native select on top
 *  (keeps the phone's own picker, and the name can wrap instead of being cut). */
const Picker: React.FC<{ value: string; text: string; onChange: (v: string) => void; label: string; color: string; align: 'left' | 'right'; children: React.ReactNode }> = ({ value, text, onChange, label, color, align, children }) => (
    <label className={`relative inline-block max-w-full cursor-pointer transition-opacity hover:opacity-80 ${align === 'right' ? 'text-right' : 'text-left'}`}>
        <span className="font-display text-[1.25rem] sm:text-[1.6rem] leading-tight break-words" style={{ color }}>
            {text.split(' ').slice(0, -1).join(' ')}{text.includes(' ') ? ' ' : ''}
            <span className="whitespace-nowrap">
                {text.split(' ').slice(-1)[0]}
                <ChevronRight className="inline-block w-3.5 h-3.5 rotate-90 ml-1.5 align-middle" style={{ color: 'var(--text-muted)' }} />
            </span>
        </span>
        <select value={value} onChange={e => onChange(e.target.value)} aria-label={label} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
            {children}
        </select>
    </label>
);

/** Two bars that meet in the middle, each as long as its share. */
const SplitBar: React.FC<{ a: number; b: number; winner: 'a' | 'b' | null }> = ({ a, b, winner }) => {
    const total = Math.abs(a) + Math.abs(b);
    const pa = total ? (Math.abs(a) / total) * 100 : 50;
    return (
        <div className="flex h-[2px] mt-2" aria-hidden>
            <div className="flex-1 flex justify-end"><div style={{ width: `${pa}%`, backgroundColor: winner === 'a' ? COLOR_A : 'var(--border-strong)' }} /></div>
            <div className="w-px" />
            <div className="flex-1"><div style={{ width: `${100 - pa}%`, height: '100%', backgroundColor: winner === 'b' ? COLOR_B : 'var(--border-strong)' }} /></div>
        </div>
    );
};

const Row: React.FC<{ row: CompareRow }> = ({ row }) => {
    const w = rowWinner(row);
    // Places: a smaller number is better, so the bar uses the inverse.
    const bar = row.lowerBetter
        ? { a: row.a ? 1 / row.a : 0, b: row.b ? 1 / row.b : 0 }
        : { a: row.a ?? 0, b: row.b ?? 0 };
    return (
        <div className="py-3.5" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
                <span className="text-right font-display text-[1.35rem] sm:text-[1.6rem] leading-none" style={{ color: w === 'a' ? COLOR_A : 'var(--text-secondary)' }}>{show(row, row.a)}</span>
                <span className="eyebrow text-center w-[7.5rem] sm:w-[10rem]">{row.label}</span>
                <span className="text-left font-display text-[1.35rem] sm:text-[1.6rem] leading-none" style={{ color: w === 'b' ? COLOR_B : 'var(--text-secondary)', fontWeight: w === 'b' ? 500 : undefined }}>{show(row, row.b)}</span>
            </div>
            {row.a !== null && row.b !== null && <SplitBar a={bar.a} b={bar.b} winner={w} />}
        </div>
    );
};

export const CompareSheet: React.FC<CompareSheetProps> = ({ data, insights, awards, weekIndex, init, onClose }) => {
    const [kind, setKind] = useState<CompareKind>(init.kind);

    // People ordered by house, then by this week's score; houses by this week's rank.
    const people = useMemo(() => [...insights.members.values()].sort((x, y) => {
        const wx = weekOf(x.weeks, weekIndex), wy = weekOf(y.weeks, weekIndex);
        return (wy?.score ?? -1) - (wx?.score ?? -1);
    }), [insights, weekIndex]);
    const houses = useMemo(() => [...insights.houses.values()].sort((x, y) =>
        (weekOf(x.weeks, weekIndex)?.rank ?? 99) - (weekOf(y.weeks, weekIndex)?.rank ?? 99) || x.colorIndex - y.colorIndex
    ), [insights, weekIndex]);
    const houseNames = useMemo(() => [...new Set(people.map(p => p.houseName))].sort((x, y) => x.localeCompare(y)), [people]);

    const pickPair = (k: CompareKind, a?: string): [string, string] => {
        const ids = k === 'person' ? people.map(p => p.id) : houses.map(h => h.id);
        const first = a && ids.includes(a) ? a : ids[0];
        return [first ?? '', defaultRival(ids, first) ?? ''];
    };
    const [pair, setPair] = useState<Record<CompareKind, [string, string]>>(() => ({
        person: pickPair('person', init.kind === 'person' ? init.a : undefined),
        house: pickPair('house', init.kind === 'house' ? init.a : undefined)
    }));
    const [aId, bId] = pair[kind];
    const setSide = (side: 0 | 1, id: string) => setPair(p => {
        const next: [string, string] = [...p[kind]];
        next[side] = id;
        // Picking the same one on both sides: swap instead.
        if (next[0] === next[1]) next[1 - side] = p[kind][side];
        return { ...p, [kind]: next };
    });

    const pa = insights.members.get(aId), pb = insights.members.get(bId);
    const ha = insights.houses.get(aId), hb = insights.houses.get(bId);
    const enough = kind === 'person' ? people.length >= 2 : houses.length >= 2;

    const rows = kind === 'person'
        ? (pa && pb ? personRows(pa, pb, insights, awards, weekIndex, data.weeks.length) : [])
        : (ha && hb ? houseRows(ha, hb, insights, awards, weekIndex) : []);
    const h2h = kind === 'person'
        ? (pa && pb ? headToHead(pa.weeks, pb.weeks, w => w.score) : null)
        : (ha && hb ? headToHead(ha.weeks, hb.weeks, w => w.avg) : null);
    const metrics = kind === 'person' && pa && pb ? { a: metricAverages(pa), b: metricAverages(pb) } : null;

    const nameA = kind === 'person' ? pa?.name : ha?.name;
    const nameB = kind === 'person' ? pb?.name : hb?.name;
    const chartData = data.weeks.map((w, i) => {
        const val = (id: string) => {
            if (kind === 'person') { const mw = weekOf(insights.members.get(id)?.weeks ?? [], i); return mw?.submitted ? Math.round(mw.score * 10) / 10 : null; }
            const hw = weekOf(insights.houses.get(id)?.weeks ?? [], i); return hw?.submitted ? hw.avg : null;
        };
        return { week: `${w.weekNumber}-апта`, a: val(aId), b: val(bId) };
    });
    const chartPoints = chartData.filter(p => p.a !== null || p.b !== null).length;

    const personOptions = houseNames.map(hn => (
        <optgroup key={hn} label={hn}>
            {people.filter(p => p.houseName === hn).map(p => <option key={p.id} value={p.id} style={{ color: '#141413' }}>{p.name}</option>)}
        </optgroup>
    ));
    const houseOptions = houses.map(h => <option key={h.id} value={h.id} style={{ color: '#141413' }}>{h.name}</option>);

    return (
        <Sheet
            title="Салыштыруу"
            onClose={onClose}
            width="44rem"
            headerExtra={
                <div className="flex" role="group" aria-label="Эмнени салыштыруу">
                    <button className={`chip ${kind === 'person' ? 'is-active' : ''}`} onClick={() => setKind('person')}>Адамдар</button>
                    <button className={`chip ${kind === 'house' ? 'is-active' : ''}`} onClick={() => setKind('house')}>Үйлөр</button>
                </div>
            }
        >
            {!enough ? (
                <p className="px-5 sm:px-7 py-10 italic text-center" style={{ color: 'var(--text-muted)' }}>Салыштыруу үчүн жок дегенде экөө керек.</p>
            ) : (
                <div className="px-5 sm:px-7 py-7 space-y-10">
                    {/* The two sides */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="min-w-0 flex flex-col items-end text-right">
                            {kind === 'person' && pa && <Avatar name={pa.name} role={pa.role} photoUrl={pa.photoUrl} size="lg" />}
                            <div className="mt-2 max-w-full">
                                <Picker value={aId} onChange={v => setSide(0, v)} text={nameA ?? ''} label="Биринчиси" color={COLOR_A} align="right">{kind === 'person' ? personOptions : houseOptions}</Picker>
                            </div>
                            {kind === 'person' && pa && <div className="eyebrow mt-1 max-w-full">{ROLE_LABEL[pa.role]} · {pa.houseName}</div>}
                        </div>
                        <div className="flex flex-col items-center" aria-hidden>
                            <Medallion className="w-9 h-9" style={{ color: 'var(--gold-dim)' }} />
                            <span className="eyebrow mt-1">vs</span>
                        </div>
                        <div className="min-w-0 flex flex-col items-start text-left">
                            {kind === 'person' && pb && <Avatar name={pb.name} role={pb.role} photoUrl={pb.photoUrl} size="lg" />}
                            <div className="mt-2 max-w-full">
                                <Picker value={bId} onChange={v => setSide(1, v)} text={nameB ?? ''} label="Экинчиси" color={COLOR_B} align="left">{kind === 'person' ? personOptions : houseOptions}</Picker>
                            </div>
                            {kind === 'person' && pb && <div className="eyebrow mt-1 max-w-full">{ROLE_LABEL[pb.role]} · {pb.houseName}</div>}
                        </div>
                    </div>

                    {/* Head to head */}
                    {h2h && h2h.a + h2h.b + h2h.draws > 0 && (
                        <div className="text-center">
                            <div className="eyebrow">Бет маңдай · ким көп апта жеңди</div>
                            <div className="flex items-baseline justify-center gap-4 mt-3">
                                <span className="font-display text-[3rem] leading-none tabular" style={{ color: COLOR_A }}>{h2h.a}</span>
                                <span className="font-display text-[1.5rem]" style={{ color: 'var(--text-muted)' }}>:</span>
                                <span className="font-display text-[3rem] leading-none tabular" style={{ color: COLOR_B }}>{h2h.b}</span>
                            </div>
                            {h2h.draws > 0 && <div className="text-[0.8rem] italic mt-1" style={{ color: 'var(--text-muted)' }}>{h2h.draws} апта тең</div>}
                        </div>
                    )}

                    {/* Numbers */}
                    <section>{rows.map(r => <Row key={r.label} row={r} />)}</section>

                    {/* Per-metric, people only */}
                    {metrics && (
                        <section>
                            <h3 className="font-display text-[1.4rem] mb-1" style={{ color: 'var(--text-primary)' }}>Көрсөткүчтөр</h3>
                            <p className="text-[0.8rem] italic mb-3" style={{ color: 'var(--text-muted)' }}>Сезон бою планды орточо канча пайыз аткарды. Ар кимдин планы ролуна жараша.</p>
                            {METRICS.map(m => <Row key={m} row={{ label: m, a: metrics.a[m], b: metrics.b[m], format: 'pct' }} />)}
                        </section>
                    )}

                    {/* Trend */}
                    <section>
                        <h3 className="font-display text-[1.4rem] mb-1" style={{ color: 'var(--text-primary)' }}>Апта сайын</h3>
                        <div className="flex flex-wrap gap-4 text-[0.8rem] mb-3" style={{ color: 'var(--text-muted)' }}>
                            <span className="inline-flex items-center gap-2"><span className="w-5 h-px" style={{ backgroundColor: COLOR_A }} />{nameA}</span>
                            <span className="inline-flex items-center gap-2"><span className="w-5 border-t border-dashed" style={{ borderColor: COLOR_B }} />{nameB}</span>
                        </div>
                        {chartPoints >= 2 ? (
                            <div className="-ml-3">
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                                        <CartesianGrid stroke="var(--gridline)" vertical={false} />
                                        <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} />
                                        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} domain={scoreDomain} />
                                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
                                        <Line type="monotone" dataKey="a" name={nameA} stroke={COLOR_A} strokeWidth={1.6} dot={{ r: 2.5, strokeWidth: 0, fill: COLOR_A }} connectNulls />
                                        <Line type="monotone" dataKey="b" name={nameB} stroke={COLOR_B} strokeWidth={1.3} strokeDasharray="4 4" dot={{ r: 2.5, strokeWidth: 0, fill: COLOR_B }} connectNulls />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="italic" style={{ color: 'var(--text-muted)' }}>Динамика эки аптадан кийин көрүнөт.</p>
                        )}
                    </section>
                </div>
            )}
        </Sheet>
    );
};
