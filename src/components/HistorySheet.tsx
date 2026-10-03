import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, PlusCircle, ShieldCheck, Home, Pencil } from 'lucide-react';
import type { DataFile } from '../types';
import type { AuthUser } from '../services/authService';
import type { AuditEntry } from '../services/dataService';
import { fetchAuditLog } from '../services/dataService';
import { Sheet } from './ui';
import { weekLabel } from '../utils/seasons';

interface HistorySheetProps {
    authUser: AuthUser;
    data: DataFile;
    onClose: () => void;
}

type Change = { key: string; from: number | null; to: number | null };

const diff = (before: Record<string, number> | undefined, after: Record<string, number> | undefined): Change[] => {
    const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
    const out: Change[] = [];
    keys.forEach(k => {
        const a = before?.[k] ?? null, b = after?.[k] ?? null;
        if (a !== b) out.push({ key: k, from: a, to: b });
    });
    return out;
};

const describe = (e: AuditEntry): { actual: Change[]; target: Change[] } => {
    if (e.tableName === 'weekly_metrics') {
        return { actual: diff(e.oldData?.actual, e.newData?.actual), target: diff(e.oldData?.target, e.newData?.target) };
    }
    const flat = (src: AuditEntry['oldData'], field: 'actual' | 'target') =>
        src?.activity ? Object.fromEntries(Object.entries(src.activity).map(([k, v]) => [k, Number(v?.[field] ?? 0)])) : undefined;
    return { actual: diff(flat(e.oldData, 'actual'), flat(e.newData, 'actual')), target: diff(flat(e.oldData, 'target'), flat(e.newData, 'target')) };
};

