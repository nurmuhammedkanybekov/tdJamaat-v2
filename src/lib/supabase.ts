
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in environment variables');
}

// PKCE: a Google sign-in comes back as ?code=… (exchanged here), which leaves
// the site's own #/… addresses alone. Password sign-ins are unaffected.
// The ?code=… from Google is exchanged by us (src/lib/authReturn.ts), not
// silently by the library: when it fails (sign-in started in another
// browser or inside an app), the person is told why instead of just
// landing signed out.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { flowType: 'pkce', detectSessionInUrl: false } });
