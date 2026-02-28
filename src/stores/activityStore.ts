import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { ActivityLog, ActivityLogInsert } from '../types/database';

const LAST_READ_KEY = 'activity_last_read_at';

function getLastReadAt(): string | null {
  try {
    return localStorage.getItem(LAST_READ_KEY);
  } catch {
    return null;
  }
}

function setLastReadAt(timestamp: string) {
  try {
    localStorage.setItem(LAST_READ_KEY, timestamp);
  } catch {
    // localStorage unavailable
  }
}

interface ActivityState {
  activities: ActivityLog[];
  loading: boolean;
  initialized: boolean;
  lastFetch: number;
  unreadCount: number;
  lastReadAt: string | null;
  toastActivity: ActivityLog | null;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  fetchActivities: (force?: boolean) => Promise<void>;
  logActivity: (activity: ActivityLogInsert) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<{ error: string | null }>;
  postCustomMessage: (actorId: string, message: string) => Promise<void>;
  subscribeToActivities: () => () => void;
  markAllRead: () => void;
  clearToast: () => void;
  reset: () => void;
}

const CACHE_DURATION = 30000; // 30 seconds

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  loading: false,
  initialized: false,
  lastFetch: 0,
  unreadCount: 0,
  lastReadAt: getLastReadAt(),
  toastActivity: null,
  isPanelOpen: false,
  setIsPanelOpen: (open: boolean) => set({ isPanelOpen: open }),

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
      const activities = data as ActivityLog[];
      const lastRead = get().lastReadAt;
      const unreadCount = lastRead
        ? activities.filter((a) => new Date(a.created_at) > new Date(lastRead)).length
        : activities.length;

      set({ 
        activities, 
        loading: false,
        initialized: true,
        lastFetch: Date.now(),
        unreadCount,
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

  deleteActivity: async (activityId: string) => {
    const { error } = await supabase
      .from('activity_log')
      .delete()
      .eq('id', activityId);

    if (error) {
      console.error('Error deleting activity:', error);
      return { error: error.message };
    }

    // Remove from local state immediately
    set((state) => ({
      activities: state.activities.filter((a) => a.id !== activityId),
    }));
    return { error: null };
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
              unreadCount: state.unreadCount + 1,
              toastActivity: data as ActivityLog,
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'activity_log' },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id;
          if (deletedId) {
            set((state) => ({
              activities: state.activities.filter((a) => a.id !== deletedId),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  markAllRead: () => {
    const activities = get().activities;
    if (activities.length > 0) {
      const latestTimestamp = activities[0].created_at;
      setLastReadAt(latestTimestamp);
      set({ unreadCount: 0, lastReadAt: latestTimestamp });
    } else {
      const now = new Date().toISOString();
      setLastReadAt(now);
      set({ unreadCount: 0, lastReadAt: now });
    }
  },

  clearToast: () => {
    set({ toastActivity: null });
  },

  reset: () => {
    set({ activities: [], loading: false, initialized: false, lastFetch: 0, unreadCount: 0, lastReadAt: getLastReadAt(), toastActivity: null, isPanelOpen: false });
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
    case 'password_reset_request':
      return `${actorName} reset password for ${targetName}`;
    default:
      return 'Activity occurred';
  }
}
