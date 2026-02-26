import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { ActivityLog, ActivityLogInsert } from '../types/database';

interface ActivityState {
  activities: ActivityLog[];
  loading: boolean;
  initialized: boolean;
  lastFetch: number;
  fetchActivities: (force?: boolean) => Promise<void>;
  logActivity: (activity: ActivityLogInsert) => Promise<void>;
  postCustomMessage: (actorId: string, message: string) => Promise<void>;
  subscribeToActivities: () => () => void;
  reset: () => void;
}

const CACHE_DURATION = 30000; // 30 seconds

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  loading: false,
  initialized: false,
  lastFetch: 0,

  fetchActivities: async (force = false) => {
    const state = get();
    const now = Date.now();
    
    // Skip if already loading or cache is fresh
    if (state.loading) return;
    if (!force && state.initialized && (now - state.lastFetch) < CACHE_DURATION) return;
    
    set({ loading: true });

    const { data, error } = await supabase
      .from('activity_log')
      .select(`
        *,
        actor:actor_id(id, full_name, role, employee_id),
        target_user:target_user_id(id, full_name, role, employee_id)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      set({ 
        activities: data as ActivityLog[], 
        loading: false,
        initialized: true,
        lastFetch: Date.now()
      });
    } else {
      set({ loading: false, initialized: true });
      console.error('Error fetching activities:', error);
    }
  },

  logActivity: async (activity: ActivityLogInsert) => {
    const { error } = await supabase.from('activity_log').insert(activity);
    if (error) {
      console.error('Error logging activity:', error);
    }
  },

  postCustomMessage: async (actorId: string, message: string) => {
    const activity: ActivityLogInsert = {
      actor_id: actorId,
      action_type: 'custom_message',
      target_user_id: null,
      task_id: null,
      message,
    };
    const { error } = await supabase.from('activity_log').insert(activity);
    if (error) {
      console.error('Error posting custom message:', error);
    }
  },

  subscribeToActivities: () => {
    const channel = supabase
      .channel('activity_log_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        async (payload) => {
          // Fetch the new activity with joined data
          const { data } = await supabase
            .from('activity_log')
            .select(`
              *,
              actor:actor_id(id, full_name, role, employee_id),
              target_user:target_user_id(id, full_name, role, employee_id)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            set((state) => ({
              activities: [data as ActivityLog, ...state.activities].slice(0, 50),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  reset: () => {
    set({ activities: [], loading: false, initialized: false, lastFetch: 0 });
  },
}));

// Helper function to create activity messages
export function createActivityMessage(
  action: ActivityLogInsert['action_type'],
  actorName: string,
  targetName?: string,
  taskTitle?: string
): string {
  switch (action) {
    case 'user_added':
      return `${actorName} added ${targetName} to the team`;
    case 'task_created':
      return `${actorName} created task "${taskTitle}"`;
    case 'task_assigned':
      return `${actorName} assigned task "${taskTitle}" to ${targetName}`;
    case 'task_marked_done':
      return `${targetName} submitted task "${taskTitle}" for review`;
    case 'task_approved':
      return `${actorName} approved task "${taskTitle}" for ${targetName}`;
    case 'task_rejected':
      return `${actorName} rejected task "${taskTitle}" from ${targetName}`;
    case 'task_completed':
      return `${targetName} completed task "${taskTitle}"`;
    case 'director_approved_task':
      return `${actorName} approved task "${taskTitle}" for users`;
    case 'custom_message':
      return ''; // Message will be the actual message content
    default:
      return 'Activity occurred';
  }
}
