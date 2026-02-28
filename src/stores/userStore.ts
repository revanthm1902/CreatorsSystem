import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Profile, ActivityLogInsert, PasswordResetRequest } from '../types/database';

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
    
    // Skip if already loading
    if (state.loading) return;
    
    // Use cache if valid and not forcing refresh
    if (!force && state.initialized && (now - state.lastFetch) < CACHE_DURATION) {
      return;
    }
    
    set({ loading: true });
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('employee_id', { ascending: true });
      
      if (!error && data) {
        set({ users: data, initialized: true, lastFetch: now });
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
    // Use server-side RPC to create both auth user and profile atomically.
    // This avoids the signUp() session-switch bug that corrupts the Director's session
    // and causes profile creation to fail due to RLS.
    try {
      const { data, error } = await supabase.rpc('admin_create_user', {
        p_email: email,
        p_password: password,
        p_full_name: fullName,
        p_role: role,
      });

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        return { error: 'No response from server. Please check if the database function exists.' };
      }

      const result = data as { user_id: string; employee_id: string };

      if (!result.user_id || !result.employee_id) {
        return { error: 'Invalid response from server.' };
      }

      // Log activity
      await logActivity({
        actor_id: actorId,
        action_type: 'user_added',
        target_user_id: result.user_id,
        task_id: null,
        message: `${actorName} added ${fullName} as ${role}`,
      });

      // Force refresh users list
      await get().fetchUsers(true);
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
