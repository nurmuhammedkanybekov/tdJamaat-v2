// Small shared building blocks for the redesigned views.
import React from 'react';
import { ArrowDown, ArrowUp, Minus, X } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { perfColor } from '../utils/style';
import { Crown, Mark } from './Ornament';

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
        <span className="inline-flex items-center gap-[1px] tabular" title={label} aria-label={label}
            style={{ fontSize: fs, color: onDark ? (up ? '#7fe0b4' : '#ff9d8f') : color, minWidth: '2.1em' }}>
            {up ? <ArrowUp style={{ width: '0.9em', height: '0.9em' }} strokeWidth={1.6} /> : <ArrowDown style={{ width: '0.9em', height: '0.9em' }} strokeWidth={1.6} />}
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
            <path d={d} fill="none" stroke={color} strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={last[0]} cy={last[1]} r={1.8} fill={color} />
        </svg>
    );
};

/** Section heading: small caps eyebrow, display title, optional action on the right. */
export const SectionHeader: React.FC<{ eyebrow?: string; title: React.ReactNode; action?: React.ReactNode; sub?: React.ReactNode; className?: string }> = ({ eyebrow, title, action, sub, className }) => (
    <div className={`flex items-end justify-between gap-3 flex-wrap mb-6 ${className ?? ''}`}>
        <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
            <h2 className="section-title">{title}</h2>
            {sub && <p className="text-[0.85rem] mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        {action}
    </div>
);

/** Horizontal progress bar toward a target (100% = full; beyond shows an overflow mark). */
export const ProgressBar: React.FC<{ pct: number; color?: string; height?: number }> = ({ pct, color, height = 2 }) => {
    const shown = Math.max(0, Math.min(pct, 100));
    const c = color ?? perfColor(pct);
    return (
        <div className="relative w-full overflow-hidden" style={{ height, backgroundColor: 'var(--border)' }}>
            <div className="h-full animate-grow-x" style={{ width: `${shown}%`, backgroundColor: c }} />
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
        <div className="animate-fade-in" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lift)', padding: '0.7rem 0.9rem', minWidth: 150 }}>
            {label !== undefined && <div className="eyebrow mb-2">{label}</div>}
            {rows.map(p => (
                <div key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4 text-[0.8rem] py-[1px]">
                    <span className="flex items-center gap-1.5 min-w-0" style={{ color: 'var(--text-secondary)' }}>
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="truncate">{p.name}</span>
                    </span>
                    <span className="font-display text-[1rem] tabular" style={{ color: 'var(--text-primary)' }}>{typeof p.value === 'number' ? Math.round(p.value * 10) / 10 : p.value}{unit ?? ''}</span>
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
            style={{ backgroundColor: 'color-mix(in oklab, #000 62%, transparent)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="w-full flex flex-col overflow-hidden animate-sheet-up max-h-[94dvh] sm:max-h-[90vh] rounded-t-[6px] sm:rounded-[3px]"
                style={{ maxWidth: width, backgroundColor: 'var(--page-plane)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lift)' }}
            >
                {!bare && (
                    <div className="relative flex-shrink-0 flex items-center gap-3 px-5 sm:px-7 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                        <h2 className="font-display text-[1.35rem] sm:text-[1.6rem] leading-tight truncate flex-1 min-w-0" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                        {headerExtra}
                        <button onClick={onClose} aria-label="Жабуу" className="w-10 h-10 inline-flex items-center justify-center flex-shrink-0 -mr-2 transition-colors hover:text-[var(--gold)]" style={{ color: 'var(--text-muted)' }}>
                            <X className="w-5 h-5" strokeWidth={1.3} />
                        </button>
                    </div>
                )}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ paddingBottom: footer ? undefined : 'env(safe-area-inset-bottom, 0px)' }}>
                    {children}
                </div>
                {footer && (
                    <div className="flex-shrink-0 px-5 sm:px-7 pt-3" style={{ borderTop: '1px solid var(--border)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

/** Loading: the crown draws itself while data arrives. */
export const LoadingScreen: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ backgroundColor: 'var(--page-plane)' }} aria-busy="true" aria-label="Жүктөлүүдө">
        <Mark size={72} className="animate-fade-in" style={{ color: 'var(--gold)' }} />
        <Crown className="draw-in w-[min(16rem,64%)] h-auto -mt-2" style={{ color: 'var(--gold-dim)' }} />
        <div className="font-display text-[1.6rem]" style={{ color: 'var(--text-primary)' }}>tdJamaat</div>
        <div className="eyebrow">Жүктөлүүдө</div>
    </div>
);

/** Empty / error state card. */
export const StateCard: React.FC<{ title: string; text: string; action?: React.ReactNode }> = ({ title, text, action }) => (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--page-plane)' }}>
        <div className="max-w-md text-center flex flex-col items-center">
            <Mark size={64} style={{ color: 'var(--gold)' }} />
            <h2 className="font-display text-[2.2rem] mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{text}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    </div>
);
