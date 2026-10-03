import { supabase } from '../lib/supabase';
import type { DataFile, House, Member, MetricValues, MiniCard, Role, Season } from '../types';
import { buildDataFile } from './buildDataFile';
import type { ActivityRow, HouseRow, MemberRow, MetricRow as FullMetricRow, WeekRow } from './buildDataFile';

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
    'КИТЕП': { actual: 0, target: 5 },
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

type MetricRow = { member_id: string; week_number: number; actual: unknown; target: unknown };

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

// Seasons (supabase/seasons-2026-10.sql). Before that migration exists this
// returns [] and the site treats everything as one season.
export const fetchSeasons = async (): Promise<Season[]> => {
    const { data, error } = await supabase.from('seasons').select('*').order('first_week');
    if (error) {
        if (!isMissingSchema(error)) console.warn('[tdJamaat] seasons unavailable:', error.message);
        return [];
    }
    return ((data ?? []) as Array<{ id: number; name: string; first_week: number; last_week: number | null }>).map(r => ({
        id: r.id, name: r.name, firstWeek: r.first_week, lastWeek: r.last_week
    }));
};

export const fetchDataFile = async (): Promise<DataFile> => {
    const [houses, members, weeks, metrics, activities, settings, seasons] = await Promise.all([
        fetchAll<HouseRow>('houses', 'display_order'),
        fetchAll<MemberRow>('members', 'display_order'), // inactive too — they still belong to past weeks
        fetchAll<WeekRow>('weeks', 'week_number'),
        fetchAll<FullMetricRow>('weekly_metrics', 'week_number'),
        fetchAll<ActivityRow>('house_activity', 'week_number'),
        fetchSeasonSettings(),
        fetchSeasons()
    ]);
    return buildDataFile(
        { houses, members, weeks, metrics, activities, seasons },
        settings,
        { normalizeMetrics, normalizeMiniCard, zeroMetrics: ZERO_METRICS }
    );
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
    const filename = `${memberId}.${ext}`;
    const path = `${houseId}/${filename}`;

    // A member's photo is saved as "<memberId>.<ext>", so `upsert` only
    // overwrites a file at that exact path. If they last uploaded a .jpg and
    // now upload a .png, the path changes and the old .jpg would otherwise
    // sit in storage forever. Clean up any other file for this member first.
    try {
        const { data: existing } = await supabase.storage.from(PHOTO_BUCKET).list(houseId);
        const stale = (existing ?? [])
            .filter(entry => entry.name.startsWith(`${memberId}.`) && entry.name !== filename)
            .map(entry => `${houseId}/${entry.name}`);
        if (stale.length > 0) await supabase.storage.from(PHOTO_BUCKET).remove(stale);
    } catch {
        // Non-fatal — worst case is one leftover old file, not a failed upload.
    }

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

// ---------------------------------------------------------------------------
// Change history + week locking + season settings (admin).
// Needs supabase/history-and-locks-2026-10.sql. Until that's run, these
// fail with a clear "not set up yet" message instead of breaking the page.
// ---------------------------------------------------------------------------

export class NotSetUpError extends Error {
    constructor() {
        super('Бул функция үчүн базаны жаңыртуу керек: supabase/history-and-locks-2026-10.sql файлын Supabase SQL Editor аркылуу бир жолу иштетиңиз.');
        this.name = 'NotSetUpError';
    }
}

// 42P01 = table missing (Postgres), PGRST205/PGRST204 = table/column not in
// the API's schema cache, 42703 = column missing.
const isMissingSchema = (error: DbError) =>
    ['42P01', 'PGRST205', 'PGRST204', '42703'].includes(error.code ?? '') || /does not exist|schema cache/i.test(error.message ?? '');

export interface AuditEntry {
    id: number;
    tableName: 'weekly_metrics' | 'house_activity';
    houseId: string | null;
    memberId: string | null;
    weekNumber: number;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    actorRole: string | null;
    actorHouseId: string | null;
    oldData: { actual?: Record<string, number>; activity?: Record<string, { actual?: number; target?: number }>; target?: Record<string, number> } | null;
    newData: { actual?: Record<string, number>; activity?: Record<string, { actual?: number; target?: number }>; target?: Record<string, number> } | null;
    changedAt: string;
}

type AuditRow = {
    id: number; table_name: AuditEntry['tableName']; house_id: string | null; member_id: string | null; week_number: number;
    action: AuditEntry['action']; actor_role: string | null; actor_house_id: string | null;
    old_data: AuditEntry['oldData']; new_data: AuditEntry['newData']; changed_at: string;
};

export const fetchAuditLog = async (opts: { houseId?: string | null; limit?: number } = {}): Promise<AuditEntry[]> => {
    let query = supabase.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(opts.limit ?? 300);
    if (opts.houseId) query = query.eq('house_id', opts.houseId);
    const { data, error } = await query;
    if (error) {
        if (isMissingSchema(error)) throw new NotSetUpError();
        fail(error);
    }
    return ((data ?? []) as AuditRow[]).map(r => ({
        id: r.id, tableName: r.table_name, houseId: r.house_id, memberId: r.member_id, weekNumber: r.week_number,
        action: r.action, actorRole: r.actor_role, actorHouseId: r.actor_house_id,
        oldData: r.old_data, newData: r.new_data, changedAt: r.changed_at
    }));
};

export const setWeekLocked = async (weekNumber: number, locked: boolean) => {
    const { error } = await supabase.from('weeks').update({ locked }).eq('week_number', weekNumber);
    if (error) {
        if (isMissingSchema(error)) throw new NotSetUpError();
        fail(error);
    }
};

export const saveSeasonSettings = async (roleTargets: Record<Role, MetricValues>, activityTargets: Record<keyof MiniCard, number>) => {
    const { error } = await supabase
        .from('season_settings')
        .update({ role_targets: roleTargets, activity_targets: activityTargets, updated_at: new Date().toISOString() })
        .eq('id', 1);
    if (error) fail(error);
};

// Admin: make new minimums apply to weeks already saved, from `fromWeek`
// on. Saved targets are carried forward week to week, so without this a
// changed minimum would only reach people with no history yet.
export const applyTargetsFromWeek = async (
    fromWeek: number,
    roleTargets: Record<Role, MetricValues> | null,
    activityTargets: Record<keyof MiniCard, number> | null
): Promise<{ metricRows: number; activityRows: number }> => {
    let metricRows = 0, activityRows = 0;
    if (roleTargets) {
        const members = await fetchMembers(true);
        const roleOf = new Map(members.map(m => [m.id, m.role]));
        const { data, error } = await supabase.from('weekly_metrics').select('id, member_id').gte('week_number', fromWeek);
        if (error) fail(error);
        for (const row of (data ?? []) as Array<{ id: string; member_id: string }>) {
            const role = roleOf.get(row.member_id);
            if (!role) continue;
            const { error: e } = await supabase.from('weekly_metrics').update({ target: roleTargets[role] }).eq('id', row.id);
            if (e) fail(e);
            metricRows++;
        }
    }
    if (activityTargets) {
        const { data, error } = await supabase.from('house_activity').select('id, activity').gte('week_number', fromWeek);
        if (error) fail(error);
        for (const row of (data ?? []) as Array<{ id: string; activity: Record<string, { actual?: number; target?: number }> | null }>) {
            const next: Record<string, { actual: number; target: number }> = {};
            for (const key of Object.keys(activityTargets) as Array<keyof MiniCard>) {
                next[key] = { actual: Number(row.activity?.[key]?.actual ?? 0) || 0, target: activityTargets[key] };
            }
            const { error: e } = await supabase.from('house_activity').update({ activity: next }).eq('id', row.id);
            if (e) fail(e);
            activityRows++;
        }
    }
    return { metricRows, activityRows };
};

// Admin: end the running season and start the next one (one atomic step in
// the database — supabase/seasons-2026-10.sql).
export const startNewSeason = async (name: string, lockFinished: boolean) => {
    const { error } = await supabase.rpc('start_new_season', { new_name: name, lock_finished: lockFinished });
    if (error) {
        if (isMissingSchema(error) || error.code === 'PGRST202') throw new Error('Сезондор үчүн базаны жаңыртуу керек: supabase/seasons-2026-10.sql файлын Supabase SQL Editor аркылуу бир жолу иштетиңиз.');
        fail(error);
    }
};

export const renameSeason = async (id: number, name: string) => {
    const { error } = await supabase.from('seasons').update({ name }).eq('id', id);
    if (error) fail(error);
};
