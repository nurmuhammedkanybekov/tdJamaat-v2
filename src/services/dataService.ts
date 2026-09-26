import { supabase } from '../lib/supabase';
import type { DataFile, WeekData, Team, TeamMember, House, Member, MetricValues, MiniCard, Role } from '../types';

const ZERO_METRICS: MetricValues = {
    'К-К': 0, 'СВТ': 0, 'КТП': 0, 'ТХЖ': 0, 'ДТА': 0, 'ИСТГ': 0, 'НФ': 0, 'ТСП': 0
};

// The season's minimums. The source of truth is the `season_settings` table
// (supabase/season-2026-09.sql) — these constants are only a fallback so the
// site still works if that table can't be read. Keep the two in sync.
export const DEFAULT_TARGETS: Record<Role, MetricValues> = {
    imam: { 'К-К': 20, 'СВТ': 2100, 'КТП': 70, 'ТХЖ': 2, 'ДТА': 1, 'ИСТГ': 700, 'НФ': 7, 'ТСП': 10 },
    zam: { 'К-К': 10, 'СВТ': 1400, 'КТП': 40, 'ТХЖ': 1, 'ДТА': 1, 'ИСТГ': 350, 'НФ': 7, 'ТСП': 7 },
    member: { 'К-К': 7, 'СВТ': 700, 'КТП': 30, 'ТХЖ': 1, 'ДТА': 1, 'ИСТГ': 200, 'НФ': 7, 'ТСП': 7 }
};

export const DEFAULT_MINICARD: MiniCard = {
    'БГМДТ': { actual: 0, target: 7 },
    'КПТ': { actual: 0, target: 7 },
    'И-Н.2': { actual: 0, target: 7 },
    'КИТЕП': { actual: 0, target: 7 },
    'СПОРТ': { actual: 0, target: 1 },
    'ТСПХ': { actual: 0, target: 7 },
    'БАБХ': { actual: 0, target: 7 }
};

export interface SeasonSettings {
    roleTargets: Record<Role, MetricValues>;
    miniCard: MiniCard; // targets, with actual = 0
}

const FALLBACK_SETTINGS: SeasonSettings = { roleTargets: DEFAULT_TARGETS, miniCard: DEFAULT_MINICARD };

// supabase-js hands back database errors as plain objects
// ({ message, details, hint, code }), NOT Error instances. Throwing them
// raw meant every caller's `err instanceof Error` check failed and the user
// only ever saw a generic "something went wrong" — the real reason (e.g. a
// row-level-security rejection) was swallowed. Always wrap them.
type DbError = { message?: string; details?: string | null; hint?: string | null; code?: string };

export class DatabaseError extends Error {
    code?: string;
    constructor(error: DbError) {
        super([error.message, error.details, error.hint].filter(Boolean).join(' — ') || 'Unknown database error');
        this.name = 'DatabaseError';
        this.code = error.code;
    }
}

const fail = (error: DbError): never => {
    console.error('[tdJamaat] database error:', error);
    throw new DatabaseError(error);
};

// ---------------------------------------------------------------------------
// Roster (houses / members) — read
// ---------------------------------------------------------------------------

export const fetchHouses = async (includeInactive = false): Promise<House[]> => {
    let query = supabase.from('houses').select('*').order('display_order');
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) fail(error);
    return (data ?? []).map(h => ({
        id: h.id, name: h.name, slug: h.slug, displayOrder: h.display_order, active: h.active
    }));
};

export const fetchMembers = async (includeInactive = false): Promise<Member[]> => {
    let query = supabase.from('members').select('*').order('display_order');
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) fail(error);
    return (data ?? []).map(m => ({
        id: m.id, houseId: m.house_id, name: m.name, role: m.role as Role,
        photoUrl: m.photo_url, displayOrder: m.display_order, active: m.active
    }));
};

// ---------------------------------------------------------------------------
// Season settings (role minimums + mini-card targets)
// ---------------------------------------------------------------------------

