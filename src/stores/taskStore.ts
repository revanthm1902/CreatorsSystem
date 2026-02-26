import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Task, TaskStatus } from '../types/database';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  initialized: boolean;
  lastFetch: number;
  fetchTasks: (userId?: string, role?: string, force?: boolean) => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'submitted_at' | 'approved_at'>, creatorRole: string) => Promise<{ error: string | null }>;
  updateTaskStatus: (taskId: string, status: TaskStatus, submittedAt?: string) => Promise<{ error: string | null }>;
  approveTask: (taskId: string, userId: string, tokens: number, deadline: string) => Promise<{ error: string | null }>;
  rejectTask: (taskId: string) => Promise<{ error: string | null }>;
  approveTaskByDirector: (taskId: string) => Promise<{ error: string | null }>;
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
    return { error: null };
  },

  updateTaskStatus: async (taskId: string, status: TaskStatus, submittedAt?: string) => {
    const updateData: Partial<Task> = { status };
    if (submittedAt) {
      updateData.submitted_at = submittedAt;
    }

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

    return { error: null };
  },

  approveTaskByDirector: async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ director_approved: true })
      .eq('id', taskId);

    if (error) {
      return { error: error.message };
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, director_approved: true } : t
      ),
    }));

    return { error: null };
  },

  approveTask: async (taskId: string, userId: string, tokens: number, deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const approvedAt = now.toISOString();
    
    // Calculate tokens: full tokens if on time, 0 if late
    const tokensAwarded = now <= deadlineDate ? tokens : 0;

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

    return { error: null };
  },

  rejectTask: async (taskId: string) => {
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
