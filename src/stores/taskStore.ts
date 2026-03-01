/**
 * Task store — manages task list UI state.
 *
 * Responsibilities (SRP):
 *  - Hold the tasks array + loading / cache flags in Zustand
 *  - Orchestrate task workflows (create → approve → complete)
 *  - Delegate all Supabase I/O to service modules
 *
 * Business logic that does NOT touch the DB (token calculation) lives in
 * pointsService as a pure function.
 */

import { create } from 'zustand';
import type { Task, TaskStatus } from '../types/database';
import * as taskService from '../services/taskService';
import * as pointsService from '../services/pointsService';
import * as activityService from '../services/activityService';
import * as profileService from '../services/profileService';
import { logger } from '../lib/logger';
import { serverLog } from '../services/serverLogService';

const CAT = 'taskStore';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  initialized: boolean;
  lastFetch: number;
  _lastUserId: string | undefined;
  _lastRole: string | undefined;
  fetchTasks: (userId?: string, role?: string, force?: boolean) => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'submitted_at' | 'approved_at' | 'submission_note' | 'admin_feedback'>, creatorRole: string) => Promise<{ error: string | null }>;
  editTask: (taskId: string, updates: { title: string; description: string; deadline: string; tokens: number; assigned_to: string }, actorId: string, actorRole: string) => Promise<{ error: string | null }>;
  updateTaskStatus: (taskId: string, status: TaskStatus, actorId: string, submittedAt?: string, submissionNote?: string) => Promise<{ error: string | null }>;
  approveTask: (taskId: string, userId: string, tokens: number, deadline: string, actorId: string) => Promise<{ error: string | null }>;
  rejectTask: (taskId: string, actorId: string) => Promise<{ error: string | null }>;
  reassignTask: (taskId: string, actorId: string) => Promise<{ error: string | null }>;
  approveTaskByDirector: (taskId: string, actorId: string) => Promise<{ error: string | null }>;
  addFeedback: (taskId: string, feedback: string) => Promise<{ error: string | null }>;
  deleteTask: (taskId: string, actorId: string) => Promise<{ error: string | null }>;
  subscribeToTasks: () => () => void;
  reset: () => void;
}

