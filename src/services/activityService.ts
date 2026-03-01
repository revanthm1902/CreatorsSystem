/**
 * Activity-log data-access service.
 *
 * Responsibilities (SRP):
 *  - Insert / fetch / delete rows in `activity_log`
 *  - Subscribe to realtime changes on the table
 *
 * Does NOT manage UI state (unread counts, toasts, etc.) — that stays in the store.
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { ActivityLog, ActivityLogInsert } from '../types/database';

const CAT = 'activityService';

/** Fetch recent activity log entries with joined actor / target profiles. */
export async function fetchActivities(
  limit = 50,
): Promise<{ data: ActivityLog[] | null; error: string | null }> {
  logger.info(CAT, 'fetchActivities', { limit });

  const { data, error } = await supabase
    .from('activity_log')
    .select(`
      *,
      actor:actor_id(id, full_name, role, employee_id),
      target_user:target_user_id(id, full_name, role, employee_id)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error(CAT, 'fetchActivities failed', { error: error.message });
    return { data: null, error: error.message };
  }

  logger.debug(CAT, `fetchActivities returned ${data?.length ?? 0} rows`);
  return { data: data as ActivityLog[], error: null };
}

/** Fetch a single activity entry by ID (with joined data). */
export async function fetchActivityById(
  id: string,
): Promise<ActivityLog | null> {
  logger.debug(CAT, 'fetchActivityById', { id });

  const { data, error } = await supabase
    .from('activity_log')
    .select(`
      *,
      actor:actor_id(id, full_name, role, employee_id),
      target_user:target_user_id(id, full_name, role, employee_id)
    `)
    .eq('id', id)
    .single();

  if (error) {
    logger.warn(CAT, 'fetchActivityById failed', { id, error: error.message });
    return null;
  }

  return data as ActivityLog;
}

/** Insert an activity log entry (fire-and-forget friendly). */
export async function insertActivity(activity: ActivityLogInsert): Promise<void> {
  logger.info(CAT, 'insertActivity', { actionType: activity.action_type, message: activity.message });

  try {
    const { error } = await supabase.from('activity_log').insert(activity);
    if (error) {
      logger.error(CAT, 'insertActivity failed', { error: error.message });
    }
  } catch (err) {
    logger.error(CAT, 'insertActivity threw', { error: String(err) });
  }
}

/** Delete an activity entry. Returns whether the delete was confirmed. */
export async function deleteActivityEntry(
  activityId: string,
): Promise<{ confirmed: boolean; error: string | null }> {
  logger.info(CAT, 'deleteActivityEntry', { activityId });

  const { data, error } = await supabase
    .from('activity_log')
    .delete()
    .eq('id', activityId)
    .select('id');

  if (error) {
    logger.error(CAT, 'deleteActivityEntry failed', { error: error.message });
    return { confirmed: false, error: error.message };
  }

  const confirmed = !!(data && data.length > 0);
  if (!confirmed) {
    logger.warn(CAT, 'deleteActivityEntry — no rows deleted (RLS or already gone)', { activityId });
  }

  return { confirmed, error: null };
}

/** Delete all activity entries referencing a given task ID. */
export async function deleteActivitiesByTask(taskId: string): Promise<void> {
  logger.info(CAT, 'deleteActivitiesByTask', { taskId });

  const { error } = await supabase.from('activity_log').delete().eq('task_id', taskId);

  if (error) {
    logger.error(CAT, 'deleteActivitiesByTask failed', { error: error.message });
  }
}

/**
 * Subscribe to realtime INSERT / DELETE events on `activity_log`.
 * Returns an unsubscribe function.
 */
export function subscribeToActivityChanges(handlers: {
  onInsert: (newId: string) => void;
  onDelete: (oldId: string) => void;
}): () => void {
  logger.debug(CAT, 'subscribeToActivityChanges — subscribing');

  const channel = supabase
    .channel('activity_log_changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activity_log' },
      (payload) => handlers.onInsert(payload.new.id as string),
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'activity_log' },
      (payload) => {
        const deletedId = (payload.old as { id?: string })?.id;
        if (deletedId) handlers.onDelete(deletedId);
      },
    )
    .subscribe();

  return () => {
    logger.debug(CAT, 'subscribeToActivityChanges — unsubscribing');
    supabase.removeChannel(channel);
  };
}
