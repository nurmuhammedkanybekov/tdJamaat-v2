// Small shared building blocks for the redesigned views.
import React from 'react';
import { ArrowDown, ArrowUp, Minus, X } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { perfColor } from '../utils/style';

/** ▲2 / ▼1 / — : places gained since last week. */
export const Movement: React.FC<{ delta: number | null; size?: 'sm' | 'md'; onDark?: boolean }> = ({ delta, size = 'sm', onDark }) => {
    const fs = size === 'sm' ? '0.72rem' : '0.82rem';
    if (delta === null) return <span aria-hidden="true" style={{ width: '2.1em', display: 'inline-block' }} />;
    if (delta === 0) {
        return (
            <span className="inline-flex items-center justify-center tabular" title="Орду өзгөргөн жок" aria-label="Орду өзгөргөн жок"
                style={{ fontSize: fs, color: onDark ? 'var(--hero-muted)' : 'var(--text-muted)', minWidth: '2.1em' }}>
                <Minus style={{ width: '0.9em', height: '0.9em' }} />
            </span>
        );
    }
    const up = delta > 0;
    const color = up ? 'var(--success)' : 'var(--danger)';
    const label = up ? `${delta} орунга көтөрүлдү` : `${-delta} орунга түштү`;
    return (
        <span className="inline-flex items-center gap-[1px] font-bold tabular" title={label} aria-label={label}
            style={{ fontSize: fs, color: onDark ? (up ? '#7fe0b4' : '#ff9d8f') : color, minWidth: '2.1em' }}>
            {up ? <ArrowUp style={{ width: '0.95em', height: '0.95em' }} strokeWidth={2.6} /> : <ArrowDown style={{ width: '0.95em', height: '0.95em' }} strokeWidth={2.6} />}
            {Math.abs(delta)}
        </span>
    );
};

/** Tiny trend line — a person's or house's score over the weeks. */
export const Sparkline: React.FC<{ values: number[]; color?: string; width?: number; height?: number; label?: string }> = ({ values, color = 'var(--accent)', width = 64, height = 22, label }) => {
    if (values.length < 2) return <span style={{ display: 'inline-block', width, height }} aria-hidden="true" />;
    const max = Math.max(...values), min = Math.min(...values);
    const span = max - min || 1;
    const pad = 2;
    const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const last = pts[pts.length - 1];
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ?? 'Тренд'} style={{ overflow: 'visible', flexShrink: 0 }}>
            <path d={`${d} L${last[0]},${height} L${pts[0][0]},${height} Z`} fill={color} opacity={0.1} />
            <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={last[0]} cy={last[1]} r={2.2} fill={color} />
        </svg>
    );
};

/** Section heading: small caps eyebrow, display title, optional action on the right. */
export const SectionHeader: React.FC<{ eyebrow?: string; title: React.ReactNode; action?: React.ReactNode; sub?: React.ReactNode; className?: string }> = ({ eyebrow, title, action, sub, className }) => (
    <div className={`flex items-end justify-between gap-3 flex-wrap mb-4 ${className ?? ''}`}>
        <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-1" style={{ color: 'var(--gold)' }}>{eyebrow}</div>}
            <h2 className="section-title">{title}</h2>
            {sub && <p className="text-[0.85rem] mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        {action}
    </div>
);

/** Horizontal progress bar toward a target (100% = full; beyond shows an overflow mark). */
export const ProgressBar: React.FC<{ pct: number; color?: string; height?: number }> = ({ pct, color, height = 6 }) => {
    const shown = Math.max(0, Math.min(pct, 100));
    const c = color ?? perfColor(pct);
    return (
        <div className="relative w-full overflow-hidden" style={{ height, borderRadius: 999, backgroundColor: 'var(--gridline)' }}>
            <div className="h-full animate-grow-x" style={{ width: `${shown}%`, backgroundColor: c, borderRadius: 999 }} />
        </div>
    );
};


/** Recharts tooltip in the site's style (works in both themes). */
export const ChartTooltip: React.FC<{
    active?: boolean;
    payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string | number; payload?: Record<string, unknown> }>;
    label?: string | number;
    unit?: string;
}> = ({ active, payload, label, unit }) => {
    if (!active || !payload?.length) return null;
    const rows = [...payload].filter(p => p.value !== null && p.value !== undefined).sort((a, b) => Number(b.value) - Number(a.value));
    return (
        <div className="animate-fade-in" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-lift)', padding: '0.6rem 0.75rem', minWidth: 140 }}>
            {label !== undefined && <div className="font-display font-bold mb-1" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{label}</div>}
            {rows.map(p => (
                <div key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4 text-[0.8rem] py-[1px]">
                    <span className="flex items-center gap-1.5 min-w-0" style={{ color: 'var(--text-secondary)' }}>
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="truncate">{p.name}</span>
                    </span>
                    <span className="font-bold tabular" style={{ color: 'var(--text-primary)' }}>{typeof p.value === 'number' ? Math.round(p.value * 10) / 10 : p.value}{unit ?? ''}</span>
                </div>
            ))}
        </div>
    );
};


