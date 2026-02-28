import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Task, TaskStatus, ActivityLogInsert } from '../types/database';

// Helper function to log activity
async function logActivity(activity: ActivityLogInsert) {
  try {
    await supabase.from('activity_log').insert(activity);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  initialized: boolean;
  lastFetch: number;
  fetchTasks: (userId?: string, role?: string, force?: boolean) => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'submitted_at' | 'approved_at' | 'submission_note' | 'admin_feedback'>, creatorRole: string) => Promise<{ error: string | null }>;
  editTask: (taskId: string, updates: { title: string; description: string; deadline: string; tokens: number; assigned_to: string }, actorId: string, actorRole: string) => Promise<{ error: string | null }>;
  updateTaskStatus: (taskId: string, status: TaskStatus, actorId: string, submittedAt?: string, submissionNote?: string) => Promise<{ error: string | null }>;
  approveTask: (taskId: string, userId: string, tokens: number, deadline: string, actorId: string) => Promise<{ error: string | null }>;
  rejectTask: (taskId: string, actorId: string) => Promise<{ error: string | null }>;
  reassignTask: (taskId: string, actorId: string) => Promise<{ error: string | null }>;
  approveTaskByDirector: (taskId: string, actorId: string) => Promise<{ error: string | null }>;
  addFeedback: (taskId: string, feedback: string, actorId: string) => Promise<{ error: string | null }>;
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

  fetchTasks: async (userId?: string, role?: string, force = false) => {
    const state = get();
    const now = Date.now();
    
    // Skip if already loading
    if (state.loading) return;
    
    // Use cache if valid and not forcing refresh
    if (!force && state.initialized && (now - state.lastFetch) < CACHE_DURATION) {
      return;
    }
    
    set({ loading: true });
    
    try {
      let query = supabase.from('tasks').select('*');
      
      // Users only see their own tasks that are approved by director
      if (role === 'User' && userId) {
        query = query.eq('assigned_to', userId).eq('director_approved', true);
      }
      // Admins see all tasks (including pending director approval)
      // Directors see all tasks
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (!error && data) {
        set({ tasks: data, initialized: true, lastFetch: now });
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (task, creatorRole: string) => {
    // If Director creates task, it's auto-approved
    // If Admin creates task, it needs Director approval
    const directorApproved = creatorRole === 'Director';
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, director_approved: directorApproved })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    set((state) => ({ tasks: [data, ...state.tasks] }));

    // Fetch actor and target names for the activity message
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', [task.created_by, task.assigned_to]);

    const actorName = profiles?.find(p => p.id === task.created_by)?.full_name || 'Someone';
    const targetName = profiles?.find(p => p.id === task.assigned_to)?.full_name || 'a user';

    // Log activity
    await logActivity({
      actor_id: task.created_by,
      action_type: 'task_assigned',
      target_user_id: task.assigned_to,
      task_id: data.id,
      message: `${actorName} assigned task "${task.title}" to ${targetName}`,
    });

    return { error: null };
  },

  editTask: async (taskId: string, updates: { title: string; description: string; deadline: string; tokens: number; assigned_to: string }, actorId: string, actorRole: string) => {
    // Editing a task resets director_approved — Directors' edits are auto-approved,
    // Admins' edits require Director re-approval
    const directorApproved = actorRole === 'Director';

    const updateData = {
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

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      return { error: error.message };
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updateData } : t
      ),
    }));

    // Log activity
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', actorId)
      .single();

    await logActivity({
      actor_id: actorId,
      action_type: 'task_assigned',
      target_user_id: updates.assigned_to,
      task_id: taskId,
      message: `${profile?.full_name || 'Someone'} edited task "${updates.title}"${!directorApproved ? ' (pending director re-approval)' : ''}`,
    });

    return { error: null };
  },

  updateTaskStatus: async (taskId: string, status: TaskStatus, actorId: string, submittedAt?: string, submissionNote?: string) => {
    const updateData: Partial<Task> = { status };
    if (submittedAt) {
      updateData.submitted_at = submittedAt;
    }
    if (submissionNote !== undefined) {
      updateData.submission_note = submissionNote;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      return { error: error.message };
    }

    const task = get().tasks.find(t => t.id === taskId);

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updateData } : t
      ),
    }));

    // Log activity for "Under Review" (user marked as done)
    if (status === 'Under Review' && task) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', actorId)
        .single();

      await logActivity({
        actor_id: actorId,
        action_type: 'task_marked_done',
        target_user_id: actorId,
        task_id: taskId,
        message: `${profile?.full_name || 'Someone'} submitted task "${task.title}" for review`,
      });
    }

    return { error: null };
  },

  approveTaskByDirector: async (taskId: string, actorId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ director_approved: true })
      .eq('id', taskId);

    if (error) {
      return { error: error.message };
    }

    const task = get().tasks.find(t => t.id === taskId);

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, director_approved: true } : t
      ),
    }));

    // Log activity
    if (task) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', actorId)
        .single();

      await logActivity({
        actor_id: actorId,
        action_type: 'director_approved_task',
        target_user_id: task.assigned_to,
        task_id: taskId,
        message: `${profile?.full_name || 'Director'} approved task "${task.title}" for users`,
      });
    }

    return { error: null };
  },

  approveTask: async (taskId: string, userId: string, tokens: number, deadline: string, actorId: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const approvedAt = now.toISOString();
    
    // Calculate tokens: full tokens if on time, 0 if late
    const tokensAwarded = now <= deadlineDate ? tokens : 0;

    const task = get().tasks.find(t => t.id === taskId);

    // Update task
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ status: 'Completed', approved_at: approvedAt })
      .eq('id', taskId);

    if (taskError) {
      return { error: taskError.message };
    }

    // Log points
    const { error: logError } = await supabase.from('points_log').insert({
      user_id: userId,
      task_id: taskId,
      tokens_awarded: tokensAwarded,
      reason: tokensAwarded > 0 ? 'Task completed on time' : 'Task completed late - no tokens awarded',
    });

    if (logError) {
      return { error: logError.message };
    }

    // Update user's total tokens
    if (tokensAwarded > 0) {
      const { error: profileError } = await supabase.rpc('increment_tokens', {
        user_id: userId,
        amount: tokensAwarded,
      });

      if (profileError) {
        return { error: profileError.message };
      }
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'Completed' as TaskStatus, approved_at: approvedAt } : t
      ),
    }));

    // Log activity
    if (task) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', [actorId, userId]);

      const actorName = profiles?.find(p => p.id === actorId)?.full_name || 'Someone';
      const targetName = profiles?.find(p => p.id === userId)?.full_name || 'a user';

      await logActivity({
        actor_id: actorId,
        action_type: 'task_approved',
        target_user_id: userId,
        task_id: taskId,
        message: `${actorName} approved task "${task.title}" for ${targetName}${tokensAwarded > 0 ? ` (+${tokensAwarded} tokens)` : ' (late - no tokens)'}`,
      });
    }

    return { error: null };
  },

  rejectTask: async (taskId: string, actorId: string) => {
    const task = get().tasks.find(t => t.id === taskId);

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'Rejected' })
      .eq('id', taskId);

    if (error) {
      return { error: error.message };
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'Rejected' as TaskStatus } : t
      ),
    }));

    // Log activity
    if (task) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', [actorId, task.assigned_to]);

      const actorName = profiles?.find(p => p.id === actorId)?.full_name || 'Someone';
      const targetName = profiles?.find(p => p.id === task.assigned_to)?.full_name || 'a user';

      await logActivity({
        actor_id: actorId,
        action_type: 'task_rejected',
        target_user_id: task.assigned_to,
        task_id: taskId,
        message: `${actorName} rejected task "${task.title}" from ${targetName}`,
      });
    }

    return { error: null };
  },

  reassignTask: async (taskId: string, actorId: string) => {
    const task = get().tasks.find(t => t.id === taskId);

    const updateData: Partial<Task> = {
      status: 'Pending' as TaskStatus,
      submitted_at: null,
      submission_note: null,
      approved_at: null,
    };

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      return { error: error.message };
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updateData } : t
      ),
    }));

    // Log activity
    if (task) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', [actorId, task.assigned_to]);

      const actorName = profiles?.find(p => p.id === actorId)?.full_name || 'Someone';
      const targetName = profiles?.find(p => p.id === task.assigned_to)?.full_name || 'a user';

      await logActivity({
        actor_id: actorId,
        action_type: 'task_reassigned',
        target_user_id: task.assigned_to,
        task_id: taskId,
        message: `${actorName} reassigned task "${task.title}" back to ${targetName} for rework`,
      });
    }

    return { error: null };
  },

  addFeedback: async (taskId: string, feedback: string, actorId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ admin_feedback: feedback })
      .eq('id', taskId);

    if (error) {
      return { error: error.message };
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, admin_feedback: feedback } : t
      ),
    }));

    return { error: null };
  },

  deleteTask: async (taskId: string, actorId: string) => {
    const task = get().tasks.find(t => t.id === taskId);

    // First delete related activity_log entries that reference this task
    await supabase.from('activity_log').delete().eq('task_id', taskId);
    // Delete related points_log entries
    await supabase.from('points_log').delete().eq('task_id', taskId);

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      return { error: error.message };
    }

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    }));

    // Log activity
    if (task) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', actorId)
        .single();

      await logActivity({
        actor_id: actorId,
        action_type: 'task_deleted',
        target_user_id: task.assigned_to,
        task_id: null,
        message: `${profile?.full_name || 'Someone'} deleted task "${task.title}"`,
      });
    }

    return { error: null };
  },

  subscribeToTasks: () => {
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          // Refetch tasks on any change (force refresh)
          get().fetchTasks(undefined, undefined, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  reset: () => {
    set({ tasks: [], loading: false, initialized: false, lastFetch: 0 });
  },
}));
