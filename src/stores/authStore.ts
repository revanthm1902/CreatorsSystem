/**
 * Auth store — manages authentication UI state.
 *
 * Responsibilities (SRP):
 *  - Hold current user + profile in Zustand state
 *  - Coordinate sign-in / sign-out / password update flows
 *  - Initialize auth from the existing session on app start
 *
 * All Supabase I/O is delegated to authService & profileService.
 * Error mapping is delegated to errorHandling utilities.
 */

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types/database';
import * as authService from '../services/authService';
import * as profileService from '../services/profileService';
import { friendlyError, isTransientError } from '../lib/errorHandling';
import { logger } from '../lib/logger';

const CAT = 'authStore';

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
    logger.info(CAT, 'initialize');
    set({ loading: true });

    const session = await authService.getSession();

    if (session?.user) {
      set({ user: session.user });
      try {
        await get().fetchProfile();
      } catch {
        logger.warn(CAT, 'initialize — fetchProfile failed, will retry on navigation');
      }
    }

    set({ loading: false, initialized: true });

    // Listen for auth changes (clean up previous listener if re-initialized)
    if (_authSubscription) {
      _authSubscription.unsubscribe();
    }

    _authSubscription = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        set({ user: session.user });
        try {
          await get().fetchProfile();
        } catch {
          // Silently ignore — profile will be fetched when user navigates
        }
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null });
      }
    });
  },

  signIn: async (email: string, password: string) => {
    logger.info(CAT, 'signIn', { email });
    set({ loading: true });

    try {
      const { user, error: authError } = await authService.signInWithPassword(email, password);

      if (authError || !user) {
        set({ loading: false });
        return { error: friendlyError(authError ?? 'Authentication failed'), requiresPasswordReset: false };
      }

      set({ user });

      // Fetch profile
      const { data: profileData, error: profileError } = await profileService.fetchProfileById(user.id);

      if (profileError) {
        if (isTransientError(profileError.message)) {
          set({ loading: false });
          return {
            error: 'Temporary database issue. Please try again in a moment.',
            requiresPasswordReset: false,
          };
        }
        // Genuine missing profile
        await authService.signOut();
        set({ user: null, profile: null, loading: false });
        return {
          error: 'Profile not found. Please contact your administrator to complete your account setup.',
          requiresPasswordReset: false,
        };
      }

      if (!profileData) {
        await authService.signOut();
        set({ user: null, profile: null, loading: false });
        return {
          error: 'Profile not found. Please contact your administrator to complete your account setup.',
          requiresPasswordReset: false,
        };
      }

      set({ profile: profileData, loading: false });
      logger.info(CAT, 'signIn succeeded', { userId: user.id, role: profileData.role });
      return { error: null, requiresPasswordReset: profileData.is_temporary_password ?? false };
    } catch (e: unknown) {
      set({ loading: false });
      const msg = e instanceof Error ? e.message : 'An unexpected error occurred';
      logger.error(CAT, 'signIn threw', { error: msg });
      return { error: friendlyError(msg), requiresPasswordReset: false };
    }
  },

  signOut: async () => {
    logger.info(CAT, 'signOut');
    set({ user: null, profile: null });
    await authService.signOut();
    set({ user: null, profile: null });
  },

  updatePassword: async (newPassword: string) => {
    logger.info(CAT, 'updatePassword');

    const { error } = await authService.updatePassword(newPassword);
    if (error) return { error };

    const { user } = get();
    if (user) {
      await profileService.updateProfile(user.id, { is_temporary_password: false });
      await get().fetchProfile();
    }

    return { error: null };
  },

  updateProfile: async (data: ProfileUpdateData) => {
    const { user } = get();
    if (!user) return { error: 'Not authenticated' };

    logger.info(CAT, 'updateProfile', { fields: Object.keys(data) });

    const { error } = await profileService.updateProfile(user.id, data);
    if (error) return { error };

    await get().fetchProfile();
    return { error: null };
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await profileService.fetchProfileById(user.id);
    if (!error && data) {
      set({ profile: data });
    }
  },
}));