export const fetchSeasonSettings = async (): Promise<SeasonSettings> => {
    const { data, error } = await supabase.from('season_settings').select('*').eq('id', 1).maybeSingle();
    if (error || !data) {
        if (error) console.warn('[tdJamaat] season_settings unavailable, using built-in minimums:', error.message);
        return FALLBACK_SETTINGS;
    }
    const roleTargets = { ...DEFAULT_TARGETS };
    for (const role of ['imam', 'zam', 'member'] as Role[]) {
        roleTargets[role] = normalizeMetrics(data.role_targets?.[role], DEFAULT_TARGETS[role]);
    }
    const miniCard = { ...DEFAULT_MINICARD };
    for (const key of Object.keys(DEFAULT_MINICARD) as Array<keyof MiniCard>) {
        const t = Number(data.activity_targets?.[key]);
        miniCard[key] = { actual: 0, target: Number.isFinite(t) ? t : DEFAULT_MINICARD[key].target };
    }
    return { roleTargets, miniCard };
};

// ---------------------------------------------------------------------------
// Dashboard read — reconstructs the old DataFile shape from the normalized tables
// ---------------------------------------------------------------------------

// Supabase caps a response at 1,000 rows by default. 30 people × 16 weeks is
// already 480 metric rows, so a bigger roster or a longer season would start
// silently dropping results. Always page through everything.
const PAGE = 1000;
async function fetchAll<T>(table: string, order: string): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase.from(table).select('*').order(order).range(from, from + PAGE - 1);
        if (error) fail(error);
        rows.push(...((data ?? []) as T[]));
        if (!data || data.length < PAGE) return rows;
    }
}

// A stored row is JSON — make sure every metric is present and numeric, so a
// missing or malformed value shows up as 0 rather than breaking a score.
export const normalizeMetrics = (value: unknown, fallback: MetricValues): MetricValues => {
    const src = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    const out = { ...fallback };
    for (const key of Object.keys(fallback) as Array<keyof MetricValues>) {
        const n = Number(src[key]);
        if (src[key] !== undefined && src[key] !== null && Number.isFinite(n)) out[key] = n;
    }
    return out;
};

export const normalizeMiniCard = (value: unknown, fallback: MiniCard): MiniCard => {
    const src = (value && typeof value === 'object' ? value : {}) as Record<string, { actual?: unknown; target?: unknown } | undefined>;
    const out = {} as MiniCard;
    for (const key of Object.keys(fallback) as Array<keyof MiniCard>) {
        const a = Number(src[key]?.actual), t = Number(src[key]?.target);
        out[key] = {
            actual: Number.isFinite(a) ? a : 0,
            target: Number.isFinite(t) ? t : fallback[key].target
        };
    }
    return out;
};

type HouseRow = { id: string; name: string; display_order: number; active: boolean };
type MemberRow = { id: string; house_id: string; name: string; role: Role; photo_url: string | null; display_order: number; active: boolean };
type WeekRow = { week_number: number; start_date: string | null; end_date: string | null };
type MetricRow = { member_id: string; week_number: number; actual: unknown; target: unknown };
type ActivityRow = { house_id: string; week_number: number; activity: unknown };

// Everything one house has actually saved (not the placeholders the dashboard
// shows for weeks a house hasn't submitted) — used by the data-entry form to
// carry each member's target forward from their most recent real entry.
export interface HouseHistory {
    metrics: { memberId: string; weekNumber: number; actual: MetricValues; target: MetricValues | null }[];
    activity: { weekNumber: number; miniCard: MiniCard; hasTargets: boolean }[];
}

export const fetchHouseHistory = async (houseId: string, memberIds: string[]): Promise<HouseHistory> => {
    const [metricsRes, activityRes] = await Promise.all([
        memberIds.length
            ? supabase.from('weekly_metrics').select('member_id, week_number, actual, target').in('member_id', memberIds).order('week_number')
            : Promise.resolve({ data: [], error: null }),
        supabase.from('house_activity').select('week_number, activity').eq('house_id', houseId).order('week_number')
    ]);
    if (metricsRes.error) fail(metricsRes.error);
    if (activityRes.error) fail(activityRes.error);
    return {
        metrics: ((metricsRes.data ?? []) as MetricRow[]).map(r => ({
            memberId: r.member_id,
            weekNumber: r.week_number,
            actual: normalizeMetrics(r.actual, ZERO_METRICS),
            target: r.target && typeof r.target === 'object' && Object.keys(r.target as object).length ? normalizeMetrics(r.target, ZERO_METRICS) : null
        })),
        activity: ((activityRes.data ?? []) as Array<{ week_number: number; activity: unknown }>).map(r => ({
            weekNumber: r.week_number,
            miniCard: normalizeMiniCard(r.activity, DEFAULT_MINICARD),
            hasTargets: !!r.activity && typeof r.activity === 'object'
        }))
    };
};

