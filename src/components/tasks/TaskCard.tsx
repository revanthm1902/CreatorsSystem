/**
 * TaskCard — displays a single task as a card with contextual action buttons.
 *
 * Single responsibility: render task summary + route user interactions to
 * the appropriate extracted modal component.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import type { Task } from '../../types/database';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskCountdown } from './TaskCountdown';
import { TaskDetailModal } from './TaskDetailModal';
import { SubmitTaskModal } from './SubmitTaskModal';
import { FeedbackModal } from './FeedbackModal';
import { DeleteTaskConfirm } from './DeleteTaskConfirm';
import { EditTaskModal } from './EditTaskModal';
import { useTaskStore } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';
import {
  Zap,
  CheckCircle,
  XCircle,
  Send,
  ShieldCheck,
  Clock,
  Calendar,
  Pencil,
  Trash2,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  showActions?: boolean;
  isAdminView?: boolean;
}

export function TaskCard({ task, showActions = true, isAdminView = false }: TaskCardProps) {
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { updateTaskStatus, approveTask, rejectTask, reassignTask, approveTaskByDirector, addFeedback, deleteTask } = useTaskStore();
  const { profile } = useAuthStore();

  // ── Action handlers ──────────────────────────────────────────

  const handleSubmit = async (note: string | undefined) => {
    if (!profile) return;
    setLoading(true);
    try {
      await updateTaskStatus(task.id, 'Under Review', profile.id, new Date().toISOString(), note);
      setShowSubmitModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await approveTask(task.id, task.assigned_to, task.tokens, task.deadline, profile.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await rejectTask(task.id, profile.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await reassignTask(task.id, profile.id);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectorApprove = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await approveTaskByDirector(task.id, profile.id);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFeedback = async (feedback: string) => {
    if (!profile) return;
    setLoading(true);
    try {
      await addFeedback(task.id, feedback);
      setShowFeedbackModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await deleteTask(task.id, profile.id);
      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  // ── Permission flags ─────────────────────────────────────────

  const canMarkDone = profile?.role === 'User' && task.status === 'Pending';
  const canReview = isAdminView && task.status === 'Under Review';
  const canDirectorApprove = profile?.role === 'Director' && !task.director_approved && task.status === 'Pending';
  const isPendingDirectorApproval = !task.director_approved && task.status === 'Pending';
  const canEdit = (profile?.role === 'Admin' || profile?.role === 'Director') && task.status === 'Pending';
  const canDelete = profile?.role === 'Admin' || profile?.role === 'Director';
  const canGiveFeedback = (profile?.role === 'Admin' || profile?.role === 'Director') && (task.status === 'Completed' || task.status === 'Rejected' || task.status === 'Under Review');

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setShowDetail(true);
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <>
      <div
        className="card rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 border"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        onClick={handleCardClick}
      >
        {/* Header */}
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold leading-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
                {task.title}
              </h3>
              <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {task.description}
              </p>
            </div>
            <div className="shrink-0">
              <TaskStatusBadge status={task.status} />
            </div>
          </div>
        </div>

        {/* Info */}
        <div
          className="px-4 sm:px-5 py-3 sm:py-4"
          style={{ backgroundColor: 'var(--bg-elevated)', borderTop: '1px solid var(--border-color)' }}
        >
          {/* Mobile */}
          <div className="flex flex-col gap-2 sm:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 text-accent">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="font-bold text-sm">{task.tokens}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>tokens</span>
              </div>
              <TaskCountdown deadline={task.deadline} status={task.status} />
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {format(new Date(task.deadline), 'MMM d, yyyy')}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {format(new Date(task.deadline), 'h:mm a')}
              </span>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden sm:flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 text-accent">
                <Zap className="w-4 h-4" />
                <span className="font-bold text-sm">{task.tokens}</span>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>tokens</span>
            </div>
            <div className="w-px h-5" style={{ backgroundColor: 'var(--border-color)' }} />
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {format(new Date(task.deadline), 'MMM d, yyyy')}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {format(new Date(task.deadline), 'h:mm a')}
              </span>
            </div>
            <div className="ml-auto">
              <TaskCountdown deadline={task.deadline} status={task.status} />
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && (canMarkDone || canReview || canDirectorApprove || isPendingDirectorApproval || canEdit || canDelete || canGiveFeedback) && (
          <div
            className="px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            {canEdit && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all font-medium border"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}
              >
                <Pencil className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
            {canMarkDone && (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all disabled:opacity-50 font-medium"
              >
                <Send className="w-4 h-4" />
                <span>Mark as Done</span>
              </button>
            )}

            {canReview && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={handleApprove} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-success hover:bg-success/90 text-white rounded-xl transition-all disabled:opacity-50 font-medium">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle className="w-4 h-4" /><span>Approve</span></>}
                </button>
                <button onClick={handleReassign} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all disabled:opacity-50 font-medium">
                  <RotateCcw className="w-4 h-4" /><span>Reassign</span>
                </button>
                <button onClick={handleReject} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-danger hover:bg-danger/90 text-white rounded-xl transition-all disabled:opacity-50 font-medium">
                  <XCircle className="w-4 h-4" /><span>Reject</span>
                </button>
              </div>
            )}

            {canDirectorApprove && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={handleDirectorApprove} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all disabled:opacity-50 font-medium">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ShieldCheck className="w-4 h-4" /><span>Approve for Users</span></>}
                </button>
                <button onClick={handleReject} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-danger hover:bg-danger/90 text-white rounded-xl transition-all disabled:opacity-50 font-medium">
                  <XCircle className="w-4 h-4" /><span>Reject</span>
                </button>
              </div>
            )}

            {isPendingDirectorApproval && profile?.role === 'Admin' && (
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 text-sm font-medium w-full sm:w-auto">
                <Clock className="w-4 h-4" />
                <span>Awaiting Director Approval</span>
              </div>
            )}

            {canGiveFeedback && (
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all font-medium border"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{task.admin_feedback ? 'Edit Feedback' : 'Give Feedback'}</span>
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all font-medium bg-danger/10 text-danger hover:bg-danger/20 sm:ml-auto"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showDetail && <TaskDetailModal task={task} onClose={() => setShowDetail(false)} />}
      {showEditModal && <EditTaskModal task={task} onClose={() => setShowEditModal(false)} />}
      {showSubmitModal && (
        <SubmitTaskModal
          taskTitle={task.title}
          loading={loading}
          onSubmit={handleSubmit}
          onClose={() => setShowSubmitModal(false)}
        />
      )}
      {showFeedbackModal && (
        <FeedbackModal
          taskTitle={task.title}
          existingFeedback={task.admin_feedback}
          submissionNote={task.submission_note}
          loading={loading}
          onSave={handleSaveFeedback}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
      {showDeleteConfirm && (
        <DeleteTaskConfirm
          taskTitle={task.title}
          loading={loading}
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
