import { useModal } from '../hooks/useModal';
import React, { useEffect, useMemo, useState } from 'react';
import { Save, AlertCircle, CheckCircle, X, Camera, Loader2, Lock, Plus, Download } from 'lucide-react';
import type { DataFile, House, Member, MetricValues, MiniCard } from '../types';
import { seasonStartFor, weekLabel } from '../utils/seasons';
import {
    fetchHouses,
    fetchMembers,
    fetchSeasonSettings,
    fetchHouseHistory,
    fetchWeekNumbers,
    assertWeekExists,
    openWeek,
    exportBackup,
    upsertHouseActivity,
    upsertMemberMetrics,
    uploadMemberPhoto,
    DEFAULT_MINICARD,
    DEFAULT_TARGETS
} from '../services/dataService';
import type { HouseHistory, SeasonSettings } from '../services/dataService';
import { calculateMemberScore } from '../utils/scoring';
import { Avatar } from './Avatar';
import { NumberInput } from './NumberInput';
import { requireActiveSession } from '../services/authService';
import type { AuthUser } from '../services/authService';

interface DataEntryFormProps {
    authUser: AuthUser;
    defaultWeekNumber: number;
    initialHouseId?: string | null;
    onClose: () => void;
    onSuccess: () => void;
    /** Weeks changed (admin opened one) — parent should refresh, form stays open. */
    onWeeksChanged?: () => void;
    /** Weeks the admin has locked (leaders can't change them). */
    lockedWeeks?: number[];
    /** All seasons' data — for season week labels and season-scoped targets. */
    data?: DataFile;
}

const ZERO_METRICS: MetricValues = {
    'К-К': 0, 'СВТ': 0, 'КТП': 0, 'ТХЖ': 0, 'ДТА': 0, 'ИСТГ': 0, 'НФ': 0, 'ТСП': 0
};

type MemberDraft = { actual: MetricValues; target: MetricValues };

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' };
const inputMutedStyle: React.CSSProperties = { backgroundColor: 'var(--page-plane)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' };
const fieldLabel: React.CSSProperties = { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' };

// Turn a failed save into something a house leader can act on. 42501 is
// Postgres' "insufficient privilege" — what a row-level-security rejection
// comes back as. Anything else shows the database's own message, so a
// problem is never hidden behind a generic "error".
const describeSaveError = (err: unknown): string => {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42501') {
        return 'Базага жазууга уруксат жок: бул үйгө же бул аптага маалымат киргизүү укугуңуз жок. Админге кайрылыңыз.';
    }
    if (code === '23503') {
        return 'Бул апта базада жок — админ аны ачышы керек.';
    }
    if (err instanceof Error && err.message) return `Сакталган жок: ${err.message}`;
    return 'Сакталган жок: белгисиз ката. Интернетти текшерип, кайра аракет кылыңыз.';
};


