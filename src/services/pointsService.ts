/**
 * Points / token data-access service.
 *
 * Responsibilities (SRP):
 *  - Insert entries into `points_log`
 *  - Increment user tokens via RPC
 *  - Calculate tokens awarded for a task approval
 *
 * Does NOT manage UI state.
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const CAT = 'pointsService';

// ---------------------------------------------------------------------------
// Token calculation (pure business logic — no I/O)
// ---------------------------------------------------------------------------

export interface TokenCalculation {
  isOnTime: boolean;
  baseTokens: number;
  bonusTokens: number;
  totalTokens: number;
  reason: string;
}

/** Calculate how many tokens to award based on deadline vs. now. */
export function calculateTokens(tokens: number, deadline: string): TokenCalculation {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const isOnTime = now <= deadlineDate;

  const bonusTokens = isOnTime ? Math.ceil(tokens * 0.2) : 0;
  const baseTokens = isOnTime ? tokens : Math.ceil(tokens * 0.5);
  const totalTokens = baseTokens + bonusTokens;

  const reason = isOnTime
    ? `Task completed on time (+${bonusTokens} bonus)`
    : 'Task completed late (half tokens, no bonus)';

  return { isOnTime, baseTokens, bonusTokens, totalTokens, reason };
}

// ---------------------------------------------------------------------------
// Data-access
// ---------------------------------------------------------------------------

/** Insert a row into `points_log`. */
export async function insertPointsLog(entry: {
  user_id: string;
  task_id: string;
  tokens_awarded: number;
  reason: string;
}): Promise<{ error: string | null }> {
  logger.info(CAT, 'insertPointsLog', { userId: entry.user_id, tokens: entry.tokens_awarded });

  const { error } = await supabase.from('points_log').insert(entry);

  if (error) {
    logger.error(CAT, 'insertPointsLog failed', { error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Delete all points_log entries for a given task. */
export async function deletePointsLogByTask(taskId: string): Promise<void> {
  logger.info(CAT, 'deletePointsLogByTask', { taskId });

  const { error } = await supabase.from('points_log').delete().eq('task_id', taskId);

  if (error) {
    logger.error(CAT, 'deletePointsLogByTask failed', { error: error.message });
  }
}

/** Increment a user's total_tokens via the database RPC. */
export async function incrementTokens(
  userId: string,
  amount: number,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'incrementTokens', { userId, amount });

  const { error } = await supabase.rpc('increment_tokens', {
    user_id: userId,
    amount,
  });

  if (error) {
    logger.error(CAT, 'incrementTokens failed', { error: error.message });
    return { error: error.message };
  }

  return { error: null };
}
