import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import type { User } from '@supabase/supabase-js';

// Retry helper for transient PostgREST / network errors
async function retryQuery<T>(
  fn: () => Promise<{ data: T | null; error: { message: string; code?: string } | null }>,
  retries = 3,
  delayMs = 800,
): Promise<{ data: T | null; error: { message: string; code?: string } | null }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const result = await fn();
    if (!result.error) return result;
    // Only retry on transient DB / schema errors, not on auth or RLS
    const msg = result.error.message?.toLowerCase() ?? '';
    const isTransient = msg.includes('schema') || msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('502') || msg.includes('503');
    if (!isTransient || attempt === retries - 1) return result;
    await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
  }
  return { data: null, error: { message: 'Query failed after retries' } };
}

interface ProfileUpdateData {
  full_name?: string;
  date_of_birth?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  resume_url?: string | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; requiresPasswordReset: boolean }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  updateProfile: (data: ProfileUpdateData) => Promise<{ error: string | null }>;
  fetchProfile: () => Promise<void>;
  initialize: () => Promise<void>;
}

let _authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    set({ loading: true });
    
    let session = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data.session;
    } catch {
      // Auth service temporarily unavailable — continue with no session
    }
    
    if (session?.user) {
      set({ user: session.user });
      await get().fetchProfile();
    }
    
    set({ loading: false, initialized: true });

    // Listen for auth changes (clean up previous listener if re-initialized)
    if (_authSubscription) {
      _authSubscription.unsubscribe();
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        set({ user: session.user });
        await get().fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null });
      }
    });
    _authSubscription = subscription;
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ loading: false });
      return { error: error.message, requiresPasswordReset: false };
    }

    set({ user: data.user });
    
    // Fetch profile with retry for transient DB errors
    const { data: profileData, error: profileError } = await retryQuery(() =>
      supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
    );

    if (profileError) {
      const msg = profileError.message?.toLowerCase() ?? '';
      const isTransient = msg.includes('schema') || msg.includes('network') || msg.includes('fetch') || msg.includes('timeout');
      if (isTransient) {
        // Don't sign out — it's a temporary DB issue
        set({ loading: false });
        return {
          error: 'Temporary database issue. Please try again in a moment.',
          requiresPasswordReset: false,
        };
      }
      // Genuine missing profile
      await supabase.auth.signOut();
      set({ user: null, profile: null, loading: false });
      return { 
        error: 'Profile not found. Please contact your administrator to complete your account setup.', 
        requiresPasswordReset: false 
      };
    }

    if (!profileData) {
      await supabase.auth.signOut();
      set({ user: null, profile: null, loading: false });
      return { 
        error: 'Profile not found. Please contact your administrator to complete your account setup.', 
        requiresPasswordReset: false 
      };
    }

    set({ profile: profileData, loading: false });
    
    return { 
      error: null, 
      requiresPasswordReset: profileData.is_temporary_password ?? false 
    };
  },

  signOut: async () => {
    // Clear state FIRST so UI reacts immediately
    set({ user: null, profile: null });
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out API error (state cleared anyway):', e);
    }
    // Ensure state stays cleared even if auth listener raced
    set({ user: null, profile: null });
  },

  updatePassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      return { error: error.message };
    }

    // Update the profile to mark password as no longer temporary
    const { user } = get();
    if (user) {
      await supabase
        .from('profiles')
        .update({ is_temporary_password: false })
        .eq('id', user.id);
      
      await get().fetchProfile();
    }

    return { error: null };
  },

  updateProfile: async (data: ProfileUpdateData) => {
    const { user } = get();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id);

    if (error) {
      return { error: error.message };
    }

    await get().fetchProfile();
    return { error: null };
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await retryQuery(() =>
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
    );

    if (!error && data) {
      set({ profile: data as Profile });
    }
  },
}));
