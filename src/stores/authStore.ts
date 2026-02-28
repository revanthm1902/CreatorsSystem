import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import type { User } from '@supabase/supabase-js';

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
    
    const { data: { session } } = await supabase.auth.getSession();
    
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
    
    // Fetch profile and check if it exists
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profileData) {
      // Profile doesn't exist - sign out and show error
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

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      set({ profile: data });
    }
  },
}));
