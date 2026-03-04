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

export interface TokenCalculation {
  isOnTime: boolean;
  baseTokens: number;
  bonusTokens: number;
  totalTokens: number;
  reason: string;
}

/**
 * Calculate how many tokens to award based on deadline vs. now.
 *
 * Rules:
 *  - On time  → full planned tokens + optional admin bonus
 *  - Late     → 0 planned tokens (forfeited) + optional admin discretion award
 *
 * @param tokens       - The planned token value set when the task was created.
 * @param deadline     - The task deadline ISO string.
 * @param adminAward   - Tokens the admin explicitly chose to give at approval time.
 *                       On-time: treated as a bonus on top of base.
 *                       Late:    the only tokens the user receives (0 by default).
 */
export function calculateTokens(tokens: number, deadline: string, adminAward?: number): TokenCalculation {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const isOnTime = now <= deadlineDate;
  const baseTokens = isOnTime ? tokens : 0;

  // Admin discretionary award (bonus on-time, or mercy tokens when late)
  const bonusTokens = adminAward !== undefined ? Math.max(0, adminAward) : 0;
  const totalTokens = baseTokens + bonusTokens;

  const reason = isOnTime
    ? bonusTokens > 0
      ? `Task completed on time (+${bonusTokens} bonus by admin)`
      : 'Task completed on time'
    : bonusTokens > 0
      ? `Task completed late — planned tokens forfeited, admin awarded ${bonusTokens} token${bonusTokens !== 1 ? 's' : ''}`
      : 'Task completed late — planned tokens forfeited';

  return { isOnTime, baseTokens, bonusTokens, totalTokens, reason };
}

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

/**
 * Accumulate a 10% admin credit for approving a task.
 *
 * Fractions are kept in `token_credit_balance`; whole tokens are flushed
 * to `total_tokens` automatically by the DB function so the count stays
 * a clean integer.
 */
export async function accumulateAdminCredit(
  adminId: string,
  taskTotalTokens: number,
): Promise<{ error: string | null }> {
  const credit = taskTotalTokens * 0.1;
  logger.info(CAT, 'accumulateAdminCredit', { adminId, credit });

  const { error } = await supabase.rpc('accumulate_admin_credit', {
    p_admin_id: adminId,
    p_credit: credit,
  });

  if (error) {
    logger.error(CAT, 'accumulateAdminCredit failed', { error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