export const fetchDataFile = async (): Promise<DataFile> => {
    const [houses, members, weeks, metrics, activities, settings] = await Promise.all([
        fetchAll<HouseRow>('houses', 'display_order'),
        fetchAll<MemberRow>('members', 'display_order'), // inactive too — they still belong to past weeks
        fetchAll<WeekRow>('weeks', 'week_number'),
        fetchAll<MetricRow>('weekly_metrics', 'week_number'),
        fetchAll<ActivityRow>('house_activity', 'week_number'),
        fetchSeasonSettings()
    ]);

    const activeHouses = houses.filter(h => h.active);
    const metricByKey = new Map(metrics.map(r => [`${r.member_id}|${r.week_number}`, r]));
    const activityByKey = new Map(activities.map(r => [`${r.house_id}|${r.week_number}`, r]));

    const weekDataList: WeekData[] = weeks.map(week => {
        const teams: Team[] = activeHouses.map(house => {
            const houseMembers = members.filter(m => m.house_id === house.id);
            const submitted = houseMembers.filter(m => metricByKey.has(`${m.id}|${week.week_number}`));

            // Who counts in a house for a given week:
            //  - once the house has submitted that week → exactly the people it
            //    submitted (the roster as it really was). Someone who joins in
            //    week 8 doesn't appear as a zero in weeks 1–7 and drag those
            //    old averages down; someone who leaves keeps their past weeks.
            //  - not submitted yet → today's active roster at zero, so the
            //    house visibly shows as "nothing entered" rather than vanishing.
            const roster = submitted.length > 0 ? submitted : houseMembers.filter(m => m.active);

            const teamMembers: TeamMember[] = roster.map(member => {
                const row = metricByKey.get(`${member.id}|${week.week_number}`);
                const roleTarget = settings.roleTargets[member.role] ?? DEFAULT_TARGETS.member;
                return {
                    id: member.id,
                    name: member.name,
                    role: member.role,
                    photoUrl: member.photo_url,
                    actual: normalizeMetrics(row?.actual, ZERO_METRICS),
                    target: row ? normalizeMetrics(row.target, roleTarget) : roleTarget
                };
            });

            const activityRow = activityByKey.get(`${house.id}|${week.week_number}`);
            return {
                id: house.id,
                name: house.name,
                miniCard: normalizeMiniCard(activityRow?.activity, settings.miniCard),
                members: teamMembers
            };
        });

        return {
            weekNumber: week.week_number,
            date: formatWeekDate(week.start_date, week.end_date),
            teams
        };
    });

    return { weeks: weekDataList };
};

const formatWeekDate = (start: string | null, end: string | null): string => {
    if (start && end) return `${start} -- ${end}`;
    return start || end || '';
};

// ---------------------------------------------------------------------------
// Weekly data entry — write (RLS restricts a leader session to their own house_id)
// ---------------------------------------------------------------------------

export const fetchWeekNumbers = async (): Promise<number[]> => {
    const { data, error } = await supabase.from('weeks').select('week_number').order('week_number');
    if (error) fail(error);
    return (data ?? []).map(w => w.week_number as number);
};

// Weeks are opened by the admin only (the database enforces it too). A save
// just checks the week is there — it never creates or overwrites one.
export const assertWeekExists = async (weekNumber: number) => {
    const { data, error } = await supabase
        .from('weeks')
        .select('week_number')
        .eq('week_number', weekNumber)
        .maybeSingle();
    if (error) fail(error);
    if (!data) throw new Error(`${weekNumber}-апта али ачыла элек — админ ачышы керек.`);
};

// Admin: open the next week. INSERT … ON CONFLICT DO NOTHING — never touches
// an existing week.
export const openWeek = async (weekNumber: number) => {
    const { error } = await supabase
        .from('weeks')
        .upsert({ week_number: weekNumber }, { onConflict: 'week_number', ignoreDuplicates: true });
    if (error) fail(error);
};

