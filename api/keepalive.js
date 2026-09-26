// Vercel Cron → GET /api/keepalive once a day (schedule in vercel.json).
//
// Supabase's free plan pauses a project after 7 days without activity. A
// quiet week (a holiday, a break between rounds) would otherwise take the
// site down mid-season. One tiny read a day counts as activity.
//
// Uses the same public URL + publishable key the website itself ships with
// (Vercel → Project → Settings → Environment Variables).
export default async function handler(req, res) {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
        res.status(500).json({
            ok: false,
            error: 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set in Vercel → Settings → Environment Variables'
        });
        return;
    }

    try {
        const r = await fetch(`${url}/rest/v1/weeks?select=week_number&limit=1`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` }
        });
        res.status(r.ok ? 200 : 502).json({ ok: r.ok, supabaseStatus: r.status, at: new Date().toISOString() });
    } catch (err) {
        res.status(502).json({ ok: false, error: String(err), at: new Date().toISOString() });
    }
}
