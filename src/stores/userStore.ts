import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, ActivityLogInsert, PasswordResetRequest } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Single isolated client for signUp — never persists sessions, never interferes with admin
// Created once at module level to avoid "Multiple GoTrueClient instances" warnings.
const signUpClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-signup-isolated', // unique key so it never collides with main client
  },
});

// Helper function to log activity
async function logActivity(activity: ActivityLogInsert) {
  try {
    await supabase.from('activity_log').insert(activity);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

interface UserState {
  users: Profile[];
  leaderboard: Profile[];
  passwordResetRequests: PasswordResetRequest[];
  loading: boolean;
  initialized: boolean;
  lastFetch: number;
  fetchUsers: (force?: boolean) => Promise<void>;
  fetchLeaderboard: (force?: boolean) => Promise<void>;
  createUser: (email: string, password: string, fullName: string, role: 'Admin' | 'User', actorId: string, actorName: string) => Promise<{ error: string | null; employeeId?: string }>;
  deleteUser: (userId: string) => Promise<{ error: string | null }>;
  fetchPasswordResetRequests: () => Promise<void>;
  resetUserPassword: (userId: string, newPassword: string, requestId: string, actorId: string, actorName: string, userEmail: string) => Promise<{ error: string | null }>;
  dismissPasswordResetRequest: (requestId: string) => Promise<{ error: string | null }>;
  reset: () => void;
}

const CACHE_DURATION = 30000; // 30 seconds

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  leaderboard: [],
  passwordResetRequests: [],
  loading: false,
  initialized: false,
  lastFetch: 0,

  fetchUsers: async (force = false) => {
    const state = get();
    const now = Date.now();
    
    // For forced calls (after create/delete), always proceed and reset loading if stuck
    if (!force) {
      if (state.loading) return;
      if (state.initialized && (now - state.lastFetch) < CACHE_DURATION) return;
    }
    
    set({ loading: true });
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('employee_id', { ascending: true });
      
      if (!error && data) {
        set({ users: data, initialized: true, lastFetch: Date.now() });
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchLeaderboard: async (force = false) => {
    const state = get();
    const now = Date.now();
    
    // Use cache if valid and not forcing refresh
    if (!force && state.leaderboard.length > 0 && (now - state.lastFetch) < CACHE_DURATION) {
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'User')
        .order('total_tokens', { ascending: false })
        .limit(50);
      
      if (!error && data) {
        set({ leaderboard: data });
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  },

  createUser: async (email: string, password: string, fullName: string, role: 'Admin' | 'User', actorId: string, actorName: string) => {
    // Two-step approach:
    //   Step A: Create auth user via GoTrue signUp (proper record GoTrue can authenticate)
    //   Step B: Confirm email + create profile via admin_setup_user RPC
    //
    // Edge cases handled:
    //   - User already in auth.users but no profile (orphan from prior failed attempt) → just setup
    //   - User fully exists (auth + profile) → error "already exists"
    //   - Brand new user → signUp + setup
    try {
      let userId: string | null = null;

      // --- Step A: Try signUp ---
      const { data: signUpData, error: signUpError } = await signUpClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
        },
      });

      if (signUpError) {
        const msg = signUpError.message.toLowerCase();

        // "User already registered" → check if they have a profile (orphan recovery)
        if (msg.includes('already registered') || msg.includes('already been registered') || signUpError.status === 422) {
          const { data: lookupData, error: lookupError } = await supabase.rpc('admin_get_user_id_by_email', {
            p_email: email,
          });

          if (lookupError) {
            return { error: `Could not check existing user: ${lookupError.message}` };
          }

          const lookup = lookupData as { exists: boolean; user_id?: string; has_profile?: boolean } | null;

          if (!lookup?.exists || !lookup.user_id) {
            return { error: 'User already registered but could not be found. Please contact support.' };
          }

          if (lookup.has_profile) {
            return { error: 'A user with this email already exists.' };
          }

          // Orphan: auth record exists but no profile → recover by setting up profile
          userId = lookup.user_id;
        } else {
          return { error: signUpError.message };
        }
      } else {
        // signUp succeeded
        userId = signUpData.user?.id ?? null;
        if (!userId) {
          return { error: 'Sign up succeeded but no user ID was returned.' };
        }
      }

      // --- Step B: Confirm email + create profile ---
      const { data, error: setupError } = await supabase.rpc('admin_setup_user', {
        p_user_id: userId,
        p_full_name: fullName,
        p_role: role,
      });

      if (setupError) {
        return { error: setupError.message };
      }

      const result = data as { user_id: string; employee_id: string } | null;
      if (!result?.user_id || !result?.employee_id) {
        return { error: 'User created but profile setup returned an unexpected response.' };
      }

      // Log activity (fire-and-forget, don't block user creation)
      logActivity({
        actor_id: actorId,
        action_type: 'user_added',
        target_user_id: result.user_id,
        task_id: null,
        message: `${actorName} added ${fullName} as ${role}`,
      }).catch(() => {});

      // Refresh users list in background (don't block the modal)
      get().fetchUsers(true).catch(() => {});
      return { error: null, employeeId: result.employee_id };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while creating the user';
      return { error: message };
    }
  },

  deleteUser: async (userId: string) => {
    // Use RPC to properly handle FK constraints and delete auth user
    const { error } = await supabase.rpc('admin_delete_user', {
      p_target_user_id: userId,
    });

    if (error) {
      return { error: error.message };
    }

    // Optimistically update local state
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
    }));

    return { error: null };
  },

  fetchPasswordResetRequests: async () => {
    const { data, error } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ passwordResetRequests: data as PasswordResetRequest[] });
    }
  },

  resetUserPassword: async (userId: string, newPassword: string, requestId: string, actorId: string, actorName: string, userEmail: string) => {
    // Call the RPC function to reset the password
    const { error: rpcError } = await supabase.rpc('admin_reset_user_password', {
      target_user_id: userId,
      new_password: newPassword,
    });

    if (rpcError) {
      return { error: rpcError.message };
    }

    // Mark the request as approved
    await supabase
      .from('password_reset_requests')
      .update({
        status: 'approved',
        resolved_by: actorId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // Log activity
    await logActivity({
      actor_id: actorId,
      action_type: 'password_reset_request',
      target_user_id: userId,
      task_id: null,
      message: `${actorName} reset password for ${userEmail}`,
    });

    // Refresh requests and users
    await get().fetchPasswordResetRequests();
    await get().fetchUsers(true);

    return { error: null };
  },

  dismissPasswordResetRequest: async (requestId: string) => {
    const { error } = await supabase
      .from('password_reset_requests')
      .update({
        status: 'dismissed',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      return { error: error.message };
    }

    // Update local state
    set((state) => ({
      passwordResetRequests: state.passwordResetRequests.filter((r) => r.id !== requestId),
    }));

    return { error: null };
  },

  reset: () => {
    set({ users: [], leaderboard: [], passwordResetRequests: [], loading: false, initialized: false, lastFetch: 0 });
  },
}));
