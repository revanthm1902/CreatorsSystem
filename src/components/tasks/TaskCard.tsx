import { useState } from 'react';
import { format } from 'date-fns';
import type { Task } from '../../types/database';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskCountdown } from './TaskCountdown';
import { useTaskStore } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';
import { Zap, CheckCircle, XCircle, Send, ShieldCheck, Clock } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  showActions?: boolean;
  isAdminView?: boolean;
}

export function TaskCard({ task, showActions = true, isAdminView = false }: TaskCardProps) {
  const [loading, setLoading] = useState(false);
  const { updateTaskStatus, approveTask, rejectTask, approveTaskByDirector } = useTaskStore();
  const { profile } = useAuthStore();

  const handleMarkDone = async () => {
    setLoading(true);
    await updateTaskStatus(task.id, 'Under Review', new Date().toISOString());
    setLoading(false);
  };

  const handleApprove = async () => {
    setLoading(true);
    await approveTask(task.id, task.assigned_to, task.tokens, task.deadline);
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await rejectTask(task.id);
    setLoading(false);
  };

  const handleDirectorApprove = async () => {
    setLoading(true);
    await approveTaskByDirector(task.id);
    setLoading(false);
  };

  const canMarkDone = profile?.role === 'User' && task.status === 'Pending';
  const canReview = isAdminView && task.status === 'Under Review';
  const canDirectorApprove = profile?.role === 'Director' && !task.director_approved && task.status === 'Pending';
  const isPendingDirectorApproval = !task.director_approved && task.status === 'Pending';

  return (
    <div 
      className="card rounded-2xl p-6 hover:scale-[1.01] transition-all"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{task.title}</h3>
          <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      <div 
        className="flex items-center justify-between border-t pt-4 mt-4"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent">
            <Zap className="w-4 h-4" />
            <span className="font-bold">{task.tokens}</span>
            <span className="text-xs opacity-70">tokens</span>
          </div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Due: {format(new Date(task.deadline), 'MMM d, yyyy h:mm a')}
          </div>
        </div>

        <TaskCountdown deadline={task.deadline} status={task.status} />
      </div>

      {showActions && (
        <div 
          className="flex items-center gap-3 mt-4 pt-4 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          {canMarkDone && (
            <button
              onClick={handleMarkDone}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-primary to-primary-hover text-white rounded-xl transition-all disabled:opacity-50 font-medium shadow-lg hover:scale-105 active:scale-95"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Mark as Done
                </>
              )}
            </button>
          )}

          {canReview && (
            <>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-success hover:bg-success/80 text-white rounded-xl transition-all disabled:opacity-50 font-medium shadow-lg hover:scale-105 active:scale-95"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </>
                )}
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-danger hover:bg-danger/80 text-white rounded-xl transition-all disabled:opacity-50 font-medium hover:scale-105 active:scale-95"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </>
          )}

          {canDirectorApprove && (
            <button
              onClick={handleDirectorApprove}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition-all disabled:opacity-50 font-medium shadow-lg hover:scale-105 active:scale-95"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Approve for Users
                </>
              )}
            </button>
          )}

          {isPendingDirectorApproval && profile?.role === 'Admin' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm">
              <Clock className="w-4 h-4" />
              <span>Awaiting Director Approval</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