const CACHE_DURATION = 15000; // 15 seconds

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  initialized: false,
  lastFetch: 0,
  _lastUserId: undefined,
  _lastRole: undefined,

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------
  fetchTasks: async (userId?: string, role?: string, force = false) => {
    const state = get();
    const now = Date.now();

    if (state.loading) return;
    if (!force && state.initialized && (now - state.lastFetch) < CACHE_DURATION) return;

    set({ loading: true, _lastUserId: userId, _lastRole: role });

    try {
      const { data } = await taskService.fetchTasks(userId, role);
      if (data) {
        set({ tasks: data, initialized: true, lastFetch: Date.now() });
      }
    } catch (err) {
      logger.error(CAT, 'fetchTasks threw', { error: String(err) });
    } finally {
      set({ loading: false });
    }
  },

  // -----------------------------------------------------------------------
  // Create
  // -----------------------------------------------------------------------
  createTask: async (task, creatorRole: string) => {
    logger.info(CAT, 'createTask — start', { title: task.title, creatorRole });
    const directorApproved = creatorRole === 'Director';

    try {
      logger.info(CAT, 'createTask — calling insertTask');
      const { data, error } = await taskService.insertTask(task, directorApproved);

      if (error || !data) {
        const msg = error ?? 'Failed to create task';
        logger.error(CAT, 'createTask — insertTask returned error', { error: msg });
        serverLog.error(CAT, 'createTask failed at insert', { error: msg, title: task.title }, task.created_by);
        return { error: msg };
      }

      logger.info(CAT, 'createTask — insert succeeded, updating state', { taskId: data.id });
      set((s) => ({ tasks: [data, ...s.tasks] }));

      // Activity logging (best-effort, don't block return)
      logger.debug(CAT, 'createTask — resolving profile names for activity');
      profileService.resolveProfileNames([task.created_by, task.assigned_to])
        .then((profiles) => {
          const actorName = profiles.find(p => p.id === task.created_by)?.full_name || 'Someone';
          const targetName = profiles.find(p => p.id === task.assigned_to)?.full_name || 'a user';

          return activityService.insertActivity({
            actor_id: task.created_by,
            action_type: 'task_assigned',
            target_user_id: task.assigned_to,
            task_id: data.id,
            message: `${actorName} assigned task "${task.title}" to ${targetName}`,
          });
        })
        .catch((err) => {
          logger.warn(CAT, 'createTask — activity logging failed', { error: String(err) });
        });

      logger.info(CAT, 'createTask — returning success');
      return { error: null };

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(CAT, 'createTask — unexpected exception', { error: message });
      serverLog.error(CAT, 'createTask exception', { error: message, title: task.title }, task.created_by);
      return { error: message };
    }
  },

  // -----------------------------------------------------------------------
  // Edit
  // -----------------------------------------------------------------------
  editTask: async (taskId, updates, actorId, actorRole) => {
    const directorApproved = actorRole === 'Director';

    const updateData: Partial<Task> = {
      title: updates.title,
      description: updates.description,
      deadline: new Date(updates.deadline).toISOString(),
      tokens: updates.tokens,
      assigned_to: updates.assigned_to,
      director_approved: directorApproved,
      status: 'Pending' as TaskStatus,
      submitted_at: null,
      approved_at: null,
    };

    try {
      const { error } = await taskService.updateTask(taskId, updateData);
      if (error) return { error };

      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updateData } : t)),
      }));

      // Activity log (fire-and-forget — don't block return)
      profileService.resolveProfileNames([actorId])
        .then((profiles) => {
          const actorName = profiles.find(p => p.id === actorId)?.full_name || 'Someone';
          return activityService.insertActivity({
            actor_id: actorId,
            action_type: 'task_assigned',
            target_user_id: updates.assigned_to,
            task_id: taskId,
            message: `${actorName} edited task "${updates.title}"${!directorApproved ? ' (pending director re-approval)' : ''}`,
          });
        })
        .catch((err) => logger.warn(CAT, 'editTask activity log failed', { error: String(err) }));

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(CAT, 'editTask exception', { error: message });
      return { error: message };
    }
  },

  // -----------------------------------------------------------------------
  // Status update (user submits work)
  // -----------------------------------------------------------------------
  updateTaskStatus: async (taskId, status, actorId, submittedAt?, submissionNote?) => {
    const extras: { submitted_at?: string; submission_note?: string } = {};
    if (submittedAt) extras.submitted_at = submittedAt;
    if (submissionNote !== undefined) extras.submission_note = submissionNote;

    try {
      const { error } = await taskService.updateTaskStatus(taskId, status, Object.keys(extras).length ? extras : undefined);
      if (error) return { error };

      const task = get().tasks.find(t => t.id === taskId);

      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, status, ...extras } : t,
        ),
      }));

      if (status === 'Under Review' && task) {
        // Fire-and-forget activity log
        profileService.resolveProfileNames([actorId])
          .then((profiles) => {
            const actorName = profiles.find(p => p.id === actorId)?.full_name || 'Someone';
            return activityService.insertActivity({
              actor_id: actorId,
              action_type: 'task_marked_done',
              target_user_id: actorId,
              task_id: taskId,
              message: `${actorName} submitted task "${task.title}" for review`,
            });
          })
          .catch((err) => logger.warn(CAT, 'updateTaskStatus activity log failed', { error: String(err) }));
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(CAT, 'updateTaskStatus exception', { error: message });
      return { error: message };
    }
  },

  // -----------------------------------------------------------------------
  // Director approval
  // -----------------------------------------------------------------------
  approveTaskByDirector: async (taskId, actorId) => {
    try {
      const { error } = await taskService.approveTaskByDirector(taskId);
      if (error) return { error };

      const task = get().tasks.find(t => t.id === taskId);

      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, director_approved: true } : t)),
      }));

      if (task) {
        // Fire-and-forget activity log
        profileService.resolveProfileNames([actorId])
          .then((profiles) => {
            const actorName = profiles.find(p => p.id === actorId)?.full_name || 'Director';
            return activityService.insertActivity({
              actor_id: actorId,
              action_type: 'director_approved_task',
              target_user_id: task.assigned_to,
              task_id: taskId,
              message: `${actorName} approved task "${task.title}" for users`,
            });
          })
          .catch((err) => logger.warn(CAT, 'approveTaskByDirector activity log failed', { error: String(err) }));
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(CAT, 'approveTaskByDirector exception', { error: message });
      return { error: message };
    }
  },

  // -----------------------------------------------------------------------
  // Admin approves submitted work → award tokens
  // -----------------------------------------------------------------------
  approveTask: async (taskId, userId, tokens, deadline, actorId) => {
    const approvedAt = new Date().toISOString();
    const calc = pointsService.calculateTokens(tokens, deadline);
    const task = get().tasks.find(t => t.id === taskId);

    try {
      // 1. Complete the task
      const { error: taskError } = await taskService.completeTask(taskId, approvedAt);
      if (taskError) return { error: taskError };

      // 2. Log points
      const { error: logError } = await pointsService.insertPointsLog({
        user_id: userId,
        task_id: taskId,
        tokens_awarded: calc.totalTokens,
        reason: calc.reason,
      });
      if (logError) return { error: logError };

      // 3. Increment user tokens
      if (calc.totalTokens > 0) {
        const { error: incError } = await pointsService.incrementTokens(userId, calc.totalTokens);
        if (incError) return { error: incError };
      }

      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'Completed' as TaskStatus, approved_at: approvedAt } : t,
        ),
      }));

      // Activity log (fire-and-forget)
      if (task) {
        const tokenMsg = calc.isOnTime
          ? `+${tokens} tokens + ${calc.bonusTokens} bonus`
          : `+${calc.baseTokens} tokens (late, no bonus)`;

        profileService.resolveProfileNames([actorId, userId])
          .then((profiles) => {
            const actorName = profiles.find(p => p.id === actorId)?.full_name || 'Someone';
            const targetName = profiles.find(p => p.id === userId)?.full_name || 'a user';
            return activityService.insertActivity({
              actor_id: actorId,
              action_type: 'task_approved',
              target_user_id: userId,
              task_id: taskId,
              message: `${actorName} approved task "${task.title}" for ${targetName} (${tokenMsg})`,
            });
          })
          .catch((err) => logger.warn(CAT, 'approveTask activity log failed', { error: String(err) }));
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(CAT, 'approveTask exception', { error: message });
      return { error: message };
    }
  },

  // -----------------------------------------------------------------------
  // Reject
  // -----------------------------------------------------------------------
  rejectTask: async (taskId, actorId) => {
    const task = get().tasks.find(t => t.id === taskId);

    try {
      const { error } = await taskService.updateTask(taskId, { status: 'Rejected' as TaskStatus });
      if (error) return { error };

      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: 'Rejected' as TaskStatus } : t)),
      }));

      if (task) {
        profileService.resolveProfileNames([actorId, task.assigned_to])
          .then((profiles) => {
            const actorName = profiles.find(p => p.id === actorId)?.full_name || 'Someone';
            const targetName = profiles.find(p => p.id === task.assigned_to)?.full_name || 'a user';
            return activityService.insertActivity({
              actor_id: actorId,
              action_type: 'task_rejected',
              target_user_id: task.assigned_to,
              task_id: taskId,
              message: `${actorName} rejected task "${task.title}" from ${targetName}`,
            });
          })
          .catch((err) => logger.warn(CAT, 'rejectTask activity log failed', { error: String(err) }));
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(CAT, 'rejectTask exception', { error: message });
      return { error: message };
    }
  },

  // -----------------------------------------------------------------------
  // Reassign (send back for rework)
  // -----------------------------------------------------------------------
  reassignTask: async (taskId, actorId) => {
    const task = get().tasks.find(t => t.id === taskId);

    try {
      const { error } = await taskService.resetTaskToPending(taskId);
      if (error) return { error };

      const resetFields: Partial<Task> = {
        status: 'Pending' as TaskStatus,
        submitted_at: null,
        submission_note: null,
        approved_at: null,
      };

      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...resetFields } : t)),
      }));

      if (task) {
        profileService.resolveProfileNames([actorId, task.assigned_to])
          .then((profiles) => {
            const actorName = profiles.find(p => p.id === actorId)?.full_name || 'Someone';
            const targetName = profiles.find(p => p.id === task.assigned_to)?.full_name || 'a user';
            return activityService.insertActivity({
              actor_id: actorId,
              action_type: 'task_reassigned',
              target_user_id: task.assigned_to,
              task_id: taskId,
              message: `${actorName} reassigned task "${task.title}" back to ${targetName} for rework`,
            });
          })
          .catch((err) => logger.warn(CAT, 'reassignTask activity log failed', { error: String(err) }));
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(CAT, 'reassignTask exception', { error: message });
      return { error: message };
    }
  },

  // -----------------------------------------------------------------------
  // Feedback
  // -----------------------------------------------------------------------
  addFeedback: async (taskId, feedback) => {
    try {
      const { error } = await taskService.setTaskFeedback(taskId, feedback);
      if (error) return { error };

      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, admin_feedback: feedback } : t)),
      }));

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(CAT, 'addFeedback exception', { error: message });
      return { error: message };
    }
  },

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------
  deleteTask: async (taskId, actorId) => {
    const task = get().tasks.find(t => t.id === taskId);

    try {
      // Clean up related rows first
      await activityService.deleteActivitiesByTask(taskId);
      await pointsService.deletePointsLogByTask(taskId);

      const { error } = await taskService.deleteTaskById(taskId);
      if (error) return { error };

      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }));

      if (task) {
        profileService.resolveProfileNames([actorId])
          .then((profiles) => {
            const actorName = profiles.find(p => p.id === actorId)?.full_name || 'Someone';
            return activityService.insertActivity({
              actor_id: actorId,
              action_type: 'task_deleted',
              target_user_id: task.assigned_to,
              task_id: null,
              message: `${actorName} deleted task "${task.title}"`,
            });
          })
          .catch((err) => logger.warn(CAT, 'deleteTask activity log failed', { error: String(err) }));
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(CAT, 'deleteTask exception', { error: message });
      return { error: message };
    }
  },

  // -----------------------------------------------------------------------
  // Realtime subscription
  // -----------------------------------------------------------------------
  subscribeToTasks: () => {
    return taskService.subscribeToTaskChanges(() => {
      const { _lastUserId, _lastRole } = get();
      get().fetchTasks(_lastUserId, _lastRole, true);
    });
  },

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------
  reset: () => {
    set({ tasks: [], loading: false, initialized: false, lastFetch: 0, _lastUserId: undefined, _lastRole: undefined });
  },
}));