/**
 * Modal sheet: slides up as a full-height sheet on phones, a centered
 * dialog from `sm` up. Header, scrolling body and an optional footer.
 */
export const Sheet: React.FC<{
    title: React.ReactNode;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: string;
    headerExtra?: React.ReactNode;
    bare?: boolean;
}> = ({ title, onClose, children, footer, width = '44rem', headerExtra, bare }) => {
    useModal(onClose);
    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 animate-fade-in"
            style={{ backgroundColor: 'color-mix(in oklab, #0b141b 55%, transparent)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="w-full flex flex-col overflow-hidden animate-sheet-up max-h-[94dvh] sm:max-h-[90vh] rounded-t-[16px] sm:rounded-[14px]"
                style={{ maxWidth: width, backgroundColor: 'var(--page-plane)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lift)' }}
            >
                {!bare && (
                    <div className="relative flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3.5" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                        <div className="sm:hidden absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-strong)' }} aria-hidden="true" />
                        <h2 className="font-display font-bold text-[1.35rem] leading-tight truncate flex-1 min-w-0" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                        {headerExtra}
                        <button onClick={onClose} aria-label="Жабуу" className="btn btn-ghost btn-icon flex-shrink-0 -mr-1">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ paddingBottom: footer ? undefined : 'env(safe-area-inset-bottom, 0px)' }}>
                    {children}
                </div>
                {footer && (
                    <div className="flex-shrink-0 px-4 sm:px-6 pt-3" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

/** Skeleton of the dashboard shown while data loads — no layout jump when it arrives. */
export const LoadingScreen: React.FC = () => (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-plane)' }} aria-busy="true" aria-label="Жүктөлүүдө">
        <div className="hero page-gutter" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
            <div className="app-container py-6 sm:py-10">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 rounded-[10px]" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    <div className="h-6 w-32 rounded" style={{ background: 'rgba(255,255,255,0.1)' }} />
                </div>
                <div className="h-12 w-48 rounded mb-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="h-4 w-72 max-w-full rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
        </div>
        <div className="page-gutter">
            <div className="app-container -mt-6 grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map(i => (
                    <div key={i} className="card card-pad">
                        <div className="flex items-center gap-3">
                            <div className="skeleton w-14 h-14 rounded-full" />
                            <div className="flex-1 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" /></div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="app-container mt-6 card card-pad space-y-4">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="skeleton w-6 h-4" /><div className="skeleton w-9 h-9 rounded-full" />
                        <div className="skeleton h-4 flex-1" /><div className="skeleton h-4 w-12" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

/** Empty / error state card. */
export const StateCard: React.FC<{ title: string; text: string; action?: React.ReactNode }> = ({ title, text, action }) => (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--page-plane)' }}>
        <div className="card card-pad max-w-md text-center">
            <img src="/favicon.svg" alt="" className="w-14 h-14 mx-auto mb-4 rounded-[14px]" />
            <h2 className="font-display text-[1.8rem] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{text}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    </div>
);
