/**
 * User store — manages user-list, leaderboard, and password-reset UI state.
 *
 * Responsibilities (SRP):
 *  - Hold users / leaderboard / password-reset-requests in Zustand
 *  - Orchestrate create / delete / token-giving workflows
 *  - Delegate all Supabase I/O to service modules
 *
 * The signUpClient and env-var re-reads that were here have been moved to
 * lib/supabase.ts.  The duplicated logActivity helper is replaced by
 * activityService.insertActivity.
 */

import { create } from 'zustand';
import type { Profile, PasswordResetRequest } from '../types/database';
import * as profileService from '../services/profileService';
import * as userServiceMod from '../services/userService';
import * as pointsService from '../services/pointsService';
import * as activityService from '../services/activityService';
import { logger } from '../lib/logger';

const CAT = 'userStore';

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
  giveTokens: (targetUserId: string, amount: number, reason: string, actorId: string, actorName: string, targetName: string) => Promise<{ error: string | null }>;
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

  // -----------------------------------------------------------------------
  // Fetch users
  // -----------------------------------------------------------------------
  fetchUsers: async (force = false) => {
    const state = get();
    const now = Date.now();

    if (!force) {
      if (state.loading) return;
      if (state.initialized && (now - state.lastFetch) < CACHE_DURATION) return;
    }

    set({ loading: true });

    try {
      const { data } = await profileService.fetchAllProfiles();
      if (data) {
        set({ users: data, initialized: true, lastFetch: Date.now() });
      }
    } catch (err) {
      logger.error(CAT, 'fetchUsers threw', { error: String(err) });
    } finally {
      set({ loading: false });
    }
  },

  // -----------------------------------------------------------------------
  // Leaderboard
  // -----------------------------------------------------------------------
  fetchLeaderboard: async (force = false) => {
    const state = get();
    const now = Date.now();

    if (!force && state.leaderboard.length > 0 && (now - state.lastFetch) < CACHE_DURATION) return;

    try {
      const { data } = await profileService.fetchLeaderboard();
      if (data) {
        set({ leaderboard: data });
      }
    } catch (err) {
      logger.error(CAT, 'fetchLeaderboard threw', { error: String(err) });
    }
  },

  // -----------------------------------------------------------------------
  // Create user
  // -----------------------------------------------------------------------
  createUser: async (email, password, fullName, role, actorId, actorName) => {
    logger.info(CAT, 'createUser', { email, role });

    try {
      let userId: string | null = null;

      // Step A: Try signUp
      const signUpResult = await userServiceMod.signUpAuthUser(email, password, fullName, role);

      if (signUpResult.error) {
        if (signUpResult.isOrphan) {
          // Check for orphan (auth record exists, no profile)
          const lookup = await userServiceMod.lookupUserByEmail(email);
          if (lookup.error) return { error: `Could not check existing user: ${lookup.error}` };
          if (!lookup.exists || !lookup.userId) {
            return { error: 'User already registered but could not be found. Please contact support.' };
          }
          if (lookup.hasProfile) {
            return { error: 'A user with this email already exists.' };
          }
          userId = lookup.userId;
        } else {
          return { error: signUpResult.error };
        }
      } else {
        userId = signUpResult.userId;
        if (!userId) return { error: 'Sign up succeeded but no user ID was returned.' };
      }

      // Step B: Confirm email + create profile
      const setup = await userServiceMod.setupUserProfile(userId!, fullName, role);
      if (setup.error || !setup.data) {
        return { error: setup.error ?? 'User created but profile setup returned an unexpected response.' };
      }

      // Activity log (fire-and-forget)
      activityService.insertActivity({
        actor_id: actorId,
        action_type: 'user_added',
        target_user_id: setup.data.userId,
        task_id: null,
        message: `${actorName} added ${fullName} as ${role}`,
      }).catch(() => {});

      // Refresh users list in background
      get().fetchUsers(true).catch(() => {});
      return { error: null, employeeId: setup.data.employeeId };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while creating the user';
      logger.error(CAT, 'createUser threw', { error: message });
      return { error: message };
    }
  },

  // -----------------------------------------------------------------------
  // Give tokens
  // -----------------------------------------------------------------------
  giveTokens: async (targetUserId, amount, reason, actorId, actorName, targetName) => {
    logger.info(CAT, 'giveTokens', { targetUserId, amount });

    try {
      const { error } = await pointsService.incrementTokens(targetUserId, amount);
      if (error) return { error };

      activityService.insertActivity({
        actor_id: actorId,
        action_type: 'tokens_given',
        target_user_id: targetUserId,
        task_id: null,
        message: `${actorName} gave ${amount} tokens to ${targetName}${reason ? ` — ${reason}` : ''}`,
      }).catch(() => {});

      get().fetchUsers(true).catch(() => {});
      get().fetchLeaderboard(true).catch(() => {});

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to give tokens';
      logger.error(CAT, 'giveTokens threw', { error: message });
      return { error: message };
    }
  },

  // -----------------------------------------------------------------------
  // Delete user
  // -----------------------------------------------------------------------
  deleteUser: async (userId) => {
    logger.info(CAT, 'deleteUser', { userId });

    const { error } = await userServiceMod.deleteUser(userId);
    if (error) return { error };

    set((s) => ({ users: s.users.filter((u) => u.id !== userId) }));
    return { error: null };
  },

  // -----------------------------------------------------------------------
  // Password-reset requests
  // -----------------------------------------------------------------------
  fetchPasswordResetRequests: async () => {
    const { data } = await userServiceMod.fetchPendingPasswordResets();
    if (data) {
      set({ passwordResetRequests: data });
    }
  },

  resetUserPassword: async (userId, newPassword, requestId, actorId, actorName, userEmail) => {
    logger.info(CAT, 'resetUserPassword', { userId, requestId });

    const { error } = await userServiceMod.resetUserPassword(userId, newPassword, requestId, actorId);
    if (error) return { error };

    activityService.insertActivity({
      actor_id: actorId,
      action_type: 'password_reset_request',
      target_user_id: userId,
      task_id: null,
      message: `${actorName} reset password for ${userEmail}`,
    }).catch(() => {});

    await get().fetchPasswordResetRequests();
    await get().fetchUsers(true);

    return { error: null };
  },

  dismissPasswordResetRequest: async (requestId) => {
    const { error } = await userServiceMod.dismissPasswordResetRequest(requestId);
    if (error) return { error };

    set((s) => ({
      passwordResetRequests: s.passwordResetRequests.filter((r) => r.id !== requestId),
    }));

    return { error: null };
  },

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------
  reset: () => {
    set({ users: [], leaderboard: [], passwordResetRequests: [], loading: false, initialized: false, lastFetch: 0 });
  },
}));
