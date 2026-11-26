import React, { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, CalendarPlus, CheckCircle2, Download, Loader2, Lock, LockOpen, Plus, Save, Sparkles, Target, X } from 'lucide-react';
import type { DataFile, MetricValues, MiniCard, Role } from '../types';
import type { SeasonSettings } from '../services/dataService';
import { applyTargetsFromWeek, exportBackup, fetchSeasonSettings, openWeek, saveSeasonSettings, saveTazalykItems, setWeekDates, setWeekLocked, setWeekTazalyk, DEFAULT_MINICARD, DEFAULT_TARGETS } from '../services/dataService';
import { formatWeekRange, isThursday, thursdayOf } from '../utils/weekDates';
import { TAZALYK_MAX } from '../utils/tazalyk';
import { requireActiveSession } from '../services/authService';
import { METRICS, ROLE_LABEL } from '../utils/insights';
import { NumberInput } from './NumberInput';
import { Sheet } from './ui';
import { RosterTab, SeasonTab } from './AdminSeason';
import { weekLabel } from '../utils/seasons';
import { t } from '../i18n';
import { cardLabel, cardName, metricLabel, metricName } from '../utils/metrics';

interface AdminPanelProps {
    data: DataFile;
    onClose: () => void;
    onChanged: () => void;
}