// Season rules this form follows (all also enforced by the database —
// supabase/season-2026-09.sql):
//  - A house leader enters RESULTS (Факт) only. Targets (План) are shown
//    read-only: the role minimum, or a custom target the admin set.
//  - Only weeks the admin has opened can be filled in. The admin opens the
//    next week from this form.
export const DataEntryForm: React.FC<DataEntryFormProps> = ({ authUser, defaultWeekNumber, initialHouseId, onClose, onSuccess, onWeeksChanged, lockedWeeks = [], data }) => {
    useModal(onClose);
    const isAdmin = authUser.role === 'admin';
    const [houses, setHouses] = useState<House[]>([]);
    const [selectedHouseId, setSelectedHouseId] = useState<string>(authUser.houseId ?? initialHouseId ?? '');
    const [weekNumbers, setWeekNumbers] = useState<number[]>([]);
    const [weekNumber, setWeekNumber] = useState<number>(defaultWeekNumber);
    const [members, setMembers] = useState<Member[]>([]);
    const [settings, setSettings] = useState<SeasonSettings>({ roleTargets: DEFAULT_TARGETS, miniCard: DEFAULT_MINICARD });
    const [history, setHistory] = useState<HouseHistory | null>(null);
    const [miniCard, setMiniCard] = useState<MiniCard>(DEFAULT_MINICARD);
    const [drafts, setDrafts] = useState<Record<string, MemberDraft>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [openingWeek, setOpeningWeek] = useState(false);
    const [confirmOpenWeek, setConfirmOpenWeek] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [uploadingPhotoFor, setUploadingPhotoFor] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);

    const latestWeek = weekNumbers.length ? Math.max(...weekNumbers) : 0;
    // Week numbers are stored continuously across seasons; show them per season.
    const label = (n: number) => (data ? weekLabel(data, n) : `${n}-апта`);
    const weekLocked = lockedWeeks.includes(weekNumber);
    const lockedForMe = weekLocked && !isAdmin;

    useEffect(() => {
        Promise.all([
            isAdmin ? fetchHouses() : Promise.resolve<House[]>([]),
            fetchWeekNumbers(),
            fetchSeasonSettings()
        ]).then(([houseList, weeks, season]) => {
            setHouses(houseList);
            setWeekNumbers(weeks);
            setSettings(season);
            if (!weeks.includes(defaultWeekNumber) && weeks.length) setWeekNumber(Math.max(...weeks));
            if (isAdmin && !selectedHouseId && houseList.length > 0) setSelectedHouseId(houseList[0].id);
        }).catch(err => {
            setError(`Маалымат жүктөлгөн жок: ${err instanceof Error ? err.message : String(err)}`);
        }).finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Roster + that house's saved history, whenever the house changes.
    useEffect(() => {
        if (!selectedHouseId) return;
        let cancelled = false;
        setHistory(null);
        fetchMembers()
            .then(async all => {
                const roster = all.filter(m => m.houseId === selectedHouseId);
                const hist = await fetchHouseHistory(selectedHouseId, roster.map(m => m.id));
                if (!cancelled) { setMembers(roster); setHistory(hist); }
            })
            .catch(err => { if (!cancelled) setError(`Мүчөлөр жүктөлгөн жок: ${err instanceof Error ? err.message : String(err)}`); });
        return () => { cancelled = true; };
    }, [selectedHouseId]);

    // Seed the form for the chosen house + week from what's really saved:
    //  results  → that week's saved results, else zeros
    //  targets  → that week's saved target, else the member's most recent
    //             EARLIER target (carries an admin's custom target forward),
    //             else the role minimum. Same rule the database applies.
    useEffect(() => {
        if (!selectedHouseId || !history) return;

        // Targets carry forward within the season only (same rule as the database).
        const seasonStart = data ? seasonStartFor(data, weekNumber) : 0;
        const rowsBefore = <T extends { weekNumber: number }>(rows: T[]) =>
            rows.filter(r => r.weekNumber < weekNumber && r.weekNumber >= seasonStart).sort((a, b) => b.weekNumber - a.weekNumber);

        const thisWeekActivity = history.activity.find(a => a.weekNumber === weekNumber);
        const prevActivity = rowsBefore(history.activity)[0];
        const cardTargets = thisWeekActivity?.miniCard ?? prevActivity?.miniCard ?? settings.miniCard;
        const nextCard = {} as MiniCard;
        for (const key of Object.keys(DEFAULT_MINICARD) as Array<keyof MiniCard>) {
            nextCard[key] = {
                actual: thisWeekActivity?.miniCard[key].actual ?? 0,
                target: cardTargets[key]?.target ?? settings.miniCard[key].target
            };
        }
        setMiniCard(nextCard);

        const nextDrafts: Record<string, MemberDraft> = {};
        members.forEach(member => {
            const mine = history.metrics.filter(r => r.memberId === member.id);
            const thisWeek = mine.find(r => r.weekNumber === weekNumber);
            const previous = rowsBefore(mine).find(r => r.target);
            nextDrafts[member.id] = {
                actual: thisWeek?.actual ?? ZERO_METRICS,
                target: thisWeek?.target ?? previous?.target ?? settings.roleTargets[member.role] ?? DEFAULT_TARGETS.member
            };
        });
        setDrafts(nextDrafts);
    }, [selectedHouseId, weekNumber, members, history, settings, data]);

    const selectedHouseName = useMemo(() => {
        if (!isAdmin) return null; // leader's house is fixed, no need to show a picker
        return houses.find(h => h.id === selectedHouseId)?.name ?? '';
    }, [isAdmin, houses, selectedHouseId]);

    const handleMiniCardChange = (key: keyof MiniCard, field: 'actual' | 'target', value: number) => {
        setMiniCard(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    };

    const handleMemberChange = (memberId: string, field: 'actual' | 'target', metric: keyof MetricValues, value: number) => {
        setDrafts(prev => ({
            ...prev,
            [memberId]: { ...prev[memberId], [field]: { ...prev[memberId][field], [metric]: value } }
        }));
    };

    const handlePhotoSelect = async (memberId: string, file: File | undefined) => {
        if (!file || !selectedHouseId) return;
        setPhotoError(null);
        setUploadingPhotoFor(memberId);
        try {
            const photoUrl = await uploadMemberPhoto(selectedHouseId, memberId, file);
            setMembers(prev => prev.map(m => (m.id === memberId ? { ...m, photoUrl } : m)));
        } catch (err) {
            setPhotoError(err instanceof Error ? err.message : 'Сүрөт жүктөлбөй калды');
        } finally {
            setUploadingPhotoFor(null);
        }
    };

    // Admin: open the next week (two taps — no browser pop-up confirm).
    const handleOpenWeek = async () => {
        if (!confirmOpenWeek) { setConfirmOpenWeek(true); return; }
        const next = latestWeek + 1;
        setOpeningWeek(true);
        setError(null);
        try {
            await requireActiveSession();
            await openWeek(next);
            const weeks = await fetchWeekNumbers();
            setWeekNumbers(weeks);
            setWeekNumber(next);
            setNotice(`${label(next)} ачылды. Эми үй жетекчилери маалымат киргизе алышат.`);
            onWeeksChanged?.();
        } catch (err) {
            setError(describeSaveError(err));
        } finally {
            setOpeningWeek(false);
            setConfirmOpenWeek(false);
        }
    };

    // Admin: download a full backup of the database as a JSON file.
    const handleBackup = async () => {
        setExporting(true);
        setError(null);
        try {
            const blob = await exportBackup();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tdjamaat-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setNotice('Камдык көчүрмө жүктөлдү — аны сактап коюңуз.');
        } catch (err) {
            setError(describeSaveError(err));
        } finally {
            setExporting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setNotice(null);
        if (!selectedHouseId) {
            setError('Үй тандалган жок');
            return;
        }
        if (members.length === 0) {
            setError('Бул үйдө азырынча мүчө жок — админ аркылуу кошуу керек');
            return;
        }
        if (!weekNumbers.includes(weekNumber)) {
            setError(`${label(weekNumber)} али ачыла элек — админ ачышы керек.`);
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await requireActiveSession();
            await assertWeekExists(weekNumber);
            await upsertHouseActivity(selectedHouseId, weekNumber, miniCard);
            await Promise.all(
                members.map(member => upsertMemberMetrics(member.id, weekNumber, drafts[member.id].actual, drafts[member.id].target))
            );
            setSuccess(true);
            setTimeout(onSuccess, 1200);
        } catch (err) {
            setError(describeSaveError(err));
        } finally {
            setSaving(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-6" style={{ backgroundColor: 'color-mix(in oklab, var(--text-primary) 50%, transparent)' }}>
                <div className="p-8 max-w-sm w-full text-center" style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)' }}>
                    <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--success)' }} />
                    <h2 className="font-display text-[2rem] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Ийгиликтүү сакталды!</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>{label(weekNumber)} үчүн маалымат жаңырды.</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4 backdrop-blur-sm"
            style={{ backgroundColor: 'color-mix(in oklab, var(--text-primary) 45%, transparent)' }}
        >
            {/* Full-screen sheet on phones (100dvh tracks the real visible
                height as mobile browser bars show/hide), a centered dialog
                from `sm` up. Header / scrolling body / footer are three flex
                rows, so the Save bar is always pinned at the bottom and can
                never end up floating over the middle of the member list. */}
            <div
                className="w-full sm:max-w-4xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden sm:rounded-[14px] sm:border"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
                <div
                    className="flex-shrink-0 px-4 sm:px-6 py-4 sm:py-5 flex justify-between items-center gap-3"
                    style={{ borderBottom: '1px solid var(--border)', paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
                >
                    <h2 className="font-display text-[1.5rem] sm:text-[1.7rem] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {selectedHouseName ? `${selectedHouseName} — маалымат` : 'Маалымат кошуу'}
                    </h2>
                    <button onClick={onClose} aria-label="Жабуу" className="p-2 -mr-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 sm:py-6">
                    {loading ? (
                        <div className="text-center py-12 font-serif" style={{ color: 'var(--text-muted)' }}>Жүктөлүүдө…</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
                                <div>
                                    <label className="block mb-1.5" style={fieldLabel} htmlFor="week-select">Апта</label>
                                    {/* Only weeks the admin has opened — no free-typed number, so
                                        nobody can save into a week that doesn't exist or mistype one. */}
                                    <div className="flex gap-2">
                                        <select
                                            id="week-select"
                                            value={weekNumber}
                                            onChange={e => { setWeekNumber(Number(e.target.value)); setNotice(null); setConfirmOpenWeek(false); }}
                                            className="flex-1 min-w-0 px-4 py-2.5 outline-none text-base"
                                            style={inputStyle}
                                        >
                                            {[...weekNumbers].sort((a, b) => b - a).map(n => (
                                                <option key={n} value={n}>{label(n)}{n === latestWeek ? ' (акыркы)' : ''}</option>
                                            ))}
                                            {weekNumbers.length === 0 && <option value={weekNumber}>Ачык апта жок</option>}
                                        </select>
                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={handleOpenWeek}
                                                disabled={openingWeek}
                                                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 text-sm font-semibold disabled:opacity-60"
                                                style={confirmOpenWeek
                                                    ? { backgroundColor: 'var(--accent)', color: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)' }
                                                    : { border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}
                                            >
                                                <Plus className="w-4 h-4" />
                                                {openingWeek ? 'Ачылууда…' : confirmOpenWeek ? `${label(latestWeek + 1)}: ачууну ырастаңыз` : 'Жаңы апта'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {authUser.role === 'admin' && (
                                    <div>
                                        <label className="block mb-1.5" style={fieldLabel}>Үй</label>
                                        <select
                                            value={selectedHouseId}
                                            onChange={e => setSelectedHouseId(e.target.value)}
                                            className="w-full px-4 py-2.5 outline-none text-base"
                                            style={inputStyle}
                                        >
                                            {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {weekLocked && (
                                <div className="mb-6 px-4 py-3 rounded-[8px] flex items-start gap-2.5 text-sm" style={{ backgroundColor: 'var(--gold-soft)', border: '1px solid color-mix(in oklab, var(--gold) 35%, transparent)', color: 'var(--text-secondary)' }}>
                                    <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
                                    <p>{isAdmin ? `${label(weekNumber)} кулпуланган: жетекчилер өзгөртө албайт, бирок админ катары сиз өзгөртө аласыз.` : `${label(weekNumber)} кулпуланган — өзгөртүү үчүн админге кайрылыңыз.`}</p>
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="font-display text-[1.35rem] font-bold mb-4 pb-2" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Мини-карта (командалык)</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                    {(Object.keys(DEFAULT_MINICARD) as Array<keyof MiniCard>).map(key => (
                                        <div key={key} className="p-3" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                                            <div className="text-center text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{key}</div>
                                            <div className="flex flex-col gap-2">
                                                <div>
                                                    <label className="text-xs block" style={{ color: 'var(--text-muted)' }}>Факт</label>
                                                    <NumberInput
                                                        value={miniCard[key].actual}
                                                        onValueChange={v => handleMiniCardChange(key, 'actual', v)}
                                                        className="w-full text-center p-1.5 text-base sm:text-sm"
                                                        style={inputStyle}
                                                        aria-label={`${key} — Факт`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs block" style={{ color: 'var(--text-muted)' }}>План</label>
                                                    <NumberInput
                                                        value={miniCard[key].target}
                                                        readOnly={!isAdmin}
                                                        tabIndex={isAdmin ? undefined : -1}
                                                        onValueChange={v => handleMiniCardChange(key, 'target', v)}
                                                        className={`w-full text-center p-1.5 text-base sm:text-sm ${isAdmin ? '' : 'cursor-default'}`}
                                                        style={isAdmin ? inputMutedStyle : { ...inputMutedStyle, borderStyle: 'dashed' }}
                                                        aria-label={`${key} — План`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
                                    <h3 className="font-display text-[1.35rem] font-bold" style={{ color: 'var(--text-primary)' }}>Мүчөлөр</h3>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Сүрөттү өзгөртүү үчүн адамдын сүрөтүн басыңыз</p>
                                </div>
                                {/* The actual/target pairs had no visible label (only a
                                    hover tooltip, which doesn't exist on a phone). */}
                                <p className="text-xs mb-3 flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                                    <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3" style={{ ...inputStyle, borderRadius: 2 }} /> үстүндө — Факт</span>
                                    <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3" style={{ ...inputMutedStyle, borderRadius: 2, borderStyle: isAdmin ? 'solid' : 'dashed' }} /> астында — План</span>
                                    {!isAdmin && (
                                        <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Планды админ гана өзгөртөт</span>
                                    )}
                                </p>
                                {photoError && (
                                    <div className="px-4 py-2.5 mb-4 flex items-center gap-2 text-sm" style={{ borderLeft: '2px solid var(--danger)', color: 'var(--danger)' }}>
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <p>{photoError}</p>
                                    </div>
                                )}
                                {members.length === 0 ? (
                                    <p className="text-sm p-4" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                                        Бул үйдө азырынча мүчө катталган эмес. Мүчө кошуу үчүн админ панелин колдонуңуз.
                                    </p>
                                ) : (
                                    <div>
                                        {members.map((member, i) => {
                                            const draft = drafts[member.id];
                                            if (!draft) return null;
                                            return (
                                                <div key={member.id} className="py-4" style={i > 0 ? { borderTop: '1px solid var(--border)' } : undefined}>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <label
                                                            className="relative flex-shrink-0 cursor-pointer group"
                                                            title="Сүрөт жүктөө / өзгөртүү"
                                                        >
                                                            <Avatar name={member.name} role={member.role} photoUrl={member.photoUrl} />
                                                            <span
                                                                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                style={{ backgroundColor: 'color-mix(in oklab, var(--text-primary) 55%, transparent)', opacity: uploadingPhotoFor === member.id ? 1 : undefined }}
                                                            >
                                                                {uploadingPhotoFor === member.id
                                                                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                                                                    : <Camera className="w-4 h-4 text-white" />}
                                                            </span>
                                                            {/* Always-visible badge: phones have no hover to reveal the overlay. */}
                                                            <span
                                                                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                                                                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                                                            >
                                                                <Camera className="w-2.5 h-2.5" style={{ color: 'var(--text-muted)' }} />
                                                            </span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                disabled={uploadingPhotoFor === member.id}
                                                                onChange={e => {
                                                                    const file = e.target.files?.[0];
                                                                    handlePhotoSelect(member.id, file);
                                                                    e.target.value = '';
                                                                }}
                                                            />
                                                        </label>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{member.name}</div>
                                                            <div className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                                                {member.role === 'imam' ? 'Имам' : member.role === 'zam' ? 'Орун басар' : 'Мүчө'}
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Упай</div>
                                                            <div className="font-serif font-semibold text-lg font-variant-tabular" style={{ color: 'var(--text-primary)' }}>
                                                                {calculateMemberScore({ ...member, actual: draft.actual, target: draft.target }).toFixed(1)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                                        {(Object.keys(ZERO_METRICS) as Array<keyof MetricValues>).map(metric => (
                                                            <div key={metric} className="text-center min-w-0">
                                                                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{metric}</div>
                                                                <NumberInput
                                                                    value={draft.actual[metric]}
                                                                    onValueChange={v => handleMemberChange(member.id, 'actual', metric, v)}
                                                                    className="w-full text-center px-0.5 py-1.5 mb-1 text-base sm:text-sm font-semibold"
                                                                    style={inputStyle}
                                                                    aria-label={`${member.name} — ${metric} — Факт`}
                                                                    title="Факт"
                                                                />
                                                                <NumberInput
                                                                    value={draft.target[metric]}
                                                                    readOnly={!isAdmin}
                                                                    tabIndex={isAdmin ? undefined : -1}
                                                                    onValueChange={v => handleMemberChange(member.id, 'target', metric, v)}
                                                                    className={`w-full text-center px-0.5 py-1 text-sm sm:text-xs ${isAdmin ? '' : 'cursor-default'}`}
                                                                    style={isAdmin ? inputMutedStyle : { ...inputMutedStyle, borderStyle: 'dashed' }}
                                                                    aria-label={`${member.name} — ${metric} — План`}
                                                                    title="План"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div
                    className="flex-shrink-0 px-4 sm:px-6 pt-3 sm:pt-4"
                    style={{ borderTop: '1px solid var(--border)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
                >
                    {error && (
                        <div role="alert" className="px-3 py-2 mb-3 flex items-start gap-2 text-sm" style={{ borderLeft: '2px solid var(--danger)', color: 'var(--danger)' }}>
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p className="min-w-0 break-words">{error}</p>
                        </div>
                    )}
                    {notice && !error && (
                        <div role="status" className="px-3 py-2 mb-3 flex items-start gap-2 text-sm" style={{ borderLeft: '2px solid var(--success)', color: 'var(--text-secondary)' }}>
                            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                            <p className="min-w-0 break-words">{notice}</p>
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={handleBackup}
                                disabled={exporting}
                                title="Бүт базанын камдык көчүрмөсүн (JSON) жүктөп алуу"
                                className="mr-auto inline-flex items-center justify-center gap-1.5 px-3 py-3 sm:py-2.5 font-semibold text-sm disabled:opacity-60"
                                style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">{exporting ? 'Даярдалууда…' : 'Камдык көчүрмө'}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 font-semibold text-sm"
                            style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}
                        >
                            Жабуу
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving || loading || !history || lockedForMe}
                            className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}
                        >
                            {saving ? 'Сакталууда…' : (<><Save className="w-4 h-4" /> Сактоо</>)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
