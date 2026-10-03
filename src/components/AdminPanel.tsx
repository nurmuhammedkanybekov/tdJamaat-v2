import React, { useEffect, useState } from 'react';
import { AlertCircle, CalendarPlus, CheckCircle2, Download, Loader2, Lock, LockOpen, Save, Target } from 'lucide-react';
import type { DataFile, MetricValues, MiniCard, Role } from '../types';
import type { SeasonSettings } from '../services/dataService';
import { applyTargetsFromWeek, exportBackup, fetchSeasonSettings, openWeek, saveSeasonSettings, setWeekLocked, DEFAULT_MINICARD, DEFAULT_TARGETS } from '../services/dataService';
import { requireActiveSession } from '../services/authService';
import { METRICS, ROLE_LABEL } from '../utils/insights';
import { NumberInput } from './NumberInput';
import { Sheet } from './ui';

interface AdminPanelProps {
    data: DataFile;
    onClose: () => void;
    onChanged: () => void;
}

type Tab = 'weeks' | 'targets' | 'backup';
const ROLES: Role[] = ['imam', 'zam', 'member'];
const inputStyle: React.CSSProperties = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)' };

const Notice: React.FC<{ kind: 'error' | 'ok'; text: string }> = ({ kind, text }) => (
    <div role={kind === 'error' ? 'alert' : 'status'} className="flex items-start gap-2 text-[0.85rem] px-3 py-2.5 rounded-[8px] mb-4" style={{ backgroundColor: kind === 'error' ? 'color-mix(in oklab, var(--danger) 10%, transparent)' : 'color-mix(in oklab, var(--success) 10%, transparent)', color: kind === 'error' ? 'var(--danger)' : 'var(--success)' }}>
        {kind === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
        <p className="min-w-0 break-words">{text}</p>
    </div>
);

export const AdminPanel: React.FC<AdminPanelProps> = ({ data, onClose, onChanged }) => {
    const [tab, setTab] = useState<Tab>('weeks');
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const [settings, setSettings] = useState<SeasonSettings | null>(null);
    const [roleTargets, setRoleTargets] = useState<Record<Role, MetricValues>>(DEFAULT_TARGETS);
    const [cardTargets, setCardTargets] = useState<Record<keyof MiniCard, number>>(() => Object.fromEntries(Object.entries(DEFAULT_MINICARD).map(([k, v]) => [k, v.target])) as Record<keyof MiniCard, number>);
    const [applyExisting, setApplyExisting] = useState(false);
    const latestWeek = Math.max(...data.weeks.map(w => w.weekNumber));
    const [applyFrom, setApplyFrom] = useState(latestWeek);

    useEffect(() => {
        fetchSeasonSettings().then(s => {
            setSettings(s);
            setRoleTargets(s.roleTargets);
            setCardTargets(Object.fromEntries(Object.entries(s.miniCard).map(([k, v]) => [k, v.target])) as Record<keyof MiniCard, number>);
        });
    }, []);

    const run = async (key: string, fn: () => Promise<string | void>) => {
        setBusy(key); setError(null); setOk(null);
        try {
            await requireActiveSession();
            const msg = await fn();
            if (msg) setOk(msg);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(null);
        }
    };

    const tabs: Array<[Tab, string]> = [['weeks', 'Апталар'], ['targets', 'Максаттар (план)'], ['backup', 'Камдык көчүрмө']];

    return (
        <Sheet title="Админ панели" onClose={onClose} width="50rem">
            <div className="px-4 sm:px-6 pt-4">
                <div className="inline-flex p-1 rounded-full mb-5 max-w-full overflow-x-auto scroll-row" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} role="tablist">
                    {tabs.map(([k, label]) => (
                        <button key={k} role="tab" aria-selected={tab === k} className={`chip ${tab === k ? 'is-active' : ''}`} style={{ border: 'none' }} onClick={() => { setTab(k); setError(null); setOk(null); }}>{label}</button>
                    ))}
                </div>
                {error && <Notice kind="error" text={error} />}
                {ok && <Notice kind="ok" text={ok} />}
            </div>

            {tab === 'weeks' && (
                <div className="px-4 sm:px-6 pb-6">
                    <div className="card card-pad mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>Жаңы апта ачуу</div>
                            <p className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>Ачылгандан кийин үй жетекчилери {latestWeek + 1}-аптага маалымат киргизе алышат.</p>
                        </div>
                        <button
                            className={`btn ${confirmOpen ? 'btn-gold' : 'btn-primary'}`}
                            disabled={busy === 'open'}
                            onClick={() => {
                                if (!confirmOpen) { setConfirmOpen(true); return; }
                                run('open', async () => { await openWeek(latestWeek + 1); setConfirmOpen(false); onChanged(); return `${latestWeek + 1}-апта ачылды.`; });
                            }}
                        >
                            {busy === 'open' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                            {confirmOpen ? `${latestWeek + 1}-аптаны ачуу — ырастаңыз` : `${latestWeek + 1}-аптаны ачуу`}
                        </button>
                    </div>

                    <p className="text-[0.8rem] mb-3" style={{ color: 'var(--text-muted)' }}>
                        <Lock className="w-3.5 h-3.5 inline -mt-0.5" /> Кулпуланган аптаны үй жетекчилери өзгөртө албайт (админ гана өзгөртө алат). Каалаган убакта ачып койсо болот.
                    </p>
                    <ol className="card overflow-hidden">
                        {[...data.weeks].reverse().map((w, i) => {
                            const submitted = w.teams.filter(t => t.submitted).length;
                            return (
                                <li key={w.weekNumber} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-display font-bold text-[1.2rem]" style={{ color: 'var(--text-primary)' }}>{w.weekNumber}-апта</div>
                                        <div className="text-[0.76rem]" style={{ color: submitted === w.teams.length ? 'var(--success)' : 'var(--text-muted)' }}>{submitted} / {w.teams.length} үй киргизди</div>
                                    </div>
                                    <button
                                        className={`btn ${w.locked ? 'btn-gold' : 'btn-ghost'}`}
                                        disabled={busy === `lock${w.weekNumber}`}
                                        onClick={() => run(`lock${w.weekNumber}`, async () => {
                                            await setWeekLocked(w.weekNumber, !w.locked);
                                            onChanged();
                                            return w.locked ? `${w.weekNumber}-апта ачылды — жетекчилер кайра өзгөртө алат.` : `${w.weekNumber}-апта кулпуланды.`;
                                        })}
                                    >
                                        {busy === `lock${w.weekNumber}` ? <Loader2 className="w-4 h-4 animate-spin" /> : w.locked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
                                        {w.locked ? 'Кулпуланган' : 'Ачык'}
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}

            {tab === 'targets' && (
                <div className="px-4 sm:px-6 pb-6">
                    {!settings ? (
                        <div className="flex items-center justify-center gap-2 py-12" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-5 h-5 animate-spin" /> Жүктөлүүдө…</div>
                    ) : (
                        <>
                            <p className="text-[0.84rem] mb-4" style={{ color: 'var(--text-secondary)' }}>
                                Сезондун минималдуу пландары. Жаңы мүчөлөр жана жаңы апталар ушулардан башталат.
                            </p>
                            <h3 className="font-display font-bold text-[1.3rem] mb-2" style={{ color: 'var(--text-primary)' }}>Ролдор боюнча (жеке)</h3>
                            <div className="card overflow-x-auto mb-6">
                                <table className="data-table" style={{ minWidth: 560 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ paddingTop: '0.8rem', paddingLeft: '1rem' }}>Ролу</th>
                                            {METRICS.map(m => <th key={m} style={{ paddingTop: '0.8rem', textAlign: 'center' }}>{m}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ROLES.map(role => (
                                            <tr key={role}>
                                                <td className="font-bold whitespace-nowrap" style={{ paddingLeft: '1rem', color: 'var(--text-primary)' }}>{ROLE_LABEL[role]}</td>
                                                {METRICS.map(m => (
                                                    <td key={m} style={{ padding: '0.4rem 0.25rem' }}>
                                                        <NumberInput
                                                            value={roleTargets[role][m]}
                                                            onValueChange={v => setRoleTargets(prev => ({ ...prev, [role]: { ...prev[role], [m]: v } }))}
                                                            className="w-full min-w-[3.4rem] text-center py-1.5 text-[0.9rem] font-bold"
                                                            style={inputStyle}
                                                            aria-label={`${ROLE_LABEL[role]} — ${m}`}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <h3 className="font-display font-bold text-[1.3rem] mb-2" style={{ color: 'var(--text-primary)' }}>Мини-карта (үй)</h3>
                            <div className="grid grid-cols-2 min-[460px]:grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
                                {(Object.keys(cardTargets) as Array<keyof MiniCard>).map(k => (
                                    <label key={k} className="card p-2.5 text-center">
                                        <span className="block text-[0.74rem] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>{k}</span>
                                        <NumberInput value={cardTargets[k]} onValueChange={v => setCardTargets(prev => ({ ...prev, [k]: v }))} className="w-full text-center py-1.5 text-[0.95rem] font-bold" style={inputStyle} aria-label={`${k} — план`} />
                                    </label>
                                ))}
                            </div>

                            <label className="card card-pad flex items-start gap-3 mb-5 cursor-pointer">
                                <input type="checkbox" checked={applyExisting} onChange={e => setApplyExisting(e.target.checked)} className="mt-1 w-4 h-4 accent-[var(--accent)]" />
                                <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
                                    <b style={{ color: 'var(--text-primary)' }}>Мурда сакталган апталарга да колдонуу</b><br />
                                    Пландар аптадан аптага өтөт, ошондуктан бул белгиленбесе, жаңы план мурдатан бар мүчөлөргө таасир этпейт.
                                    {applyExisting && (
                                        <span className="flex items-center gap-2 mt-2">
                                            <select value={applyFrom} onChange={e => setApplyFrom(Number(e.target.value))} className="px-2 py-1.5" style={inputStyle} onClick={e => e.stopPropagation()}>
                                                {data.weeks.map(w => <option key={w.weekNumber} value={w.weekNumber}>{w.weekNumber}-апта</option>)}
                                            </select>
                                            жана андан кийинки бардык апталар (жеке ыңгайлаштырылган пландар да алмашат)
                                        </span>
                                    )}
                                </span>
                            </label>

                            <button
                                className="btn btn-primary w-full sm:w-auto"
                                disabled={busy === 'targets'}
                                onClick={() => run('targets', async () => {
                                    await saveSeasonSettings(roleTargets, cardTargets);
                                    let msg = 'Пландар сакталды.';
                                    if (applyExisting) {
                                        const r = await applyTargetsFromWeek(applyFrom, roleTargets, cardTargets);
                                        msg += ` ${applyFrom}-аптадан баштап ${r.metricRows} жеке жана ${r.activityRows} мини-карта жазуусу жаңырды.`;
                                    }
                                    onChanged();
                                    return msg;
                                })}
                            >
                                {busy === 'targets' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Пландарды сактоо
                            </button>
                            <p className="text-[0.75rem] mt-3 flex items-start gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Бир адамдын жеке планын өзгөртүү үчүн «Маалымат кошуу» терезесинде анын План талаасын түзөтүңүз.
                            </p>
                        </>
                    )}
                </div>
            )}

            {tab === 'backup' && (
                <div className="px-4 sm:px-6 pb-6">
                    <div className="card card-pad">
                        <p className="text-[0.88rem] mb-4" style={{ color: 'var(--text-secondary)' }}>
                            Бүт базанын (үйлөр, мүчөлөр, апталар, жыйынтыктар, пландар) толук көчүрмөсү бир JSON файл катары. Ар аптадан кийин сактап коюу сунушталат.
                        </p>
                        <button
                            className="btn btn-primary"
                            disabled={busy === 'backup'}
                            onClick={() => run('backup', async () => {
                                const blob = await exportBackup();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `tdjamaat-backup-${new Date().toISOString().slice(0, 10)}.json`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                setTimeout(() => URL.revokeObjectURL(url), 1000);
                                return 'Камдык көчүрмө жүктөлдү — аны сактап коюңуз.';
                            })}
                        >
                            {busy === 'backup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Камдык көчүрмөнү жүктөө
                        </button>
                    </div>
                </div>
            )}
        </Sheet>
    );
};
