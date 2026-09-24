// scripts/create-auth-users.js
//
// One-time (and safely re-runnable) setup script: creates the Supabase Auth
// accounts that leaders and the admin log in with. Each house gets its own
// account (email is <slug>@tdjamaat.internal — not a real inbox, just an
// identifier Supabase Auth requires), tagged with user_metadata so the RLS
// policies in schema.sql know which house it's allowed to write to.
//
// Re-running this script is safe: it updates the password/metadata of any
// account that already exists instead of failing, so it's also how you
// rotate a house's password later.
//
// Usage:
//   1. Fill in scripts/syr_sozdor.json (copy from .example, don't commit it —
//      the name is deliberately opaque so it doesn't read as "credentials
//      file" to anyone browsing the public repo; syr sozdor = "secret words")
//   2. node --env-file=.env.admin scripts/create-auth-users.js
//      where .env.admin has:
//        SUPABASE_URL=https://xxxx.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=eyJ...   (Project Settings > API > service_role
//                                             — NEVER the anon key, and never commit this)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
    console.error('Run with: node --env-file=.env.admin scripts/create-auth-users.js');
    process.exit(1);
}

const passwordsPath = path.join(__dirname, 'syr_sozdor.json');
if (!fs.existsSync(passwordsPath)) {
    console.error(`Missing ${passwordsPath}`);
    console.error('Copy scripts/syr_sozdor.example.json to scripts/syr_sozdor.json and fill in real passwords first.');
    process.exit(1);
}

const passwords = JSON.parse(fs.readFileSync(passwordsPath, 'utf-8'));
const EMAIL_DOMAIN = 'tdjamaat.internal';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function findExistingUser(email) {
    // Admin API is paginated; the account list here will always be tiny (houses + 1).
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (error) throw error;
    return data.users.find(u => u.email === email);
}

async function upsertAuthUser(email, password, userMetadata, label) {
    const existing = await findExistingUser(email);
    if (existing) {
        const { error } = await supabase.auth.admin.updateUserById(existing.id, {
            password,
            user_metadata: userMetadata
        });
        if (error) throw error;
        console.log(`Updated  ${label} (${email})`);
    } else {
        const { error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: userMetadata
        });
        if (error) throw error;
        console.log(`Created  ${label} (${email})`);
    }
}

async function main() {
    // Admin account
    if (!passwords.admin) {
        console.error('scripts/syr_sozdor.json is missing an "admin" password.');
        process.exit(1);
    }
    await upsertAuthUser(`admin@${EMAIL_DOMAIN}`, passwords.admin, { role: 'admin' }, 'admin');

    // One account per house, matched by slug
    const { data: houses, error } = await supabase.from('houses').select('id, slug, name');
    if (error) throw error;

    if (!houses || houses.length === 0) {
        console.error('No houses found — run supabase/schema.sql and supabase/seed.sql first.');
        process.exit(1);
    }

    for (const house of houses) {
        const pw = passwords[house.slug];
        if (!pw) {
            console.warn(`Skipping ${house.name} (${house.slug}) — no password set for it in syr_sozdor.json`);
            continue;
        }
        await upsertAuthUser(
            `${house.slug}@${EMAIL_DOMAIN}`,
            pw,
            { role: 'leader', house_id: house.id },
            house.name
        );
    }

    console.log('\nDone. Each house leader signs in with just their house name + password in the app;');
    console.log('the app builds the <slug>@tdjamaat.internal email internally.');
}

main().catch(err => {
    console.error('Failed:', err.message || err);
    process.exit(1);
});
