// Vercel Cron → GET /api/keepalive once a day (schedule in vercel.json).
//
// Supabase's free plan pauses a project after 7 days without activity. A
// quiet week (a holiday, a break between rounds) would otherwise take the
// site down mid-season. One tiny read a day counts as activity.
//
// Uses the same public URL + publishable key the website itself ships with
// (Vercel → Project → Settings → Environment Variables).
//
// When CRON_SECRET is set in Vercel, only Vercel's own cron may call it
// (Vercel sends "Authorization: Bearer <CRON_SECRET>"); anyone else gets 401.
export default async function handler(req, res) {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
        res.status(401).json({ ok: false });
        return;
    }
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
        res.status(500).json({ ok: false, error: 'not configured' });
        return;
    }

    try {
        const r = await fetch(`${url}/rest/v1/weeks?select=week_number&limit=1`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` }
        });
        res.status(r.ok ? 200 : 502).json({ ok: r.ok, supabaseStatus: r.status, at: new Date().toISOString() });
    } catch (err) {
        console.error('keepalive:', err);
        res.status(502).json({ ok: false, at: new Date().toISOString() });
    }
}
