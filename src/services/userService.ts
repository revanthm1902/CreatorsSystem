/**
 * User-management data-access service.
 *
 * Responsibilities (SRP):
 *  - Create auth users via the isolated signUp client
 *  - Set up user profiles via RPC
 *  - Look up users by email
 *  - Delete users via RPC
 *  - Password-reset request CRUD
 *  - Reset user passwords via RPC
 *
 * Does NOT manage UI state.
 */

import { supabase, signUpClient } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { PasswordResetRequest } from '../types/database';

const CAT = 'userService';

export interface CreateUserResult {
  userId: string;
  employeeId: string;
}

/** Create a new auth user via the isolated signUp client. */
export async function signUpAuthUser(
  email: string,
  password: string,
  fullName: string,
  role: string,
): Promise<{ userId: string | null; error: string | null; isOrphan: boolean }> {
  logger.info(CAT, 'signUpAuthUser', { email, role });

  try {
    const { data, error } = await signUpClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      const alreadyExists =
        msg.includes('already registered') ||
        msg.includes('already been registered') ||
        error.status === 422;

      if (alreadyExists) {
        logger.warn(CAT, 'signUpAuthUser — user already registered, checking for orphan', { email });
        return { userId: null, error: error.message, isOrphan: true };
      }

      logger.error(CAT, 'signUpAuthUser failed', { error: error.message });
      return { userId: null, error: error.message, isOrphan: false };
    }

    const userId = data.user?.id ?? null;
    if (!userId) {
      logger.error(CAT, 'signUpAuthUser — no user ID returned');
      return { userId: null, error: 'Sign up succeeded but no user ID was returned.', isOrphan: false };
    }

    logger.info(CAT, 'signUpAuthUser succeeded', { userId });
    return { userId, error: null, isOrphan: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(CAT, 'signUpAuthUser exception', { error: message });
    return { userId: null, error: message, isOrphan: false };
  }
}

/** Look up a user by email via RPC (to detect orphans). */
export async function lookupUserByEmail(
  email: string,
): Promise<{ exists: boolean; userId?: string; hasProfile?: boolean; error: string | null }> {
  logger.info(CAT, 'lookupUserByEmail', { email });

  try {
    const { data, error } = await supabase.rpc('admin_get_user_id_by_email', { p_email: email });

    if (error) {
      logger.error(CAT, 'lookupUserByEmail failed', { error: error.message });
      return { exists: false, error: error.message };
    }

    const lookup = data as { exists: boolean; user_id?: string; has_profile?: boolean } | null;
    return {
      exists: lookup?.exists ?? false,
      userId: lookup?.user_id,
      hasProfile: lookup?.has_profile,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(CAT, 'lookupUserByEmail exception', { error: message });
    return { exists: false, error: message };
  }
}

/** Confirm email + create profile via DB RPC. */
export async function setupUserProfile(
  userId: string,
  fullName: string,
  role: string,
  department?: string | null,
): Promise<{ data: CreateUserResult | null; error: string | null }> {
  logger.info(CAT, 'setupUserProfile', { userId, role, department });

  try {
    const { data, error } = await supabase.rpc('admin_setup_user', {
      p_user_id: userId,
      p_full_name: fullName,
      p_role: role,
      p_department: department ?? null,
    });

    if (error) {
      logger.error(CAT, 'setupUserProfile failed', { error: error.message });
      return { data: null, error: error.message };
    }

    const result = data as { user_id: string; employee_id: string } | null;
    if (!result?.user_id || !result?.employee_id) {
      logger.error(CAT, 'setupUserProfile — unexpected response shape', { data });
      return { data: null, error: 'Profile setup returned an unexpected response.' };
    }

    logger.info(CAT, 'setupUserProfile succeeded', { employeeId: result.employee_id });
    return { data: { userId: result.user_id, employeeId: result.employee_id }, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(CAT, 'setupUserProfile exception', { error: message });
    return { data: null, error: message };
  }
}

/** Delete a user via DB RPC (handles FK constraints). */
export async function deleteUser(userId: string): Promise<{ error: string | null }> {
  logger.info(CAT, 'deleteUser', { userId });

  try {
    const { error } = await supabase.rpc('admin_delete_user', { p_target_user_id: userId });

    if (error) {
      logger.error(CAT, 'deleteUser failed', { error: error.message });
      return { error: error.message };
    }

    logger.info(CAT, 'deleteUser succeeded', { userId });
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(CAT, 'deleteUser exception', { userId, error: message });
    return { error: message };
  }
}

/** Fetch all pending password-reset requests. */
export async function fetchPendingPasswordResets(): Promise<{
  data: PasswordResetRequest[] | null;
  error: string | null;
}> {
  logger.info(CAT, 'fetchPendingPasswordResets');

  try {
    const { data, error } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error(CAT, 'fetchPendingPasswordResets failed', { error: error.message });
      return { data: null, error: error.message };
    }

    return { data: data as PasswordResetRequest[], error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(CAT, 'fetchPendingPasswordResets exception', { error: message });
    return { data: null, error: message };
  }
}

/** Submit a new password-reset request (from LoginPage). */
export async function submitPasswordResetRequest(email: string): Promise<{ error: string | null }> {
  logger.info(CAT, 'submitPasswordResetRequest', { email });

  try {
    const { error } = await supabase
      .from('password_reset_requests')
      .insert({ email: email.trim().toLowerCase(), status: 'pending' });

    if (error) {
      logger.error(CAT, 'submitPasswordResetRequest failed', { error: error.message });
      return { error: error.message };
    }

    logger.info(CAT, 'submitPasswordResetRequest succeeded');
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(CAT, 'submitPasswordResetRequest exception', { error: message });
    return { error: message };
  }
}

/** Reset a user's password via RPC and mark the request as approved. */
export async function resetUserPassword(
  userId: string,
  newPassword: string,
  requestId: string,
  actorId: string,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'resetUserPassword', { userId, requestId });

  try {
    const { error: rpcError } = await supabase.rpc('admin_reset_user_password', {
      target_user_id: userId,
      new_password: newPassword,
    });

    if (rpcError) {
      logger.error(CAT, 'resetUserPassword RPC failed', { error: rpcError.message });
      return { error: rpcError.message };
    }

    const { error: updateError } = await supabase
      .from('password_reset_requests')
      .update({
        status: 'approved',
        resolved_by: actorId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      logger.warn(CAT, 'resetUserPassword — request status update failed', { error: updateError.message });
    }

    logger.info(CAT, 'resetUserPassword succeeded');
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(CAT, 'resetUserPassword exception', { error: message });
    return { error: message };
  }
}

/** Dismiss (reject) a password-reset request. */
export async function dismissPasswordResetRequest(requestId: string): Promise<{ error: string | null }> {
  logger.info(CAT, 'dismissPasswordResetRequest', { requestId });

  try {
    const { error } = await supabase
      .from('password_reset_requests')
      .update({
        status: 'dismissed',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      logger.error(CAT, 'dismissPasswordResetRequest failed', { error: error.message });
      return { error: error.message };
    }

    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(CAT, 'dismissPasswordResetRequest exception', { error: message });
    return { error: message };
  }
}