type Tab = 'weeks' | 'season' | 'roster' | 'targets' | 'backup';
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
    const latestWeek = data.weeks.length ? Math.max(...data.weeks.map(w => w.globalWeek)) : 0;
    const label = (n: number) => weekLabel(data, n);
    const [applyFrom, setApplyFrom] = useState(latestWeek);
    // Week dates: the Thursday the running season's first week began.
    const seasonFirst = [...data.seasons].sort((a, b) => b.firstWeek - a.firstWeek)[0]?.firstWeek ?? (data.weeks[0]?.globalWeek ?? 1);
    const firstWeekData = data.weeks.find(w => w.globalWeek === seasonFirst);
    const [firstThursday, setFirstThursday] = useState<string>(firstWeekData?.startDate ?? thursdayOf(new Date()));
    const [items, setItems] = useState<string[]>([]);
    const [newItem, setNewItem] = useState('');

    useEffect(() => {
        fetchSeasonSettings().then(s => {
            setSettings(s);
            setRoleTargets(s.roleTargets);
            setCardTargets(Object.fromEntries(Object.entries(s.miniCard).map(([k, v]) => [k, v.target])) as Record<keyof MiniCard, number>);
            setItems(s.tazalykItems);
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

    const tabs: Array<[Tab, string]> = [['weeks', t('Апталар')], ['season', t('Сезон')], ['roster', t('Курам')], ['targets', t('Пландар')], ['backup', t('Камдык көчүрмө')]];

    return (
        <Sheet title={t('Админ панели')} onClose={onClose} width="50rem">
            <div className="px-4 sm:px-6 pt-4">
                <div className="chip-row mb-6 max-w-full overflow-x-auto scroll-row" role="tablist">
                    {tabs.map(([k, label]) => (
                        <button key={k} role="tab" aria-selected={tab === k} className={`chip ${tab === k ? 'is-active' : ''}`} onClick={() => { setTab(k); setError(null); setOk(null); }}>{label}</button>
                    ))}
                </div>
                {error && <Notice kind="error" text={error} />}
                {ok && <Notice kind="ok" text={ok} />}
            </div>

            {tab === 'weeks' && (
                <div className="px-4 sm:px-6 pb-6">
                    <div className="card card-pad mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{t('Жаңы апта ачуу')}</div>
                            <p className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>{t('Ачылгандан кийин капитандар {0} үчүн маалымат киргизе алышат.', label(latestWeek + 1))}</p>
                        </div>
                        <button
                            className={`btn ${confirmOpen ? 'btn-gold' : 'btn-primary'}`}
                            disabled={busy === 'open'}
                            onClick={() => {
                                if (!confirmOpen) { setConfirmOpen(true); return; }
                                run('open', async () => { await openWeek(latestWeek + 1); setConfirmOpen(false); onChanged(); return t('{0} ачылды.', label(latestWeek + 1)); });
                            }}
                        >
                            {busy === 'open' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                            {confirmOpen ? t('{0}: ачууну ырастаңыз', label(latestWeek + 1)) : t('Ачуу: {0}', label(latestWeek + 1))}
                        </button>
                    </div>

                    {/* The jamaat week runs Thursday → Wednesday. */}
                    <div className="card card-pad mb-5">
                        <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--text-primary)' }}><CalendarDays className="w-4 h-4" style={{ color: 'var(--gold)' }} />{t('Апталардын даталары')}</div>
                        <p className="text-[0.8rem] mt-1" style={{ color: 'var(--text-muted)' }}>{t('Апта бейшембиден шаршембиге чейин. Сезондун {0} башталган бейшембини тандасаңыз, калган апталар өзү эсептелет.', label(seasonFirst))}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <input type="date" value={firstThursday} onChange={e => setFirstThursday(e.target.value)} className="login-field px-3 py-2 text-[0.95rem]" style={{ ...inputStyle, colorScheme: 'light dark' }} aria-label={t('Биринчи бейшемби')} />
                            <button
                                className="btn btn-ghost"
                                disabled={busy === 'dates' || !isThursday(firstThursday)}
                                onClick={() => run('dates', async () => { await setWeekDates(seasonFirst, firstThursday); onChanged(); return t('Даталар сакталды.'); })}
                            >
                                {busy === 'dates' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{t('Сактоо')}
                            </button>
                            {firstThursday && !isThursday(firstThursday) && <span className="text-[0.8rem]" style={{ color: 'var(--danger)' }}>{t('Бул күн бейшемби эмес.')}</span>}
                        </div>
                    </div>

                    <p className="text-[0.8rem] mb-3" style={{ color: 'var(--text-muted)' }}>
                        <Sparkles className="w-3.5 h-3.5 inline -mt-0.5" style={{ color: 'var(--gold)' }} />  {t('«Тазалык» күйгүзүлгөн апталарда үйлөрдүн рейтингине тазалык упайы кошулат (эң көп {0}).', TAZALYK_MAX)}
                    </p>
                    <p className="text-[0.8rem] mb-3" style={{ color: 'var(--text-muted)' }}>
                        <Lock className="w-3.5 h-3.5 inline -mt-0.5" />  {t('Кулпуланган аптаны капитандар өзгөртө алышпайт (админ гана өзгөртө алат). Аны каалаган убакта кайра ачса болот.')}
                    </p>
                    <ol className="card overflow-hidden">
                        {[...data.weeks].reverse().map((w, i) => {
                            const submitted = w.teams.filter(it => it.submitted).length;
                            return (
                                <li key={w.globalWeek} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-display text-[1.2rem]" style={{ color: 'var(--text-primary)' }}>{label(w.globalWeek)}</div>
                                        <div className="text-[0.76rem]" style={{ color: submitted === w.teams.length ? 'var(--success)' : 'var(--text-muted)' }}>{t('{0} / {1} үй киргизди', submitted, w.teams.length)}{w.startDate ? ` · ${formatWeekRange(w.startDate ?? null, w.endDate ?? null)}` : ''}</div>
                                    </div>
                                    <button
                                        className={`toggle-pill ${w.tazalyk ? 'is-on' : ''}`}
                                        aria-pressed={!!w.tazalyk}
                                        title={t('Бул аптада Тазалык рейтингге кошулабы')}
                                        disabled={busy === `taz${w.globalWeek}`}
                                        onClick={() => run(`taz${w.globalWeek}`, async () => {
                                            await setWeekTazalyk(w.globalWeek, !w.tazalyk);
                                            onChanged();
                                            return w.tazalyk ? t('{0}: Тазалык эсептелбейт.', label(w.globalWeek)) : t('{0}: Тазалык эсептелет.', label(w.globalWeek));
                                        })}
                                    >
                                        {busy === `taz${w.globalWeek}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        <span className="hidden min-[420px]:inline">{t('Тазалык')}</span>
                                    </button>
                                    <button
                                        className={`toggle-pill ${w.locked ? 'is-on' : ''}`}
                                        aria-pressed={!!w.locked}
                                        disabled={busy === `lock${w.globalWeek}`}
                                        onClick={() => run(`lock${w.globalWeek}`, async () => {
                                            await setWeekLocked(w.globalWeek, !w.locked);
                                            onChanged();
                                            return w.locked ? t('{0} ачылды. Капитандар кайра өзгөртө алат.', label(w.globalWeek)) : t('{0} кулпуланды.', label(w.globalWeek));
                                        })}
                                    >
                                        {busy === `lock${w.globalWeek}` ? <Loader2 className="w-4 h-4 animate-spin" /> : w.locked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
                                        {w.locked ? t('Кулпуланган') : t('Ачык')}
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}

            {tab === 'season' && <SeasonTab data={data} busy={busy} run={run} onChanged={onChanged} />}
            {tab === 'roster' && <RosterTab data={data} busy={busy} run={run} onChanged={onChanged} />}

            {tab === 'targets' && (
                <div className="px-4 sm:px-6 pb-6">
                    {!settings ? (
                        <div className="flex items-center justify-center gap-2 py-12" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-5 h-5 animate-spin" />  {t('Жүктөлүүдө…')}</div>
                    ) : (
                        <>
                            <p className="text-[0.84rem] mb-4" style={{ color: 'var(--text-secondary)' }}>
                                
                                {t('Сезондун минималдуу пландары. Жаңы мүчөлөр жана жаңы апталар ушул пландардан башталат.')}
                            </p>
                            <h3 className="font-display text-[1.3rem] mb-1" style={{ color: 'var(--text-primary)' }}>{t('Тазалык пункттары')}</h3>
                            <p className="text-[0.8rem] mb-3" style={{ color: 'var(--text-muted)' }}>{t('Ар бир пункт 0–5 менен бааланат; бардыгы эң көп {0} упайга айланат. Пункттун атын өзгөртсөңүз, анын мурунку баалары эсептелбей калат.', TAZALYK_MAX)}</p>
                            <ul className="card mb-3">
                                {items.map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 px-3 py-2" style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                                        <input value={item} onChange={e => setItems(list => list.map((x, k) => (k === i ? e.target.value : x)))} className="flex-1 min-w-0 px-2 py-1.5 text-[0.95rem]" style={inputStyle} aria-label={t('Пункт {0}', i + 1)} />
                                        <button className="btn btn-ghost btn-icon" disabled={items.length <= 1} onClick={() => setItems(list => list.filter((_, k) => k !== i))} aria-label={t('Өчүрүү')}><X className="w-4 h-4" /></button>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex flex-wrap items-center gap-2 mb-8">
                                <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder={t('Жаңы пункт')} className="flex-1 min-w-[10rem] px-3 py-2 text-[0.95rem]" style={inputStyle} />
                                <button className="btn btn-ghost" disabled={!newItem.trim()} onClick={() => { setItems(list => [...list, newItem.trim()]); setNewItem(''); }}><Plus className="w-4 h-4" />{t('Кошуу')}</button>
                                <button className="btn btn-primary" disabled={busy === 'items'} onClick={() => run('items', async () => { await saveTazalykItems(items); onChanged(); return t('Тазалык пункттары сакталды.'); })}>
                                    {busy === 'items' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{t('Сактоо')}
                                </button>
                            </div>
                            <h3 className="font-display text-[1.3rem] mb-2" style={{ color: 'var(--text-primary)' }}>{t('Ролдор боюнча (жеке)')}</h3>
                            <div className="card overflow-x-auto mb-6">
                                <table className="data-table" style={{ minWidth: 560 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ paddingTop: '0.8rem', paddingLeft: '1rem' }}>{t('Ролу')}</th>
                                            {METRICS.map(m => <th key={m} style={{ paddingTop: '0.8rem', textAlign: 'center' }} title={metricName(m)}>{metricLabel(m)}</th>)}
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
                                                            aria-label={`${ROLE_LABEL[role]} — ${metricName(m)}`}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <h3 className="font-display text-[1.3rem] mb-2" style={{ color: 'var(--text-primary)' }}>{t('Мини-карта (үй)')}</h3>
                            <div className="grid grid-cols-2 min-[460px]:grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
                                {(Object.keys(cardTargets) as Array<keyof MiniCard>).map(k => (
                                    <label key={k} className="card p-2.5 text-center">
                                        <span className="block text-[0.74rem] font-bold mb-1" style={{ color: 'var(--text-muted)' }} title={cardName(k)}>{cardLabel(k)}</span>
                                        <NumberInput value={cardTargets[k]} onValueChange={v => setCardTargets(prev => ({ ...prev, [k]: v }))} className="w-full text-center py-1.5 text-[0.95rem] font-bold" style={inputStyle} aria-label={t('{0} — план', cardName(k))} />
                                    </label>
                                ))}
                            </div>

                            <label className="card card-pad flex items-start gap-3 mb-5 cursor-pointer">
                                <input type="checkbox" checked={applyExisting} onChange={e => setApplyExisting(e.target.checked)} className="mt-1 w-4 h-4 accent-[var(--accent)]" />
                                <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
                                    <b style={{ color: 'var(--text-primary)' }}>{t('Мурда сакталган апталарга да колдонуу')}</b><br />
                                    {t('Пландар аптадан аптага өтөт. Ошондуктан бул белгиленбесе, жаңы план учурдагы мүчөлөргө таасир этпейт.')}
                                    {applyExisting && (
                                        <span className="flex items-center gap-2 mt-2">
                                            <select value={applyFrom} onChange={e => setApplyFrom(Number(e.target.value))} className="px-2 py-1.5" style={inputStyle} onClick={e => e.stopPropagation()}>
                                                {data.weeks.map(w => <option key={w.globalWeek} value={w.globalWeek}>{label(w.globalWeek)}</option>)}
                                            </select>
                                            
                                            {t('жана андан кийинки бардык апталар (жеке ыңгайлаштырылган пландар да алмашат)')}
                                        </span>
                                    )}
                                </span>
                            </label>

                            <button
                                className="btn btn-primary w-full sm:w-auto"
                                disabled={busy === 'targets'}
                                onClick={() => run('targets', async () => {
                                    await saveSeasonSettings(roleTargets, cardTargets);
                                    let msg = t('Пландар сакталды.');
                                    if (applyExisting) {
                                        const r = await applyTargetsFromWeek(applyFrom, roleTargets, cardTargets);
                                        msg += t(' {0} жана андан кийинки апталар: {1} жеке жана {2} мини-карта жазуусу жаңыртылды.', label(applyFrom), r.metricRows, r.activityRows);
                                    }
                                    onChanged();
                                    return msg;
                                })}
                            >
                                {busy === 'targets' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('Пландарды сактоо')}
                            </button>
                            <p className="text-[0.75rem] mt-3 flex items-start gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />  {t('Бир адамдын жеке планын өзгөртүү үчүн «Маалымат кошуу» терезесинде анын План талаасын түзөтүңүз.')}
                            </p>
                        </>
                    )}
                </div>
            )}

            {tab === 'backup' && (
                <div className="px-4 sm:px-6 pb-6">
                    <div className="card card-pad">
                        <p className="text-[0.88rem] mb-4" style={{ color: 'var(--text-secondary)' }}>
                            
                            {t('Бүт базанын көчүрмөсү бир JSON файлда. Ар бир аптадан кийин бирди сактап коюңуз.')}
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
                                return t('Көчүрмө жүктөлдү. Аны ишенимдүү жерге сактаңыз.');
                            })}
                        >
                            {busy === 'backup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {t('Камдык көчүрмөнү жүктөп алуу')}
                        </button>
                    </div>
                </div>
            )}
        </Sheet>
    );
};
