import { useEffect, useState, useRef } from 'react';
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
  X,
  RotateCcw,
  Trash2,
  KeyRound,
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
};

/* ────────── Bell Button with Badge ────────── */
export function ActivityButton() {
  const { unreadCount, markAllRead, fetchActivities, subscribeToActivities, isPanelOpen, setIsPanelOpen } = useActivityStore();

  useEffect(() => {
    fetchActivities();
    const unsub = subscribeToActivities();
    return () => unsub();
  }, [fetchActivities, subscribeToActivities]);

  const handleOpen = () => {
    setIsPanelOpen(true);
    markAllRead();
  };

  const handleClose = () => {
    setIsPanelOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`relative p-2.5 rounded-xl transition-all hover:bg-primary/10 ${
          unreadCount > 0 ? 'animate-[bell-ring_2s_ease-in-out_infinite]' : ''
        }`}
        style={{ color: unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        title={unreadCount > 0 ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}` : 'Activity'}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <>
            {/* Ping ring */}
            <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 rounded-full bg-danger animate-ping opacity-40" />
            {/* Badge */}
            <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 flex items-center justify-center text-[11px] font-bold text-white bg-danger rounded-full leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </>
        )}
      </button>

      {isPanelOpen && <ActivityPopup onClose={handleClose} />}
    </>
  );
}

/* ────────── Full-screen Popup Overlay ────────── */
function ActivityPopup({ onClose }: { onClose: () => void }) {
  const { activities, loading, fetchActivities, postCustomMessage } = useActivityStore();
  const { profile } = useAuthStore();
  const [newMessage, setNewMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;
    setPosting(true);
    await postCustomMessage(profile.id, newMessage.trim());
    setNewMessage('');
    setPosting(false);
    fetchActivities(true);
  };

  const canPost = profile?.role === 'Director' || profile?.role === 'Admin';

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-start sm:justify-end"
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border overflow-hidden flex flex-col sm:m-4 sm:mt-16"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          height: '85vh',
          maxHeight: '85vh',
        }}
      >
        {/* Mobile pull indicator */}
        <div className="sm:hidden w-10 h-1 rounded-full mx-auto mt-2.5 mb-1" style={{ backgroundColor: 'var(--border-color)' }} />
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            Activity Center
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-primary/10"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post Form */}
        {canPost && (
          <form
            onSubmit={handlePostMessage}
            className="px-4 sm:px-5 py-2.5 sm:py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--border-color)' }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Post an announcement..."
                className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-primary/30"
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
                className="px-3 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all disabled:opacity-50 text-sm font-medium shrink-0"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
        )}

        {/* Activity List */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2.5 sm:py-3 space-y-1.5 sm:space-y-2 min-h-0">
          {loading && activities.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity yet</p>
            </div>
          ) : (
            activities.map((activity) => {
              const lastRead = useActivityStore.getState().lastReadAt;
              const isUnread = lastRead
                ? new Date(activity.created_at) > new Date(lastRead)
                : false;
              return (
                <PopupActivityItem key={activity.id} activity={activity} isUnread={isUnread} />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function PopupActivityItem({ activity, isUnread }: { activity: ActivityLog; isUnread: boolean }) {
  const Icon = actionIcons[activity.action_type] || Bell;
  const colorClass = actionColors[activity.action_type] || 'bg-gray-500/20 text-gray-500';
  const actorName = activity.actor?.full_name || 'Someone';
  const actorRole = activity.actor?.role || '';

  return (
    <div
      className={`flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-colors relative ${
        isUnread ? 'ring-1 ring-primary/30' : ''
      }`}
      style={{ backgroundColor: isUnread ? 'var(--bg-card)' : 'var(--bg-elevated)' }}
    >
      {isUnread && (
        <span className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
      <div className={`shrink-0 p-1.5 sm:p-2 rounded-lg ${colorClass}`}>
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm leading-relaxed break-words" style={{ color: 'var(--text-primary)' }}>
          {activity.action_type === 'custom_message' ? (
            <>
              <span className="font-semibold">{actorName}</span>
              <span className="px-1 py-0.5 ml-1 text-[10px] rounded-md bg-primary/20 text-primary">
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
    </div>
  );
}

/* ────────── Toast Notification (bottom of screen) ────────── */
export function ActivityToast() {
  const { toastActivity, clearToast } = useActivityStore();

  useEffect(() => {
    if (!toastActivity) return;
    const timer = setTimeout(clearToast, 3000);
    return () => clearTimeout(timer);
  }, [toastActivity, clearToast]);

  if (!toastActivity) return null;

  const Icon = actionIcons[toastActivity.action_type] || Bell;
  const colorClass = actionColors[toastActivity.action_type] || 'bg-gray-500/20 text-gray-500';
  const actorName = toastActivity.actor?.full_name || 'Someone';
  const actorRole = toastActivity.actor?.role || '';

  return (
    <div
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-60 w-[94%] sm:w-[90%] max-w-md animate-[toast-lifecycle_3s_ease-in-out_forwards]"
    >
      <div
        className="flex items-start gap-3 p-4 rounded-xl border shadow-lg"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className={`shrink-0 p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {toastActivity.action_type === 'custom_message' ? (
              <>
                <span className="font-semibold">{actorName}</span>
                <span className="px-1.5 py-0.5 ml-1 text-[10px] rounded-md bg-primary/20 text-primary">
                  {actorRole}
                </span>
                <span className="block mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {toastActivity.message}
                </span>
              </>
            ) : (
              <span>{toastActivity.message}</span>
            )}
          </p>
        </div>
        <button
          onClick={clearToast}
          className="shrink-0 p-1 rounded-lg transition-colors hover:bg-primary/10"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
