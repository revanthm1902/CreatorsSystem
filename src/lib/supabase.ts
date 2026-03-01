/**
 * Centralised Supabase client creation.
 *
 * Responsibilities (SRP):
 *  - Read environment variables ONCE
 *  - Export a typed main client for normal operations
 *  - Export an isolated signUp client that never persists sessions
 *    (used during user creation so the admin's session is not hijacked)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

/**
 * Primary Supabase client — used for all authenticated operations.
 *
 * Type safety is enforced at the service layer (src/services/*) rather than
 * via the Database generic here, because the manually-maintained Database type
 * is incomplete (missing tables like password_reset_requests and several RPCs).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Isolated Supabase client used ONLY for `auth.signUp` during user creation.
 * It never persists sessions and never interferes with the admin's active session.
 */
export const signUpClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-signup-isolated',
  },
});
