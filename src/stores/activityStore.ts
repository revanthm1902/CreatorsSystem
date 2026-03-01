/**
 * Activity store — manages activity feed UI state.
 *
 * Responsibilities (SRP):
 *  - Hold activity entries, unread counts, toast state in Zustand
 *  - Track last-read timestamp via localStorage
 *  - Delegate all Supabase I/O to activityService
 *
 * The createActivityMessage utility remains exported for any consumer
 * that needs to build activity strings without touching the store.
 */

import { create } from 'zustand';
import type { ActivityLog, ActivityLogInsert } from '../types/database';
import * as activityServiceMod from '../services/activityService';
import { logger } from '../lib/logger';

const CAT = 'activityStore';
const LAST_READ_KEY = 'activity_last_read_at';

// ---------------------------------------------------------------------------
// localStorage helpers (extracted for clarity)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
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

    if (state.loading) return;
    if (!force && state.initialized && (now - state.lastFetch) < CACHE_DURATION) return;

    set({ loading: true });

    const { data, error } = await activityServiceMod.fetchActivities();

    if (!error && data) {
      const lastRead = get().lastReadAt;
      const unreadCount = lastRead
        ? data.filter((a) => new Date(a.created_at) > new Date(lastRead)).length
        : data.length;

      set({
        activities: data,
        loading: false,
        initialized: true,
        lastFetch: Date.now(),
        unreadCount,
      });
    } else {
      set({ loading: false, initialized: true });
      logger.error(CAT, 'fetchActivities failed', { error });
    }
  },

  logActivity: async (activity: ActivityLogInsert) => {
    await activityServiceMod.insertActivity(activity);
  },

  deleteActivity: async (activityId: string) => {
    const { error } = await activityServiceMod.deleteActivityEntry(activityId);

    // Remove from local state regardless (optimistic)
    set((s) => ({
      activities: s.activities.filter((a) => a.id !== activityId),
    }));

    return { error };
  },

  postCustomMessage: async (actorId: string, message: string) => {
    await activityServiceMod.insertActivity({
      actor_id: actorId,
      action_type: 'custom_message',
      target_user_id: null,
      task_id: null,
      message,
    });
  },

  subscribeToActivities: () => {
    return activityServiceMod.subscribeToActivityChanges({
      onInsert: async (newId: string) => {
        const activity = await activityServiceMod.fetchActivityById(newId);
        if (activity) {
          set((s) => ({
            activities: [activity, ...s.activities].slice(0, 50),
            unreadCount: s.unreadCount + 1,
            toastActivity: activity,
          }));
        }
      },
      onDelete: (deletedId: string) => {
        set((s) => ({
          activities: s.activities.filter((a) => a.id !== deletedId),
        }));
      },
    });
  },

  markAllRead: () => {
    const activities = get().activities;
    const ts = activities.length > 0 ? activities[0].created_at : new Date().toISOString();
    setLastReadAt(ts);
    set({ unreadCount: 0, lastReadAt: ts });
  },

  clearToast: () => set({ toastActivity: null }),

  reset: () => {
    set({
      activities: [],
      loading: false,
      initialized: false,
      lastFetch: 0,
      unreadCount: 0,
      lastReadAt: getLastReadAt(),
      toastActivity: null,
      isPanelOpen: false,
    });
  },
}));

// ---------------------------------------------------------------------------
// Utility: build activity messages (pure function, no I/O)
// ---------------------------------------------------------------------------
export function createActivityMessage(
  action: ActivityLogInsert['action_type'],
  actorName: string,
  targetName?: string,
  taskTitle?: string,
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
      return '';
    case 'password_reset_request':
      return `${actorName} reset password for ${targetName}`;
    default:
      return 'Activity occurred';
  }
}
