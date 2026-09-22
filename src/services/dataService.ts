import { supabase } from '../lib/supabase';
import type { DataFile, WeekData, Team, TeamMember, House, Member, MetricValues, MiniCard, Role } from '../types';

const ZERO_METRICS: MetricValues = {
    'К-К': 0, 'СВТ': 0, 'КТП': 0, 'ТХЖ': 0, 'ДТА': 0, 'ИСТГ': 0, 'НФ': 0, 'ТСП': 0
};

export const DEFAULT_TARGETS: MetricValues = {
    'К-К': 20, 'СВТ': 2100, 'КТП': 70, 'ТХЖ': 2, 'ДТА': 1, 'ИСТГ': 700, 'НФ': 7, 'ТСП': 5
};

export const DEFAULT_MINICARD: MiniCard = {
    'БГМДТ': { actual: 0, target: 7 },
    'КПТ': { actual: 0, target: 7 },
    'И-Н.2': { actual: 0, target: 7 },
    'КИТЕП': { actual: 0, target: 5 },
    'СПОРТ': { actual: 0, target: 1 },
    'ТСПХ': { actual: 0, target: 5 }
};

// ---------------------------------------------------------------------------
// Roster (houses / members) — read
// ---------------------------------------------------------------------------

export const fetchHouses = async (includeInactive = false): Promise<House[]> => {
    let query = supabase.from('houses').select('*').order('display_order');
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(h => ({
        id: h.id, name: h.name, slug: h.slug, displayOrder: h.display_order, active: h.active
    }));
};

export const fetchMembers = async (includeInactive = false): Promise<Member[]> => {
    let query = supabase.from('members').select('*').order('display_order');
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(m => ({
        id: m.id, houseId: m.house_id, name: m.name, role: m.role as Role,
        photoUrl: m.photo_url, displayOrder: m.display_order, active: m.active
    }));
};

// ---------------------------------------------------------------------------
// Dashboard read — reconstructs the old DataFile shape from the normalized tables
// ---------------------------------------------------------------------------

export const fetchDataFile = async (): Promise<DataFile> => {
    const [housesRes, membersRes, weeksRes, metricsRes, activityRes] = await Promise.all([
        supabase.from('houses').select('*').eq('active', true).order('display_order'),
        supabase.from('members').select('*').eq('active', true).order('display_order'),
        supabase.from('weeks').select('*').order('week_number'),
        supabase.from('weekly_metrics').select('*'),
        supabase.from('house_activity').select('*')
    ]);

    for (const res of [housesRes, membersRes, weeksRes, metricsRes, activityRes]) {
        if (res.error) throw new Error(res.error.message);
    }

    const houses = housesRes.data ?? [];
    const members = membersRes.data ?? [];
    const weeks = weeksRes.data ?? [];
    const metrics = metricsRes.data ?? [];
    const activities = activityRes.data ?? [];

    const weekDataList: WeekData[] = weeks.map(week => {
        const teams: Team[] = houses.map(house => {
            const houseMembers = members.filter(m => m.house_id === house.id);
            const activityRow = activities.find(a => a.house_id === house.id && a.week_number === week.week_number);

            const teamMembers: TeamMember[] = houseMembers.map(member => {
                const metricRow = metrics.find(row => row.member_id === member.id && row.week_number === week.week_number);
                return {
                    id: member.id,
                    name: member.name,
                    role: member.role as Role,
                    photoUrl: member.photo_url,
                    actual: (metricRow?.actual as MetricValues) ?? ZERO_METRICS,
                    target: (metricRow?.target as MetricValues) ?? DEFAULT_TARGETS
                };
            });

            return {
                id: house.id,
                name: house.name,
                miniCard: (activityRow?.activity as MiniCard) ?? DEFAULT_MINICARD,
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

export const ensureWeekExists = async (weekNumber: number, startDate?: string | null, endDate?: string | null) => {
    const { error } = await supabase
        .from('weeks')
        .upsert({ week_number: weekNumber, start_date: startDate ?? null, end_date: endDate ?? null }, { onConflict: 'week_number' });
    if (error) throw error;
};

export const upsertMemberMetrics = async (memberId: string, weekNumber: number, actual: MetricValues, target: MetricValues) => {
    const { error } = await supabase
        .from('weekly_metrics')
        .upsert(
            { member_id: memberId, week_number: weekNumber, actual, target, updated_at: new Date().toISOString() },
            { onConflict: 'member_id,week_number' }
        );
    if (error) throw error;
};

export const upsertHouseActivity = async (houseId: string, weekNumber: number, activity: MiniCard) => {
    const { error } = await supabase
        .from('house_activity')
        .upsert(
            { house_id: houseId, week_number: weekNumber, activity, updated_at: new Date().toISOString() },
            { onConflict: 'house_id,week_number' }
        );
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
};

export const addMember = async (houseId: string, name: string, role: Role, displayOrder: number) => {
    const { data, error } = await supabase
        .from('members')
        .insert({ house_id: houseId, name, role, display_order: displayOrder })
        .select()
        .single();
    if (error) throw error;
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
    if (error) throw error;
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
    if (uploadError) throw uploadError;

    // Cache-bust so the new photo shows immediately instead of a stale cached one.
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    const photoUrl = `${data.publicUrl}?v=${Date.now()}`;

    await updateMember(memberId, { photoUrl });
    return photoUrl;
};