// Admin: full copy of every table as one JSON file — a backup to keep after
// each week, and the way to restore if anything ever goes wrong.
export const exportBackup = async (): Promise<Blob> => {
    const [houses, members, weeks, weekly_metrics, house_activity] = await Promise.all([
        fetchAll('houses', 'display_order'),
        fetchAll('members', 'display_order'),
        fetchAll('weeks', 'week_number'),
        fetchAll('weekly_metrics', 'week_number'),
        fetchAll('house_activity', 'week_number')
    ]);
    const { data: season_settings } = await supabase.from('season_settings').select('*');
    const payload = {
        exported_at: new Date().toISOString(),
        app: 'tdJamaat',
        tables: { houses, members, weeks, weekly_metrics, house_activity, season_settings: season_settings ?? [] }
    };
    return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
};

export const upsertMemberMetrics = async (memberId: string, weekNumber: number, actual: MetricValues, target: MetricValues) => {
    const { error } = await supabase
        .from('weekly_metrics')
        .upsert(
            { member_id: memberId, week_number: weekNumber, actual, target, updated_at: new Date().toISOString() },
            { onConflict: 'member_id,week_number' }
        );
    if (error) fail(error);
};

export const upsertHouseActivity = async (houseId: string, weekNumber: number, activity: MiniCard) => {
    const { error } = await supabase
        .from('house_activity')
        .upsert(
            { house_id: houseId, week_number: weekNumber, activity, updated_at: new Date().toISOString() },
            { onConflict: 'house_id,week_number' }
        );
    if (error) fail(error);
};

// ---------------------------------------------------------------------------
// Roster management — admin only (RLS blocks leader sessions from these)
// ---------------------------------------------------------------------------

export const addHouse = async (name: string, slug: string, displayOrder: number) => {
    const { data, error } = await supabase
        .from('houses')
        .insert({ name, slug, display_order: displayOrder })
        .select()
        .single();
    if (error) fail(error);
    return data;
};

export const updateHouse = async (id: string, patch: Partial<{ name: string; slug: string; displayOrder: number; active: boolean }>) => {
    const { error } = await supabase
        .from('houses')
        .update({
            ...(patch.name !== undefined && { name: patch.name }),
            ...(patch.slug !== undefined && { slug: patch.slug }),
            ...(patch.displayOrder !== undefined && { display_order: patch.displayOrder }),
            ...(patch.active !== undefined && { active: patch.active })
        })
        .eq('id', id);
    if (error) fail(error);
};

export const addMember = async (houseId: string, name: string, role: Role, displayOrder: number) => {
    const { data, error } = await supabase
        .from('members')
        .insert({ house_id: houseId, name, role, display_order: displayOrder })
        .select()
        .single();
    if (error) fail(error);
    return data;
};

export const updateMember = async (id: string, patch: Partial<{ name: string; role: Role; photoUrl: string | null; displayOrder: number; active: boolean; houseId: string }>) => {
    const { error } = await supabase
        .from('members')
        .update({
            ...(patch.name !== undefined && { name: patch.name }),
            ...(patch.role !== undefined && { role: patch.role }),
            ...(patch.photoUrl !== undefined && { photo_url: patch.photoUrl }),
            ...(patch.displayOrder !== undefined && { display_order: patch.displayOrder }),
            ...(patch.active !== undefined && { active: patch.active }),
            ...(patch.houseId !== undefined && { house_id: patch.houseId })
        })
        .eq('id', id);
    if (error) fail(error);
};

// ---------------------------------------------------------------------------
// Member photo — self-service (a leader may upload for their OWN house;
// storage + members RLS in supabase/photo-upload-setup.sql enforce that).
// ---------------------------------------------------------------------------

const PHOTO_BUCKET = 'member-photos';

export const uploadMemberPhoto = async (houseId: string, memberId: string, file: File): Promise<string> => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${houseId}/${memberId}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type || undefined });
    if (uploadError) throw new Error(uploadError.message);

    // Cache-bust so the new photo shows immediately instead of a stale cached one.
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    const photoUrl = `${data.publicUrl}?v=${Date.now()}`;

    await updateMember(memberId, { photoUrl });
    return photoUrl;
};
