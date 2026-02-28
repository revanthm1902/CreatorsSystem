import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useActivityStore } from '../../stores/activityStore';
import { useAuthStore } from '../../stores/authStore';
import type { ActivityLog, ActivityType } from '../../types/database';
import {
  Bell,
  UserPlus,
  ClipboardList,
  CheckCircle,
  XCircle,
  Send,
  ShieldCheck,
  MessageSquare,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trash2,
  KeyRound,
  Gift,
} from 'lucide-react';

const actionIcons: Record<ActivityType, typeof Bell> = {
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
  password_reset_request: KeyRound,
  tokens_given: Gift,
};

const actionColors: Record<ActivityType, string> = {
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
  password_reset_request: 'bg-yellow-500/20 text-yellow-500',
  tokens_given: 'bg-emerald-500/20 text-emerald-500',
};

interface ActivityFeedProps {
  showPostForm?: boolean;
  maxItems?: number;
  compact?: boolean;
}

export function ActivityFeed({ showPostForm = false, maxItems = 20, compact = false }: ActivityFeedProps) {
  const { activities, loading, fetchActivities, subscribeToActivities, postCustomMessage, deleteActivity } = useActivityStore();
  const { profile } = useAuthStore();
  const [newMessage, setNewMessage] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchActivities();
    const unsubscribe = subscribeToActivities();
    return () => unsubscribe();
  }, [fetchActivities, subscribeToActivities]);

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    setPosting(true);
    await postCustomMessage(profile.id, newMessage.trim());
    setNewMessage('');
    setPosting(false);
  };

  const handleRefresh = () => {
    fetchActivities(true);
  };

  const displayActivities = activities.slice(0, maxItems);
  const canPost = profile?.role === 'Director' || profile?.role === 'Admin';

  return (
    <div 
      className={`card rounded-2xl ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'}`}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className={`font-semibold flex items-center gap-2 ${compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'}`} style={{ color: 'var(--text-primary)' }}>
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
          Activity Feed
        </h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 rounded-lg transition-all hover:bg-primary/10"
          style={{ color: 'var(--text-muted)' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Post Form (Admin/Director only) */}
      {showPostForm && canPost && (
        <form onSubmit={handlePostMessage} className="mb-3 sm:mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Post an announcement..."
              className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-primary/30 text-sm sm:text-base"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              maxLength={500}
            />
            <button
              type="submit"
              disabled={posting || !newMessage.trim()}
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all disabled:opacity-50 font-medium"
            >
              {posting ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
        </form>
      )}

      {/* Activity List */}
      <div className={`space-y-2 sm:space-y-3 ${compact ? 'max-h-60 sm:max-h-75' : 'max-h-80 sm:max-h-100'} overflow-y-auto`}>
        {loading && activities.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : displayActivities.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No activity yet</p>
            <p className="text-xs mt-1 opacity-70">Activities will appear here when actions are performed</p>
          </div>
        ) : (
          displayActivities.map((activity) => (
            <ActivityItem 
              key={activity.id} 
              activity={activity} 
              compact={compact}
              canDelete={canPost}
              onDelete={deleteActivity}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ActivityItemProps {
  activity: ActivityLog;
  compact?: boolean;
  canDelete?: boolean;
  onDelete?: (id: string) => Promise<{ error: string | null }>;
}

function ActivityItem({ activity, compact, canDelete, onDelete }: ActivityItemProps) {
  const [deleting, setDeleting] = useState(false);
  const Icon = actionIcons[activity.action_type] || Bell;
  const colorClass = actionColors[activity.action_type] || 'bg-gray-500/20 text-gray-500';
  
  const actorName = activity.actor?.full_name || 'Someone';
  const actorRole = activity.actor?.role || '';

  const handleDelete = async () => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    await onDelete(activity.id);
    setDeleting(false);
  };

  return (
    <div 
      className={`group flex items-start gap-2.5 sm:gap-3 ${compact ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3'} rounded-xl transition-all hover:scale-[1.01]`}
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    >
      {/* Icon */}
      <div className={`shrink-0 p-1.5 sm:p-2 rounded-lg ${colorClass}`}>
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`${compact ? 'text-xs sm:text-sm' : 'text-sm'} leading-relaxed wrap-break-word`} style={{ color: 'var(--text-primary)' }}>
          {activity.action_type === 'custom_message' ? (
            <>
              <span className="font-semibold">{actorName}</span>
              <span className="px-1 py-0.5 ml-1 text-[10px] sm:text-xs rounded-md bg-primary/20 text-primary">
                {actorRole}
              </span>
              <span className="block mt-1 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                {activity.message}
              </span>
            </>
          ) : (
            <span>{activity.message}</span>
          )}
        </p>
        <p className="text-[10px] sm:text-xs mt-0.5 sm:mt-1" style={{ color: 'var(--text-muted)' }}>
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Delete button (Admin/Director only) */}
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-danger/15 text-danger/60 hover:text-danger disabled:opacity-50"
          title="Delete activity"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
