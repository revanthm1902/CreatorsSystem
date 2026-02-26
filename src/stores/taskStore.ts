import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Task, TaskStatus } from '../types/database';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  fetchTasks: (userId?: string, role?: string) => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'submitted_at' | 'approved_at'>) => Promise<{ error: string | null }>;
  updateTaskStatus: (taskId: string, status: TaskStatus, submittedAt?: string) => Promise<{ error: string | null }>;
  approveTask: (taskId: string, userId: string, tokens: number, deadline: string) => Promise<{ error: string | null }>;
  rejectTask: (taskId: string) => Promise<{ error: string | null }>;
  subscribeToTasks: () => () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (userId?: string, role?: string) => {
    set({ loading: true });
    
    let query = supabase.from('tasks').select('*');
    
    // Users only see their own tasks
    if (role === 'User' && userId) {
      query = query.eq('assigned_to', userId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (!error && data) {
      set({ tasks: data });
    }
    
    set({ loading: false });
  },

  createTask: async (task) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
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
          // Refetch tasks on any change
          get().fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
