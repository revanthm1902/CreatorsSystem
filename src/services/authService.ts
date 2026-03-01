/**
 * Authentication service.
 *
 * Responsibilities (SRP):
 *  - Sign in / sign out via Supabase Auth
 *  - Update user password
 *  - Listen for auth state changes
 *
 * Does NOT manage UI state — that remains in authStore.
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

const CAT = 'authService';

export interface SignInResult {
  user: User | null;
  error: string | null;
}

/** Retrieve the current session (if any). */
export async function getSession(): Promise<Session | null> {
  logger.info(CAT, 'getSession');
  try {
    const { data } = await supabase.auth.getSession();
    logger.debug(CAT, 'getSession result', { hasSession: !!data.session });
    return data.session;
  } catch (err) {
    logger.error(CAT, 'getSession threw', { error: String(err) });
    return null;
  }
}

/** Sign in with email & password. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<SignInResult> {
  logger.info(CAT, 'signInWithPassword', { email });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logger.warn(CAT, 'signInWithPassword failed', { error: error.message });
    return { user: null, error: error.message };
  }

  logger.info(CAT, 'signInWithPassword succeeded', { userId: data.user.id });
  return { user: data.user, error: null };
}

/** Sign the current user out. */
export async function signOut(): Promise<void> {
  logger.info(CAT, 'signOut');
  try {
    await supabase.auth.signOut();
  } catch (err) {
    logger.warn(CAT, 'signOut API error (state cleared anyway)', { error: String(err) });
  }
}

/** Update the current user's password. */
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  logger.info(CAT, 'updatePassword');

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    logger.error(CAT, 'updatePassword failed', { error: error.message });
    return { error: error.message };
  }

  logger.info(CAT, 'updatePassword succeeded');
  return { error: null };
}

/** Subscribe to Supabase auth state changes. Returns an unsubscribe function. */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): { unsubscribe: () => void } {
  logger.debug(CAT, 'onAuthStateChange — subscribing');

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return subscription;
}
