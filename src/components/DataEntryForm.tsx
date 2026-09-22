import React, { useEffect, useMemo, useState } from 'react';
import { Save, AlertCircle, CheckCircle, X, Camera, Loader2 } from 'lucide-react';
import type { DataFile, House, Member, MetricValues, MiniCard } from '../types';
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

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' };
const inputMutedStyle: React.CSSProperties = { backgroundColor: 'var(--page-plane)', borderColor: 'var(--border)', color: 'var(--text-secondary)' };

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
    const lastKnownTarget = (memberId: string): MetricValues => {
        if (!dataFile) return DEFAULT_TARGETS;
        for (let i = dataFile.weeks.length - 1; i >= 0; i--) {
            const m = dataFile.weeks[i].teams.find(t => t.id === selectedHouseId)?.members.find(mm => mm.id === memberId);
            if (m) return m.target;
        }
        return DEFAULT_TARGETS;
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
                target: existingMember?.target ?? lastKnownTarget(member.id)
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
                <div className="rounded-2xl shadow-xl p-8 max-w-sm w-full text-center" style={{ backgroundColor: 'var(--surface)' }}>
                    <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#1baf7a' }} />
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Ийгиликтүү сакталды!</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>{weekNumber}-апта үчүн маалымат жаңырды.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backgroundColor: 'color-mix(in oklab, var(--text-primary) 45%, transparent)' }}>
            <div className="rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="p-6 border-b flex justify-between items-center sticky top-0 z-10 rounded-t-3xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {selectedHouseName ? `${selectedHouseName} — маалымат` : 'Маалымат кошуу'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12 font-medium" style={{ color: 'var(--text-muted)' }}>Жүктөлүүдө...</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Апта (Week Number)</label>
                                    <input
                                        type="number"
                                        value={weekNumber}
                                        onChange={e => setWeekNumber(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full px-4 py-2.5 border rounded-xl outline-none"
                                        style={inputStyle}
                                    />
                                </div>
                                {authUser.role === 'admin' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Үй</label>
                                        <select
                                            value={selectedHouseId}
                                            onChange={e => setSelectedHouseId(e.target.value)}
                                            className="w-full px-4 py-2.5 border rounded-xl outline-none"
                                            style={inputStyle}
                                        >
                                            {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 rounded-2xl mb-8 border" style={{ backgroundColor: 'var(--page-plane)', borderColor: 'var(--border)' }}>
                                <h3 className="text-lg font-bold mb-4 border-b pb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>Мини Карта (Командалык)</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {(Object.keys(DEFAULT_MINICARD) as Array<keyof MiniCard>).map(key => (
                                        <div key={key} className="p-3 rounded-xl shadow-sm border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                            <div className="text-center font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>{key}</div>
                                            <div className="flex flex-col gap-2">
                                                <div>
                                                    <label className="text-xs block" style={{ color: 'var(--text-muted)' }}>Факт</label>
                                                    <input
                                                        type="number"
                                                        value={miniCard[key].actual}
                                                        onChange={e => handleMiniCardChange(key, 'actual', parseInt(e.target.value) || 0)}
                                                        className="w-full text-center border rounded-lg p-1"
                                                        style={inputStyle}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs block" style={{ color: 'var(--text-muted)' }}>План</label>
                                                    <input
                                                        type="number"
                                                        value={miniCard[key].target}
                                                        onChange={e => handleMiniCardChange(key, 'target', parseInt(e.target.value) || 0)}
                                                        className="w-full text-center border rounded-lg p-1"
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
                                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Мүчөлөр</h3>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Сүрөттү өзгөртүү үчүн адамдын сүрөтүнө/тегерегине басыңыз</p>
                                </div>
                                {photoError && (
                                    <div className="border px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2 text-sm" style={{ backgroundColor: 'color-mix(in oklab, #e34948 12%, var(--surface))', borderColor: '#e34948', color: '#e34948' }}>
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <p>{photoError}</p>
                                    </div>
                                )}
                                {members.length === 0 ? (
                                    <p className="text-sm rounded-xl p-4 border" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--page-plane)', borderColor: 'var(--border)' }}>
                                        Бул үйдө азырынча мүчө катталган эмес. Мүчө кошуу үчүн админ панелин колдонуңуз.
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {members.map(member => {
                                            const draft = drafts[member.id];
                                            if (!draft) return null;
                                            return (
                                                <div key={member.id} className="border rounded-2xl p-4 shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                                    <div className="flex items-center gap-3 mb-4">
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
                                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                                {member.role === 'imam' ? 'Имам' : member.role === 'zam' ? 'Орун басар' : 'Мүчө'}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Упай</div>
                                                            <div className="font-bold text-lg" style={{ color: 'var(--accent)' }}>
                                                                {calculateMemberScore({ ...member, actual: draft.actual, target: draft.target }).toFixed(1)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                                                        {(Object.keys(ZERO_METRICS) as Array<keyof MetricValues>).map(metric => (
                                                            <div key={metric} className="text-center">
                                                                <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>{metric}</div>
                                                                <input
                                                                    type="number"
                                                                    value={draft.actual[metric]}
                                                                    onChange={e => handleMemberChange(member.id, 'actual', metric, parseInt(e.target.value) || 0)}
                                                                    className="w-full text-center border rounded-lg p-1 mb-1 text-sm font-semibold"
                                                                    style={inputStyle}
                                                                    title="Факт"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    value={draft.target[metric]}
                                                                    onChange={e => handleMemberChange(member.id, 'target', metric, parseInt(e.target.value) || 0)}
                                                                    className="w-full text-center border rounded-lg p-1 text-xs"
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
                                <div className="border px-4 py-3 rounded-xl mb-4 flex items-center gap-2" style={{ backgroundColor: 'color-mix(in oklab, #e34948 12%, var(--surface))', borderColor: '#e34948', color: '#e34948' }}>
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 p-4 -mx-6 -mb-6 rounded-b-3xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2.5 border rounded-xl font-medium transition-colors"
                                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                                >
                                    Жабуу
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="px-6 py-2.5 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60"
                                    style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-strong))` }}
                                >
                                    {saving ? 'Сакталууда...' : (<><Save className="w-5 h-5" /> Сактоо</>)}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
