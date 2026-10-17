import { useModal } from '../hooks/useModal';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    excusedSupported,
    DEFAULT_MINICARD,
    DEFAULT_TARGETS
} from '../services/dataService';
import type { HouseHistory, SeasonSettings } from '../services/dataService';
import { calculateMemberScore } from '../utils/scoring';
import { ROLE_LABEL } from '../utils/insights';
import { memberTypos, miniCardTypos, usualValues } from '../utils/typos';
import type { TypoWarning } from '../utils/typos';
import { Avatar } from './Avatar';
import { NumberInput } from './NumberInput';
import { requireActiveSession } from '../services/authService';
import type { AuthUser } from '../services/authService';
import { t } from '../i18n';
import { cardLabel, cardName, metricLabel, metricName } from '../utils/metrics';

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

type MemberDraft = { actual: MetricValues; target: MetricValues; excused: boolean };

// Unsaved typing is also kept on the phone, per house and week, until it is
// saved. Phones (iPhone especially) reload a page that was in the
// background, e.g. after checking WhatsApp for someone's numbers; without
// this, everything typed so far would be gone.
type StoredDraft = { drafts: Record<string, MemberDraft>; miniCard: MiniCard; at: number };
const DRAFT_TTL = 7 * 24 * 3600_000;
const draftKey = (houseId: string, week: number) => `tdjamaat-draft:${houseId}:${week}`;
const readDraft = (houseId: string, week: number): StoredDraft | null => {
    try {
        const raw = localStorage.getItem(draftKey(houseId, week));
        if (!raw) return null;
        const d = JSON.parse(raw) as StoredDraft;
        return d && d.drafts && d.miniCard && Date.now() - d.at < DRAFT_TTL ? d : null;
    } catch { return null; }
};
const writeDraft = (houseId: string, week: number, d: Omit<StoredDraft, 'at'>) => {
    try { localStorage.setItem(draftKey(houseId, week), JSON.stringify({ ...d, at: Date.now() })); } catch { /* storage full or blocked: not critical */ }
};
const clearDraft = (houseId: string, week: number) => {
    try { localStorage.removeItem(draftKey(houseId, week)); } catch { /* not critical */ }
};

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
        return t('Базага жазууга уруксат жок: бул үйгө же бул аптага маалымат киргизүү укугуңуз жок. Админге кайрылыңыз.');
    }
    if (code === '23503') {
        return t('Бул апта базада жок — админ аны ачышы керек.');
    }
    if (err instanceof Error && err.message) return t('Сакталган жок: {0}', err.message);
    return t('Сакталган жок: белгисиз ката. Интернетти текшерип, кайра аракет кылыңыз.');
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
    // Photos uploaded while the form is open (kept apart from `members` so an
    // upload never re-seeds the form and wipes what was typed).
    const [newPhotos, setNewPhotos] = useState<Record<string, string>>({});
    // Something was typed since the form was filled from the database.
    const dirty = useRef(false);
    const [restored, setRestored] = useState(false);
    // Typo check: shown when "Сактоо" is pressed with suspicious numbers.
    const [askTypos, setAskTypos] = useState(false);

    const latestWeek = weekNumbers.length ? Math.max(...weekNumbers) : 0;
    // Week numbers are stored continuously across seasons; show them per season.
    const label = (n: number) => (data ? weekLabel(data, n) : t('{0}-апта', n));
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
            setError(t('Маалымат жүктөлгөн жок: {0}', err instanceof Error ? err.message : String(err)));
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
            .catch(err => { if (!cancelled) setError(t('Мүчөлөр жүктөлгөн жок: {0}', err instanceof Error ? err.message : String(err))); });
        return () => { cancelled = true; };
    }, [selectedHouseId]);

    // Seed the form for the chosen house + week from what's really saved:
    //  results  → that week's saved results, else zeros
    //  targets  → that week's saved target, else the member's most recent
    //             EARLIER target (carries an admin's custom target forward),
    //             else the role minimum. Same rule the database applies.
    //
    // It runs ONLY when the house, the week or the loaded history changes.
    // It must never depend on `data` itself: the page refreshes `data` in the
    // background, and every new object here used to wipe everything typed so
    // far back to the saved values (all zeros in a new week).
    const seasonStart = data ? seasonStartFor(data, weekNumber) : 0;
    useEffect(() => {
        if (!selectedHouseId || !history) return;

        // Targets carry forward within the season only (same rule as the database).
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
        const nextDrafts: Record<string, MemberDraft> = {};
        members.forEach(member => {
            const mine = history.metrics.filter(r => r.memberId === member.id);
            const thisWeek = mine.find(r => r.weekNumber === weekNumber);
            const previous = rowsBefore(mine).find(r => r.target);
            nextDrafts[member.id] = {
                actual: thisWeek?.actual ?? ZERO_METRICS,
                target: thisWeek?.target ?? previous?.target ?? settings.roleTargets[member.role] ?? DEFAULT_TARGETS.member,
                excused: thisWeek?.excused ?? false
            };
        });

        // Bring back what was typed here before and never saved.
        const stored = readDraft(selectedHouseId, weekNumber);
        let fromStore = false;
        // Leaders only get their typed results back; targets always come from
        // the database (only the admin can change them).
        if (stored) {
            for (const id of Object.keys(nextDrafts)) {
                const d = stored.drafts[id];
                if (!d?.actual) continue;
                nextDrafts[id] = isAdmin && d.target
                    ? { ...d, excused: d.excused === true }
                    : { ...nextDrafts[id], actual: d.actual, excused: d.excused === true };
                fromStore = true;
            }
            for (const key of Object.keys(nextCard) as Array<keyof MiniCard>) {
                const c = stored.miniCard[key];
                if (!c) continue;
                nextCard[key] = isAdmin ? c : { ...nextCard[key], actual: c.actual };
                fromStore = true;
            }
        }
        dirty.current = fromStore;
        setRestored(fromStore);
        setMiniCard(nextCard);
        setDrafts(nextDrafts);
        // `members` is loaded together with `history` (same render), so it is
        // always current here; it is left out on purpose (see above).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedHouseId, weekNumber, history, settings, seasonStart]);

    // Keep unsaved typing on the phone (see StoredDraft).
    useEffect(() => {
        if (!dirty.current || !selectedHouseId) return;
        writeDraft(selectedHouseId, weekNumber, { drafts, miniCard });
    }, [drafts, miniCard, selectedHouseId, weekNumber]);

    // Throw away the unsaved typing and show what is saved.
    const discardDraft = () => {
        if (!selectedHouseId) return;
        clearDraft(selectedHouseId, weekNumber);
        setHistory(h => (h ? { ...h } : h)); // re-seed from the database
    };

    const selectedHouseName = useMemo(() => {
        if (!isAdmin) return null; // leader's house is fixed, no need to show a picker
        return houses.find(h => h.id === selectedHouseId)?.name ?? '';
    }, [isAdmin, houses, selectedHouseId]);

    const handleMiniCardChange = (key: keyof MiniCard, field: 'actual' | 'target', value: number) => {
        dirty.current = true;
        setMiniCard(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    };

    // Excused this week (sick, travelling): left out of the house average and
    // the ranking. The typed numbers are kept, so switching it off restores them.
    const handleExcusedChange = (memberId: string, excused: boolean) => {
        dirty.current = true;
        setDrafts(prev => ({ ...prev, [memberId]: { ...prev[memberId], excused } }));
    };

    const handleMemberChange = (memberId: string, field: 'actual' | 'target', metric: keyof MetricValues, value: number) => {
        dirty.current = true;
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
            setNewPhotos(prev => ({ ...prev, [memberId]: photoUrl }));
        } catch (err) {
            setPhotoError(err instanceof Error ? err.message : t('Сүрөт жүктөлбөй калды'));
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
            setNotice(t('{0} ачылды. Эми үй жетекчилери маалымат киргизе алышат.', label(next)));
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
            setNotice(t('Камдык көчүрмө жүктөлдү — аны сактап коюңуз.'));
        } catch (err) {
            setError(describeSaveError(err));
        } finally {
            setExporting(false);
        }
    };

    // What each person usually enters (their earlier weeks, not excused) —
    // the baseline for the typo check.
    const usualByMember = useMemo(() => {
        const out: Record<string, ReturnType<typeof usualValues>> = {};
        if (!history) return out;
        members.forEach(m => {
            const earlier = history.metrics
                .filter(r => r.memberId === m.id && r.weekNumber < weekNumber && !r.excused)
                .sort((a, b) => a.weekNumber - b.weekNumber)
                .map(r => r.actual);
            out[m.id] = usualValues(earlier);
        });
        return out;
    }, [history, members, weekNumber]);

    const typos: TypoWarning[] = useMemo(() => [
        ...miniCardTypos(miniCard),
        ...members.flatMap(m => {
            const d = drafts[m.id];
            return d && !d.excused ? memberTypos(m.id, d.actual, d.target, usualByMember[m.id] ?? {}) : [];
        })
    ], [miniCard, members, drafts, usualByMember]);
    const typoKeys = useMemo(() => new Set(typos.map(it => `${it.owner}|${it.key}`)), [typos]);
    // Any edit closes the question (the list could be out of date).
    useEffect(() => { setAskTypos(false); }, [typos]);

    const handleSubmit = async (e: React.FormEvent | null, typosConfirmed = false) => {
        e?.preventDefault();
        setNotice(null);
        if (typos.length > 0 && !typosConfirmed) {
            setAskTypos(true);
            return;
        }
        setAskTypos(false);
        if (!selectedHouseId) {
            setError(t('Үй тандалган жок'));
            return;
        }
        if (members.length === 0) {
            setError(t('Бул үйдө азырынча мүчө жок — админ аркылуу кошуу керек'));
            return;
        }
        if (!weekNumbers.includes(weekNumber)) {
            setError(t('{0} али ачыла элек — админ ачышы керек.', label(weekNumber)));
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await requireActiveSession();
            await assertWeekExists(weekNumber);
            await upsertHouseActivity(selectedHouseId, weekNumber, miniCard);
            await Promise.all(
                members.map(member => upsertMemberMetrics(member.id, weekNumber, drafts[member.id].actual, drafts[member.id].target, drafts[member.id].excused))
            );
            clearDraft(selectedHouseId, weekNumber);
            dirty.current = false;
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
                    <h2 className="font-display text-[2rem] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('Ийгиликтүү сакталды!')}</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>{t('{0} үчүн маалымат жаңырды.', label(weekNumber))}</p>
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
                        {selectedHouseName ? t('{0} — маалымат', selectedHouseName) : t('Маалымат кошуу')}
                    </h2>
                    <button onClick={onClose} aria-label={t('Жабуу')} className="p-2 -mr-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 sm:py-6">
                    {loading ? (
                        <div className="text-center py-12 font-serif" style={{ color: 'var(--text-muted)' }}>{t('Жүктөлүүдө…')}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
                                <div>
                                    <label className="block mb-1.5" style={fieldLabel} htmlFor="week-select">{t('Апта')}</label>
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
                                                <option key={n} value={n}>{label(n)}{n === latestWeek ? t(' (акыркы)') : ''}</option>
                                            ))}
                                            {weekNumbers.length === 0 && <option value={weekNumber}>{t('Ачык апта жок')}</option>}
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
                                                {openingWeek ? t('Ачылууда…') : confirmOpenWeek ? t('{0}: ачууну ырастаңыз', label(latestWeek + 1)) : t('Жаңы апта')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {authUser.role === 'admin' && (
                                    <div>
                                        <label className="block mb-1.5" style={fieldLabel}>{t('Үй')}</label>
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
                                    <p>{isAdmin ? t('{0} кулпуланган: жетекчилер өзгөртө албайт, бирок админ катары сиз өзгөртө аласыз.', label(weekNumber)) : t('{0} кулпуланган — өзгөртүү үчүн админге кайрылыңыз.', label(weekNumber))}</p>
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="font-display text-[1.35rem] font-bold mb-4 pb-2" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{t('Мини-карта (командалык)')}</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                    {(Object.keys(DEFAULT_MINICARD) as Array<keyof MiniCard>).map(key => (
                                        <div key={key} className="p-3" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                                            <div className="text-center text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }} title={cardName(key)}>{cardLabel(key)}</div>
                                            <div className="flex flex-col gap-2">
                                                <div>
                                                    <label className="text-xs block" style={{ color: 'var(--text-muted)' }}>{t('Факт')}</label>
                                                    <NumberInput
                                                        value={miniCard[key].actual}
                                                        aria-invalid={typoKeys.has(`card|${key}`) || undefined}
                                                        onValueChange={v => handleMiniCardChange(key, 'actual', v)}
                                                        className="w-full text-center p-1.5 text-base sm:text-sm"
                                                        style={inputStyle}
                                                        aria-label={t('{0} — Факт', cardName(key))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs block" style={{ color: 'var(--text-muted)' }}>{t('План')}</label>
                                                    <NumberInput
                                                        value={miniCard[key].target}
                                                        readOnly={!isAdmin}
                                                        tabIndex={isAdmin ? undefined : -1}
                                                        onValueChange={v => handleMiniCardChange(key, 'target', v)}
                                                        className={`w-full text-center p-1.5 text-base sm:text-sm ${isAdmin ? '' : 'cursor-default'}`}
                                                        style={isAdmin ? inputMutedStyle : { ...inputMutedStyle, borderStyle: 'dashed' }}
                                                        aria-label={t('{0} — План', cardName(key))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
                                    <h3 className="font-display text-[1.35rem] font-bold" style={{ color: 'var(--text-primary)' }}>{t('Мүчөлөр')}</h3>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('Сүрөттү өзгөртүү үчүн адамдын сүрөтүн басыңыз')}</p>
                                </div>
                                {/* The actual/target pairs had no visible label (only a
                                    hover tooltip, which doesn't exist on a phone). */}
                                <p className="text-xs mb-3 flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                                    <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3" style={{ ...inputStyle, borderRadius: 2 }} />  {t('үстүндө — Факт')}</span>
                                    <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3" style={{ ...inputMutedStyle, borderRadius: 2, borderStyle: isAdmin ? 'solid' : 'dashed' }} />  {t('астында — План')}</span>
                                    {!isAdmin && (
                                        <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" />  {t('Планды админ гана өзгөртөт')}</span>
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
                                        
                                        {t('Бул үйдө азырынча мүчө катталган эмес. Мүчө кошуу үчүн админ панелин колдонуңуз.')}
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
                                                            title={t('Сүрөт жүктөө / өзгөртүү')}
                                                        >
                                                            <Avatar name={member.name} role={member.role} photoUrl={newPhotos[member.id] ?? member.photoUrl} />
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
                                                                {ROLE_LABEL[member.role]}
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('Упай')}</div>
                                                            <div className="font-serif font-semibold text-lg font-variant-tabular" style={{ color: draft.excused ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                                                {draft.excused ? '—' : calculateMemberScore({ ...member, actual: draft.actual, target: draft.target }).toFixed(1)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {excusedSupported() && (
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                                                            <button
                                                                type="button"
                                                                role="switch"
                                                                aria-checked={draft.excused}
                                                                disabled={lockedForMe}
                                                                onClick={() => handleExcusedChange(member.id, !draft.excused)}
                                                                className="inline-flex items-center gap-2 text-sm disabled:opacity-60"
                                                                style={{ color: draft.excused ? 'var(--gold)' : 'var(--text-secondary)' }}
                                                            >
                                                                <span className="relative inline-block w-8 h-[18px] rounded-full transition-colors flex-shrink-0" style={{ backgroundColor: draft.excused ? 'var(--gold)' : 'var(--border-strong)' }}>
                                                                    <span className="absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all" style={{ left: draft.excused ? '16px' : '2px', backgroundColor: 'var(--surface)' }} />
                                                                </span>
                                                                
                                                                {t('Себептүү (ооруп / сапарда)')}
                                                            </button>
                                                            {draft.excused && (
                                                                <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{t('Бул апта үйдүн орточосуна жана рейтингге кирбейт. Сериялары үзүлбөйт.')}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2" style={draft.excused ? { opacity: 0.4 } : undefined} aria-disabled={draft.excused || undefined}>
                                                        {(Object.keys(ZERO_METRICS) as Array<keyof MetricValues>).map(metric => (
                                                            <div key={metric} className="text-center min-w-0">
                                                                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }} title={metricName(metric)}>{metricLabel(metric)}</div>
                                                                <NumberInput
                                                                    value={draft.actual[metric]}
                                                                    readOnly={draft.excused}
                                                                    aria-invalid={typoKeys.has(`${member.id}|${metric}`) || undefined}
                                                                    onValueChange={v => handleMemberChange(member.id, 'actual', metric, v)}
                                                                    className="w-full text-center px-0.5 py-1.5 mb-1 text-base sm:text-sm font-semibold"
                                                                    style={inputStyle}
                                                                    aria-label={t('{0} — {1} — Факт', member.name, metricName(metric))}
                                                                    title={t('Факт')}
                                                                />
                                                                <NumberInput
                                                                    value={draft.target[metric]}
                                                                    readOnly={!isAdmin}
                                                                    tabIndex={isAdmin ? undefined : -1}
                                                                    onValueChange={v => handleMemberChange(member.id, 'target', metric, v)}
                                                                    className={`w-full text-center px-0.5 py-1 text-sm sm:text-xs ${isAdmin ? '' : 'cursor-default'}`}
                                                                    style={isAdmin ? inputMutedStyle : { ...inputMutedStyle, borderStyle: 'dashed' }}
                                                                    aria-label={t('{0} — {1} — План', member.name, metricName(metric))}
                                                                    title={t('План')}
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
                    {restored && !error && (
                        <div role="status" className="px-3 py-2 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ borderLeft: '2px solid var(--gold)', color: 'var(--text-secondary)' }}>
                            <p className="min-w-0 flex-1">{t('Мурда киргизилип, сакталбай калган сандар кайра коюлду. Текшерип, «Сактоо» басыңыз.')}</p>
                            <button type="button" onClick={discardDraft} className="underline underline-offset-2" style={{ color: 'var(--text-muted)' }}>{t('Өчүрүү')}</button>
                        </div>
                    )}
                    {askTypos && typos.length > 0 && !error && (
                        <div role="alertdialog" aria-label={t('Сандарды текшериңиз')} className="px-3 py-2.5 mb-3 text-sm" style={{ borderLeft: '2px solid var(--danger)', color: 'var(--text-secondary)' }}>
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('Бул сандар туурабы? Адаттагыдан абдан көп:')}</p>
                            <ul className="mt-1.5 space-y-0.5 max-h-28 overflow-y-auto">
                                {typos.map(it => (
                                    <li key={`${it.owner}|${it.key}`} className="tabular">
                                        <b style={{ color: 'var(--text-primary)' }}>{it.owner === 'card' ? t('Мини-карта') : members.find(m => m.id === it.owner)?.name ?? ''}</b>
                                        {' — '}{it.owner === 'card' ? cardLabel(it.key as keyof MiniCard) : metricLabel(it.key as keyof MetricValues)} <b style={{ color: 'var(--danger)' }}>{it.value}</b>{' '}{it.usual
                                            ? t('(план {0}, адатта ~{1}) — {2}× көп', it.target, Math.round(it.usual), Math.round(it.value / it.target))
                                            : t('(план {0}) — {1}× көп', it.target, Math.round(it.value / it.target))}
                                    </li>
                                ))}
                            </ul>
                            <div className="flex flex-wrap gap-2 mt-2.5">
                                <button type="button" onClick={() => setAskTypos(false)} className="px-3 py-2 text-sm font-semibold" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>{t('Оңдоо')}</button>
                                <button type="button" onClick={() => handleSubmit(null, true)} className="px-3 py-2 text-sm font-semibold" style={{ border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)' }}>{t('Ооба, туура — сактоо')}</button>
                            </div>
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
                                title={t('Бүт базанын камдык көчүрмөсүн (JSON) жүктөп алуу')}
                                className="mr-auto inline-flex items-center justify-center gap-1.5 px-3 py-3 sm:py-2.5 font-semibold text-sm disabled:opacity-60"
                                style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">{exporting ? t('Даярдалууда…') : t('Камдык көчүрмө')}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 font-semibold text-sm"
                            style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}
                        >
                            
                            {t('Жабуу')}
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving || loading || !history || lockedForMe}
                            className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}
                        >
                            {saving ? t('Сакталууда…') : (<><Save className="w-4 h-4" />  {t('Сактоо')}</>)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
