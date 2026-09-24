import React, { useEffect, useMemo, useState } from 'react';
import { Save, AlertCircle, CheckCircle, X, Camera, Loader2 } from 'lucide-react';
import type { DataFile, House, Member, MetricValues, MiniCard, Role } from '../types';
import {
    fetchHouses,
    fetchMembers,
    fetchDataFile,
    ensureWeekExists,
    upsertHouseActivity,
    upsertMemberMetrics,
    uploadMemberPhoto,
    DEFAULT_MINICARD,
    DEFAULT_TARGETS
} from '../services/dataService';
import { calculateMemberScore } from '../utils/scoring';
import { Avatar } from './Avatar';
import type { AuthUser } from '../services/authService';

interface DataEntryFormProps {
    authUser: AuthUser;
    defaultWeekNumber: number;
    initialHouseId?: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

const ZERO_METRICS: MetricValues = {
    'К-К': 0, 'СВТ': 0, 'КТП': 0, 'ТХЖ': 0, 'ДТА': 0, 'ИСТГ': 0, 'НФ': 0, 'ТСП': 0
};

type MemberDraft = { actual: MetricValues; target: MetricValues };

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-primary)' };
const inputMutedStyle: React.CSSProperties = { backgroundColor: 'var(--page-plane)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-secondary)' };
const fieldLabel: React.CSSProperties = { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' };

// Roster (who's in the house, and their usual targets) is now persistent —
// entering a new week just means filling in this week's "actual" numbers,
// not re-typing the whole team from scratch.
export const DataEntryForm: React.FC<DataEntryFormProps> = ({ authUser, defaultWeekNumber, initialHouseId, onClose, onSuccess }) => {
    const [houses, setHouses] = useState<House[]>([]);
    const [selectedHouseId, setSelectedHouseId] = useState<string>(authUser.houseId ?? initialHouseId ?? '');
    const [weekNumber, setWeekNumber] = useState<number>(defaultWeekNumber);
    const [members, setMembers] = useState<Member[]>([]);
    const [dataFile, setDataFile] = useState<DataFile | null>(null);
    const [miniCard, setMiniCard] = useState<MiniCard>(DEFAULT_MINICARD);
    const [drafts, setDrafts] = useState<Record<string, MemberDraft>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [uploadingPhotoFor, setUploadingPhotoFor] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            authUser.role === 'admin' ? fetchHouses() : Promise.resolve<House[]>([]),
            fetchDataFile()
        ]).then(([houseList, df]) => {
            setHouses(houseList);
            setDataFile(df);
            if (authUser.role === 'admin' && !selectedHouseId && houseList.length > 0) {
                setSelectedHouseId(houseList[0].id);
            }
        }).finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!selectedHouseId) return;
        fetchMembers().then(all => setMembers(all.filter(m => m.houseId === selectedHouseId)));
    }, [selectedHouseId]);

    // Find this house's most recent recorded target for a member, so a new
    // week starts from what they were last aiming for rather than zero.
    const lastKnownTarget = (memberId: string, role: Role): MetricValues => {
        if (!dataFile) return DEFAULT_TARGETS[role];
        for (let i = dataFile.weeks.length - 1; i >= 0; i--) {
            const m = dataFile.weeks[i].teams.find(t => t.id === selectedHouseId)?.members.find(mm => mm.id === memberId);
            if (m) return m.target;
        }
        return DEFAULT_TARGETS[role];
    };

    const lastKnownMiniCard = (): MiniCard => {
        if (!dataFile) return DEFAULT_MINICARD;
        for (let i = dataFile.weeks.length - 1; i >= 0; i--) {
            const t = dataFile.weeks[i].teams.find(t => t.id === selectedHouseId);
            if (t) return t.miniCard;
        }
        return DEFAULT_MINICARD;
    };

    // Seed the editable state whenever the house/week selection (or the roster) changes.
    useEffect(() => {
        if (!selectedHouseId || !dataFile) return;

        const existingWeek = dataFile.weeks.find(w => w.weekNumber === weekNumber);
        const existingTeam = existingWeek?.teams.find(t => t.id === selectedHouseId);

        setMiniCard(existingTeam?.miniCard ?? lastKnownMiniCard());

        const nextDrafts: Record<string, MemberDraft> = {};
        members.forEach(member => {
            const existingMember = existingTeam?.members.find(m => m.id === member.id);
            nextDrafts[member.id] = {
                actual: existingMember?.actual ?? ZERO_METRICS,
                target: existingMember?.target ?? lastKnownTarget(member.id, member.role)
            };
        });
        setDrafts(nextDrafts);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedHouseId, weekNumber, members, dataFile]);

    const selectedHouseName = useMemo(() => {
        if (authUser.role === 'leader') return null; // leader's house is fixed, no need to show a picker
        return houses.find(h => h.id === selectedHouseId)?.name ?? '';
    }, [authUser.role, houses, selectedHouseId]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedHouseId) {
            setError('Үй тандалган жок');
            return;
        }
        if (members.length === 0) {
            setError('Бул үйдө азырынча мүчө жок — админ аркылуу кошуу керек');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await ensureWeekExists(weekNumber);
            await upsertHouseActivity(selectedHouseId, weekNumber, miniCard);
            await Promise.all(
                members.map(member => upsertMemberMetrics(member.id, weekNumber, drafts[member.id].actual, drafts[member.id].target))
            );
            setSuccess(true);
            setTimeout(onSuccess, 1200);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Сактоо учурунда ката кетти');
        } finally {
            setSaving(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-6" style={{ backgroundColor: 'color-mix(in oklab, var(--text-primary) 50%, transparent)' }}>
                <div className="p-8 max-w-sm w-full text-center" style={{ backgroundColor: 'var(--surface)', borderRadius: '4px' }}>
                    <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#1baf7a' }} />
                    <h2 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Ийгиликтүү сакталды!</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>{weekNumber}-апта үчүн маалымат жаңырды.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backgroundColor: 'color-mix(in oklab, var(--text-primary) 45%, transparent)' }}>
            <div className="w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                <div className="px-6 py-5 flex justify-between items-center sticky top-0 z-10" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <h2 className="font-serif text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {selectedHouseName ? `${selectedHouseName} — маалымат` : 'Маалымат кошуу'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12 font-serif" style={{ color: 'var(--text-muted)' }}>Жүктөлүүдө…</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block mb-1.5" style={fieldLabel}>Апта (Week Number)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={weekNumber}
                                        onChange={e => setWeekNumber(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full px-4 py-2.5 outline-none"
                                        style={inputStyle}
                                    />
                                </div>
                                {authUser.role === 'admin' && (
                                    <div>
                                        <label className="block mb-1.5" style={fieldLabel}>Үй</label>
                                        <select
                                            value={selectedHouseId}
                                            onChange={e => setSelectedHouseId(e.target.value)}
                                            className="w-full px-4 py-2.5 outline-none"
                                            style={inputStyle}
                                        >
                                            {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="mb-8">
                                <h3 className="font-serif text-base font-semibold mb-4 pb-2" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>Мини Карта (Командалык)</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {(Object.keys(DEFAULT_MINICARD) as Array<keyof MiniCard>).map(key => (
                                        <div key={key} className="p-3" style={{ border: '1px solid var(--border)', borderRadius: '3px' }}>
                                            <div className="text-center text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{key}</div>
                                            <div className="flex flex-col gap-2">
                                                <div>
                                                    <label className="text-xs block" style={{ color: 'var(--text-muted)' }}>Факт</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={miniCard[key].actual}
                                                        onChange={e => handleMiniCardChange(key, 'actual', Math.max(0, parseInt(e.target.value) || 0))}
                                                        className="w-full text-center p-1"
                                                        style={inputStyle}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs block" style={{ color: 'var(--text-muted)' }}>План</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={miniCard[key].target}
                                                        onChange={e => handleMiniCardChange(key, 'target', Math.max(0, parseInt(e.target.value) || 0))}
                                                        className="w-full text-center p-1"
                                                        style={inputMutedStyle}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                                    <h3 className="font-serif text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Мүчөлөр</h3>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Сүрөттү өзгөртүү үчүн адамдын сүрөтүнө/тегерегине басыңыз</p>
                                </div>
                                {photoError && (
                                    <div className="px-4 py-2.5 mb-4 flex items-center gap-2 text-sm" style={{ borderLeft: '2px solid #e34948', color: '#e34948' }}>
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <p>{photoError}</p>
                                    </div>
                                )}
                                {members.length === 0 ? (
                                    <p className="text-sm p-4" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '3px' }}>
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
                                                                style={{ backgroundColor: 'color-mix(in oklab, var(--text-primary) 55%, transparent)' }}
                                                            >
                                                                {uploadingPhotoFor === member.id
                                                                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                                                                    : <Camera className="w-4 h-4 text-white" />}
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
                                                        <div className="flex-1">
                                                            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{member.name}</div>
                                                            <div className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                                                {member.role === 'imam' ? 'Имам' : member.role === 'zam' ? 'Орун басар' : 'Мүчө'}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Упай</div>
                                                            <div className="font-serif font-semibold text-lg font-variant-tabular" style={{ color: 'var(--text-primary)' }}>
                                                                {calculateMemberScore({ ...member, actual: draft.actual, target: draft.target }).toFixed(1)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                                                        {(Object.keys(ZERO_METRICS) as Array<keyof MetricValues>).map(metric => (
                                                            <div key={metric} className="text-center">
                                                                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{metric}</div>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    value={draft.actual[metric]}
                                                                    onChange={e => handleMemberChange(member.id, 'actual', metric, Math.max(0, parseInt(e.target.value) || 0))}
                                                                    className="w-full text-center p-1 mb-1 text-sm font-semibold"
                                                                    style={inputStyle}
                                                                    title="Факт"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    value={draft.target[metric]}
                                                                    onChange={e => handleMemberChange(member.id, 'target', metric, Math.max(0, parseInt(e.target.value) || 0))}
                                                                    className="w-full text-center p-1 text-xs"
                                                                    style={inputMutedStyle}
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

                            {error && (
                                <div className="px-4 py-3 mb-4 flex items-center gap-2" style={{ borderLeft: '2px solid #e34948', color: '#e34948' }}>
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 sticky bottom-0 p-4 -mx-6 -mb-6" style={{ backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 font-semibold transition-colors text-sm"
                                    style={{ border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-secondary)' }}
                                >
                                    Жабуу
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="px-5 py-2.5 font-semibold transition-all flex items-center gap-2 disabled:opacity-60 text-sm"
                                    style={{ backgroundColor: 'var(--accent)', color: '#ffffff', borderRadius: '3px' }}
                                >
                                    {saving ? 'Сакталууда…' : (<><Save className="w-4 h-4" /> Сактоо</>)}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
};
