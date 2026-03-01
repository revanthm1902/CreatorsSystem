/**
 * Task data-access service.
 *
 * Responsibilities (SRP):
 *  - CRUD + query operations on the `tasks` table
 *  - Subscribe to realtime changes on the table
 *
 * Does NOT handle activity logging, token calculations or profile resolution.
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { serverLog } from './serverLogService';
import type { Task, TaskStatus } from '../types/database';

const CAT = 'taskService';

const DEFAULT_TIMEOUT = 30_000; // 30 seconds

/** Fetch tasks — optionally scoped to a single user's approved tasks. */
export async function fetchTasks(
  userId?: string,
  role?: string,
): Promise<{ data: Task[] | null; error: string | null }> {
  logger.info(CAT, 'fetchTasks', { userId, role });

  let query = supabase.from('tasks').select('*');

  if (role === 'User' && userId) {
    query = query.eq('assigned_to', userId).eq('director_approved', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    logger.error(CAT, 'fetchTasks failed', { error: error.message });
    return { data: null, error: error.message };
  }

  logger.debug(CAT, `fetchTasks returned ${data?.length ?? 0} rows`);
  return { data, error: null };
}

/** Insert a new task. Returns the created row. */
export async function insertTask(
  task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'submitted_at' | 'approved_at' | 'submission_note' | 'admin_feedback' | 'original_deadline'>,
  directorApproved: boolean,
): Promise<{ data: Task | null; error: string | null }> {
  const payload = { ...task, director_approved: directorApproved };

  logger.info(CAT, 'insertTask — start', {
    title: task.title,
    assignedTo: task.assigned_to,
    createdBy: task.created_by,
    directorApproved,
    tokens: task.tokens,
    deadline: task.deadline,
  });

  // Server-side log (fire-and-forget)
  serverLog.info(CAT, 'insertTask called', {
    title: task.title,
    assignedTo: task.assigned_to,
    createdBy: task.created_by,
    directorApproved,
  }, task.created_by);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    let data: Task | null = null;
    let error: { code?: string; message: string; details?: string; hint?: string } | null = null;

    try {
      const result = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .abortSignal(controller.signal)
        .single();

      data = result.data;
      error = result.error;
    } finally {
      clearTimeout(timer);
    }

    if (error) {
      logger.error(CAT, 'insertTask — Supabase returned error', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      serverLog.error(CAT, 'insertTask failed', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        title: task.title,
      }, task.created_by);
      return { data: null, error: error.message };
    }

    if (!data) {
      logger.error(CAT, 'insertTask — no data returned (possible RLS block)');
      serverLog.error(CAT, 'insertTask returned null data', {
        title: task.title,
        createdBy: task.created_by,
      }, task.created_by);
      return { data: null, error: 'Task created but data not returned — check RLS policies' };
    }

    logger.info(CAT, 'insertTask — success', { taskId: data.id, title: data.title });
    serverLog.info(CAT, 'insertTask success', { taskId: data.id, title: data.title }, task.created_by);
    return { data, error: null };

  } catch (err: unknown) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    const message = isAbort
      ? 'Request timed out — please try again'
      : (err instanceof Error ? err.message : String(err));
    logger.error(CAT, 'insertTask — exception thrown', { error: message, aborted: isAbort });
    serverLog.error(CAT, 'insertTask exception', { error: message, title: task.title }, task.created_by);
    return { data: null, error: message };
  }
}

/** Update arbitrary fields on a task by ID. */
export async function updateTask(
  taskId: string,
  fields: Partial<Task>,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'updateTask', { taskId, fields: Object.keys(fields) });

  const { error } = await supabase.from('tasks').update(fields).eq('id', taskId);

  if (error) {
    logger.error(CAT, 'updateTask failed', { taskId, error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Update only the status (and optionally submitted_at / submission_note). */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  extras?: { submitted_at?: string; submission_note?: string },
): Promise<{ error: string | null }> {
  logger.info(CAT, 'updateTaskStatus', { taskId, status });

  const updateData: Partial<Task> = { status, ...extras };

  const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);

  if (error) {
    logger.error(CAT, 'updateTaskStatus failed', { taskId, error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Mark a task as director-approved. */
export async function approveTaskByDirector(taskId: string): Promise<{ error: string | null }> {
  logger.info(CAT, 'approveTaskByDirector', { taskId });

  const { error } = await supabase
    .from('tasks')
    .update({ director_approved: true })
    .eq('id', taskId);

  if (error) {
    logger.error(CAT, 'approveTaskByDirector failed', { taskId, error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Mark a task as Completed with an approval timestamp. */
export async function completeTask(
  taskId: string,
  approvedAt: string,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'completeTask', { taskId });

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'Completed' as TaskStatus, approved_at: approvedAt })
    .eq('id', taskId);

  if (error) {
    logger.error(CAT, 'completeTask failed', { taskId, error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Reset a task back to Pending (for reassignment). */
export async function resetTaskToPending(taskId: string): Promise<{ error: string | null }> {
  logger.info(CAT, 'resetTaskToPending', { taskId });

  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'Pending' as TaskStatus,
      submitted_at: null,
      submission_note: null,
      approved_at: null,
    })
    .eq('id', taskId);

  if (error) {
    logger.error(CAT, 'resetTaskToPending failed', { taskId, error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Update admin feedback on a task. */
export async function setTaskFeedback(
  taskId: string,
  feedback: string,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'setTaskFeedback', { taskId });

  const { error } = await supabase
    .from('tasks')
    .update({ admin_feedback: feedback })
    .eq('id', taskId);

  if (error) {
    logger.error(CAT, 'setTaskFeedback failed', { taskId, error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Delete a task by ID. */
export async function deleteTaskById(taskId: string): Promise<{ error: string | null }> {
  logger.info(CAT, 'deleteTaskById', { taskId });

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) {
    logger.error(CAT, 'deleteTaskById failed', { taskId, error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Extend the deadline of a task, saving the original if not already saved. */
export async function extendDeadline(
  taskId: string,
  currentDeadline: string,
  newDeadline: string,
  originalDeadline: string | null,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'extendDeadline', { taskId, newDeadline });

  const updates: Record<string, unknown> = {
    deadline: newDeadline,
  };

  // Keep the first original deadline — don't overwrite on subsequent extensions
  if (!originalDeadline) {
    updates.original_deadline = currentDeadline;
  }

  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId);

  if (error) {
    logger.error(CAT, 'extendDeadline failed', { taskId, error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Subscribe to all changes on the tasks table. Returns unsubscribe. */
export function subscribeToTaskChanges(onAnyChange: () => void): () => void {
  logger.debug(CAT, 'subscribeToTaskChanges — subscribing');

  const channel = supabase
    .channel('tasks-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      () => onAnyChange(),
    )
    .subscribe();

  return () => {
    logger.debug(CAT, 'subscribeToTaskChanges — unsubscribing');
    supabase.removeChannel(channel);
  };
}
