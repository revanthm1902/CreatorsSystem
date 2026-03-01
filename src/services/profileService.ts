/**
 * Profile data-access service.
 *
 * Responsibilities (SRP):
 *  - CRUD operations on the `profiles` table
 *  - Resolve profile names by ID(s)
 *
 * All calls are logged via the structured logger.
 */

import { supabase } from '../lib/supabase';
import { retryQuery } from '../lib/errorHandling';
import { logger } from '../lib/logger';
import type { Profile } from '../types/database';

const CAT = 'profileService';

/** Fetch a single profile by user ID (with retry for transient errors). */
export async function fetchProfileById(
  userId: string,
): Promise<{ data: Profile | null; error: { message: string; code?: string } | null }> {
  logger.info(CAT, 'fetchProfileById', { userId });

  const result = await retryQuery<Profile>(
    () => supabase.from('profiles').select('*').eq('id', userId).single(),
    { label: 'fetchProfileById' },
  );

  if (result.error) {
    logger.error(CAT, 'fetchProfileById failed', { userId, error: result.error.message });
  }

  return result;
}

/** Fetch all profiles ordered by employee_id. */
export async function fetchAllProfiles(): Promise<{ data: Profile[] | null; error: string | null }> {
  logger.info(CAT, 'fetchAllProfiles');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('employee_id', { ascending: true });

  if (error) {
    logger.error(CAT, 'fetchAllProfiles failed', { error: error.message });
    return { data: null, error: error.message };
  }

  logger.debug(CAT, `fetchAllProfiles returned ${data?.length ?? 0} rows`);
  return { data, error: null };
}

/** Fetch leaderboard (Users & Admins with tokens > 0, descending). */
export async function fetchLeaderboard(limit = 50): Promise<{ data: Profile[] | null; error: string | null }> {
  logger.info(CAT, 'fetchLeaderboard', { limit });

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'User')
    .gt('total_tokens', 0)
    .order('total_tokens', { ascending: false })
    .order('employee_id', { ascending: true })
    .limit(limit);

  if (error) {
    logger.error(CAT, 'fetchLeaderboard failed', { error: error.message });
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/** Resolve full_name for one or more profile IDs. */
export async function resolveProfileNames(
  ids: string[],
): Promise<{ id: string; full_name: string }[]> {
  if (ids.length === 0) return [];

  logger.debug(CAT, 'resolveProfileNames', { ids });

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', ids);

  if (error) {
    logger.warn(CAT, 'resolveProfileNames failed', { error: error.message });
    return [];
  }

  return data ?? [];
}

/** Update profile fields for a given user. */
export async function updateProfile(
  userId: string,
  fields: Partial<Omit<Profile, 'id' | 'created_at'>>,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'updateProfile', { userId, fields: Object.keys(fields) });

  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);

  if (error) {
    logger.error(CAT, 'updateProfile failed', { userId, error: error.message });
    return { error: error.message };
  }

  return { error: null };
}