// Kyrgyz dates written out by hand — not every browser ships Kyrgyz locale data.
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const WEEKDAYS = ['жекшемби', 'дүйшөмбү', 'шейшемби', 'шаршемби', 'бейшемби', 'жума', 'ишемби'];
const dayLabel = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}-${MONTHS[d.getMonth()]}, ${WEEKDAYS[d.getDay()]}`;
};
const timeLabel = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const HistorySheet: React.FC<HistorySheetProps> = ({ authUser, data, onClose }) => {
    const isAdmin = authUser.role === 'admin';
    const [entries, setEntries] = useState<AuditEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [houseFilter, setHouseFilter] = useState<string>('all');

    // Names for ids, from every week (so people who left still have a name).
    const { memberName, houseName, houses } = useMemo(() => {
        const m = new Map<string, string>(), h = new Map<string, string>();
        data.weeks.forEach(w => w.teams.forEach(t => { h.set(t.id, t.name); t.members.forEach(x => m.set(x.id, x.name)); }));
        return { memberName: m, houseName: h, houses: [...h.entries()] };
    }, [data]);

    useEffect(() => {
        fetchAuditLog({ houseId: isAdmin ? null : authUser.houseId, limit: 400 })
            .then(setEntries)
            .catch(err => setError(err instanceof Error ? err.message : String(err)));
    }, [isAdmin, authUser.houseId]);

    const shown = (entries ?? []).filter(e => houseFilter === 'all' || e.houseId === houseFilter);
    const groups: Array<{ day: string; items: AuditEntry[] }> = [];
    shown.forEach(e => {
        const day = dayLabel(e.changedAt);
        const last = groups[groups.length - 1];
        if (last && last.day === day) last.items.push(e); else groups.push({ day, items: [e] });
    });

    return (
        <Sheet title="Өзгөртүүлөр тарыхы" onClose={onClose} width="46rem">
            <div className="px-4 sm:px-6 py-5">
                <p className="text-[0.84rem] mb-4" style={{ color: 'var(--text-muted)' }}>
                    {isAdmin ? 'Бардык үйлөрдүн ар бир сакталышы: ким, качан, эмнени өзгөрттү.' : 'Сиздин үйүңүздүн ар бир сакталышы: качан жана эмне өзгөрдү.'}
                </p>

                {isAdmin && houses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                        <button className="chip" aria-pressed={houseFilter === 'all'} onClick={() => setHouseFilter('all')}>Бардыгы</button>
                        {houses.map(([id, name]) => <button key={id} className="chip" aria-pressed={houseFilter === id} onClick={() => setHouseFilter(id)}>{name}</button>)}
                    </div>
                )}

                {error && (
                    <div className="card card-pad flex gap-3 items-start" role="alert">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--warning)' }} />
                        <p className="text-[0.88rem]" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                    </div>
                )}
                {!error && entries === null && (
                    <div className="flex items-center justify-center gap-2 py-12" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-5 h-5 animate-spin" /> Жүктөлүүдө…</div>
                )}
                {!error && entries && shown.length === 0 && (
                    <p className="text-center py-12 font-display text-[1.25rem]" style={{ color: 'var(--text-muted)' }}>Азырынча өзгөртүү жок.</p>
                )}

                <div className="space-y-6">
                    {groups.map(g => (
                        <section key={g.day}>
                            <div className="eyebrow mb-2" style={{ color: 'var(--gold)' }}>{g.day}</div>
                            <ol className="card overflow-hidden">
                                {g.items.map((e, i) => {
                                    const { actual, target } = describe(e);
                                    const subject = e.tableName === 'weekly_metrics' ? memberName.get(e.memberId ?? '') ?? 'Белгисиз мүчө' : 'Мини-карта';
                                    const actorIsAdmin = e.actorRole === 'admin';
                                    const actor = actorIsAdmin ? 'Админ' : e.actorHouseId ? houseName.get(e.actorHouseId) ?? 'Үй жетекчиси' : 'База';
                                    return (
                                        <li key={e.id} className="px-4 py-3" style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                                            <div className="flex items-start gap-3">
                                                <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: e.action === 'INSERT' ? 'var(--accent-soft)' : 'var(--gold-soft)', color: e.action === 'INSERT' ? 'var(--accent)' : 'var(--gold)' }}>
                                                    {e.action === 'INSERT' ? <PlusCircle className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline justify-between gap-2">
                                                        <span className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{subject}</span>
                                                        <span className="text-[0.75rem] tabular flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{timeLabel(e.changedAt)}</span>
                                                    </div>
                                                    <div className="text-[0.76rem] flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                                                        <span>{weekLabel(data, e.weekNumber)}</span>·
                                                        {e.tableName === 'house_activity' && <><span>{houseName.get(e.houseId ?? '') ?? ''}</span>·</>}
                                                        <span className="inline-flex items-center gap-1">{actorIsAdmin ? <ShieldCheck className="w-3 h-3" /> : <Home className="w-3 h-3" />}{actor}</span>·
                                                        <span>{e.action === 'INSERT' ? 'биринчи жолу киргизилди' : e.action === 'DELETE' ? 'өчүрүлдү' : 'өзгөртүлдү'}</span>
                                                    </div>
                                                    {e.action === 'UPDATE' && (actual.length > 0 || target.length > 0) && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {actual.map(c => (
                                                                <span key={`a${c.key}`} className="inline-flex items-center gap-1 text-[0.76rem] px-2 py-0.5 rounded-full tabular" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                                                    <b style={{ color: 'var(--text-primary)' }}>{c.key}</b> {c.from ?? '—'} <ArrowRight className="w-3 h-3" /> <b style={{ color: (c.to ?? 0) > (c.from ?? 0) ? 'var(--success)' : 'var(--danger)' }}>{c.to ?? '—'}</b>
                                                                </span>
                                                            ))}
                                                            {target.map(c => (
                                                                <span key={`t${c.key}`} className="inline-flex items-center gap-1 text-[0.76rem] px-2 py-0.5 rounded-full tabular" style={{ border: '1px dashed var(--border-strong)', color: 'var(--text-muted)' }}>
                                                                    План {c.key}: {c.from ?? '—'} <ArrowRight className="w-3 h-3" /> {c.to ?? '—'}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </section>
                    ))}
                </div>
            </div>
        </Sheet>
    );
};
