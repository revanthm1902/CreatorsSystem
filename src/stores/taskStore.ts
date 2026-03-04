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
import { supabase } from '../lib/supabase';
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
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'submitted_at' | 'approved_at' | 'submission_note' | 'admin_feedback' | 'original_deadline'>, creatorRole: string) => Promise<{ error: string | null }>;
  editTask: (taskId: string, updates: { title: string; description: string; deadline: string; tokens: number; assigned_to: string }, actorId: string, actorRole: string) => Promise<{ error: string | null }>;
  updateTaskStatus: (taskId: string, status: TaskStatus, actorId: string, submittedAt?: string, submissionNote?: string, powUrl?: string) => Promise<{ error: string | null }>;
  approveTask: (taskId: string, userId: string, tokens: number, deadline: string, actorId: string, bonusTokens?: number) => Promise<{ error: string | null }>;
  rejectTask: (taskId: string, actorId: string) => Promise<{ error: string | null }>;
  reassignTask: (taskId: string, actorId: string) => Promise<{ error: string | null }>;
  approveTaskByDirector: (taskId: string, actorId: string) => Promise<{ error: string | null }>;
  addFeedback: (taskId: string, feedback: string) => Promise<{ error: string | null }>;
  extendDeadline: (taskId: string, newDeadline: string, actorId: string) => Promise<{ error: string | null }>;
  deleteTask: (taskId: string, actorId: string) => Promise<{ error: string | null }>;
  linkPowUrl: (taskId: string, url: string, issueState?: string | null) => Promise<{ error: string | null }>;
  refreshIssueStates: () => Promise<void>;
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
  fetchTasks: async (userId?: string, role?: string, force = false) => {
    const state = get();
    const now = Date.now();

    if (!force) {
      if (state.loading) return;
      if (state.initialized && (now - state.lastFetch) < CACHE_DURATION) return;
    }

    set({ loading: true, _lastUserId: userId, _lastRole: role });

    try {
      const { data } = await taskService.fetchTasks(userId, role);
      if (data) {
        set({ tasks: data, initialized: true, lastFetch: Date.now() });
        // Background-refresh GH issue states for users with PAT
        get().refreshIssueStates();
      }
    } catch (err) {
      logger.error(CAT, 'fetchTasks threw', { error: String(err) });
    } finally {
      set({ loading: false });
    }
  },
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

      // Apply banked time: extend deadline & reset user's bank (fire-and-forget)
      Promise.resolve(supabase.from('profiles').select('banked_minutes').eq('id', task.assigned_to).single())
        .then(({ data: p }) => {
          if (p && p.banked_minutes > 0) {
            const extended = new Date(data.deadline);
            extended.setMinutes(extended.getMinutes() + p.banked_minutes);
            const newDl = extended.toISOString();
            Promise.all([
              taskService.updateTask(data.id, { deadline: newDl }),
              supabase.from('profiles').update({ banked_minutes: 0 }).eq('id', task.assigned_to),
            ]).then(() => {
              set((s) => ({ tasks: s.tasks.map(t => t.id === data.id ? { ...t, deadline: newDl } : t) }));
              logger.info(CAT, 'applied banked time to task', { taskId: data.id, bankedMin: p.banked_minutes });
            });
          }
        }).catch(() => {});

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
  updateTaskStatus: async (taskId, status, actorId, submittedAt?, submissionNote?, powUrl?) => {
    const extras: { submitted_at?: string; submission_note?: string; pow_url?: string } = {};
    if (submittedAt) extras.submitted_at = submittedAt;
    if (submissionNote !== undefined) extras.submission_note = submissionNote;
    if (powUrl) extras.pow_url = powUrl;

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
        // Bank remaining time if submitted early
        const remaining = Math.max(0, Math.floor((new Date(task.deadline).getTime() - Date.now()) / 60000));
        if (remaining > 0) {
          Promise.resolve(supabase.rpc('increment_banked_minutes', { p_user_id: actorId, p_minutes: remaining })).then(() =>
            logger.info(CAT, 'banked early-finish time', { minutes: remaining, userId: actorId })
          ).catch(() => {});
        }
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
  approveTask: async (taskId, userId, tokens, deadline, actorId, bonusTokens?) => {
    const approvedAt = new Date().toISOString();
    const calc = pointsService.calculateTokens(tokens, deadline, bonusTokens);
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

      // 4. Admin earns 10% credit of the task's total tokens (fractions accumulate)
      if (calc.totalTokens > 0) {
        pointsService.accumulateAdminCredit(actorId, calc.totalTokens)
          .catch((err) => logger.warn(CAT, 'accumulateAdminCredit failed', { error: String(err) }));
      }

      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'Completed' as TaskStatus, approved_at: approvedAt } : t,
        ),
      }));

      // Activity log (fire-and-forget)
      if (task) {
        const tokenMsg = calc.bonusTokens > 0
          ? `+${calc.baseTokens} tokens + ${calc.bonusTokens} bonus`
          : `+${calc.baseTokens} tokens`;

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
  extendDeadline: async (taskId, newDeadline, actorId) => {
    try {
      const task = get().tasks.find((t) => t.id === taskId);
      if (!task) return { error: 'Task not found' };

      const { error } = await taskService.extendDeadline(
        taskId,
        task.deadline,
        new Date(newDeadline).toISOString(),
        task.original_deadline,
      );

      if (error) return { error };
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                original_deadline: t.original_deadline || t.deadline,
                deadline: new Date(newDeadline).toISOString(),
              }
            : t,
        ),
      }));
      profileService.resolveProfileNames([actorId])
        .then((profiles) => {
          const actorName = profiles.find(p => p.id === actorId)?.full_name || 'Someone';
          return activityService.insertActivity({
            actor_id: actorId,
            action_type: 'deadline_extended',
            target_user_id: task.assigned_to,
            task_id: taskId,
            message: `${actorName} extended deadline for "${task.title}"`,
          });
        })
        .catch((err) => logger.warn(CAT, 'extendDeadline activity log failed', { error: String(err) }));

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(CAT, 'extendDeadline exception', { error: message });
      return { error: message };
    }
  },
  linkPowUrl: async (taskId, url, issueState) => {
    try {
      const val = url || null;
      const fields: Partial<Task> = { pow_url: val, issue_state: val ? (issueState ?? null) : null };
      const { error } = await taskService.updateTask(taskId, fields);
      if (error) return { error };
      set(s => ({ tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...fields } : t) }));
      logger.debug(CAT, 'linkPowUrl succeeded', { taskId });
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(CAT, 'linkPowUrl exception', { taskId, error: message });
      return { error: message };
    }
  },

  refreshIssueStates: async () => {
    const { loadGHSettings } = await import('../lib/githubSettings');
    const gh = loadGHSettings();
    if (!gh.enabled || !gh.token) return;
    const GH_RE = /github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/;
    const tasks = get().tasks.filter(t => t.pow_url && GH_RE.test(t.pow_url));
    if (!tasks.length) return;
    const byRepo = new Map<string, { id: string; num: string; cur: string | null }[]>();
    for (const t of tasks) {
      const m = t.pow_url!.match(GH_RE)!;
      const key = `${m[1]}/${m[2]}`;
      if (!byRepo.has(key)) byRepo.set(key, []);
      byRepo.get(key)!.push({ id: t.id, num: m[3], cur: t.issue_state });
    }
    const updates: { id: string; state: string }[] = [];
    await Promise.all([...byRepo.entries()].map(async ([repo, items]) => {
      try {
        const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=all&per_page=100&sort=updated`, {
          headers: { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) return;
        const issues: { number: number; state: string }[] = await res.json();
        const stateMap = new Map(issues.map(i => [String(i.number), i.state]));
        for (const item of items) {
          const s = stateMap.get(item.num);
          if (s && s !== item.cur) updates.push({ id: item.id, state: s });
        }
      } catch { /* ignore */ }
    }));
    if (!updates.length) return;
    await Promise.all(updates.map(u => taskService.updateTask(u.id, { issue_state: u.state })));
    set(s => {
      const map = new Map(updates.map(u => [u.id, u.state]));
      return { tasks: s.tasks.map(t => map.has(t.id) ? { ...t, issue_state: map.get(t.id)! } : t) };
    });
  },
  subscribeToTasks: () => {
    return taskService.subscribeToTaskChanges(() => {
      const { _lastUserId, _lastRole } = get();
      get().fetchTasks(_lastUserId, _lastRole, true);
    });
  },
  reset: () => {
    set({ tasks: [], loading: false, initialized: false, lastFetch: 0, _lastUserId: undefined, _lastRole: undefined });
  },
}));
