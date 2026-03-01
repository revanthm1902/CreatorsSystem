/**
 * Shared activity icon and color maps.
 *
 * Single responsibility: map `ActivityType` values to their visual
 * representation (Lucide icon component + Tailwind color class).
 *
 * Used by ActivityFeed, ActivityNotification, and ActivityToast.
 */

import type { ActivityType } from '../../types/database';
import {
  Bell,
  UserPlus,
  ClipboardList,
  CheckCircle,
  XCircle,
  Send,
  ShieldCheck,
  MessageSquare,
  RotateCcw,
  Trash2,
  KeyRound,
  Gift,
  Clock,
} from 'lucide-react';

export const actionIcons: Record<ActivityType, typeof Bell> = {
  user_added: UserPlus,
  task_created: ClipboardList,
  task_assigned: ClipboardList,
  task_completed: CheckCircle,
  task_marked_done: Send,
  task_approved: CheckCircle,
  task_rejected: XCircle,
  task_reassigned: RotateCcw,
  director_approved_task: ShieldCheck,
  custom_message: MessageSquare,
  task_deleted: Trash2,
  deadline_extended: Clock,
  password_reset_request: KeyRound,
  tokens_given: Gift,
};

export const actionColors: Record<ActivityType, string> = {
  user_added: 'bg-blue-500/20 text-blue-500',
  task_created: 'bg-purple-500/20 text-purple-500',
  task_assigned: 'bg-indigo-500/20 text-indigo-500',
  task_completed: 'bg-emerald-500/20 text-emerald-500',
  task_marked_done: 'bg-amber-500/20 text-amber-500',
  task_approved: 'bg-green-500/20 text-green-500',
  task_rejected: 'bg-red-500/20 text-red-500',
  task_reassigned: 'bg-yellow-500/20 text-yellow-500',
  director_approved_task: 'bg-orange-500/20 text-orange-500',
  custom_message: 'bg-cyan-500/20 text-cyan-500',
  task_deleted: 'bg-rose-500/20 text-rose-500',
  deadline_extended: 'bg-amber-500/20 text-amber-500',
  password_reset_request: 'bg-yellow-500/20 text-yellow-500',
  tokens_given: 'bg-emerald-500/20 text-emerald-500',
};
