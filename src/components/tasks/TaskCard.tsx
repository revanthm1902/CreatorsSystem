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
import { ApproveTaskModal } from './ApproveTaskModal';
import { DeleteTaskConfirm } from './DeleteTaskConfirm';
import { EditTaskModal } from './EditTaskModal';
import { ExtendDeadlineModal } from './ExtendDeadlineModal';
import { GHIssueBadge, LinkIssueButton } from './GHIssueBadge';
import { useTaskStore } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
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
  User,
} from 'lucide-react';
import { loadGHSettings } from '../../lib/githubSettings';

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
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);

  const { updateTaskStatus, approveTask, rejectTask, reassignTask, approveTaskByDirector, addFeedback, deleteTask, extendDeadline } = useTaskStore();
  const { profile } = useAuthStore();
  const { users } = useUserStore();
  const gh = loadGHSettings();
  const ghActive = gh.enabled && !!gh.token;
  const isGHIssue = !!task.pow_url?.match(/github\.com\/[^/]+\/[^/]+\/issues\/\d+/);

  const assignedUser = users.find((u) => u.id === task.assigned_to);

  // ── Action handlers ──────────────────────────────────────────

  const handleSubmit = async (note: string | undefined, powUrl?: string) => {
    if (!profile) return;
    setLoading(true);
    try {
      await updateTaskStatus(task.id, 'Under Review', profile.id, new Date().toISOString(), note, powUrl);
      setShowSubmitModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bonusTokens: number) => {
    if (!profile) return;
    setLoading(true);
    try {
      await approveTask(task.id, task.assigned_to, task.tokens, task.deadline, profile.id, bonusTokens);
      setShowApproveModal(false);
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

  const handleExtendDeadline = async (newDeadline: string) => {
    if (!profile) return;
    setLoading(true);
    try {
      const result = await extendDeadline(task.id, newDeadline, profile.id);
      if (!result.error) {
        setShowExtendModal(false);
      }
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
  const canExtendDeadline = (profile?.role === 'Admin' || profile?.role === 'Director') && task.status === 'Pending';
  const canGiveFeedback = (profile?.role === 'Admin' || profile?.role === 'Director') && (task.status === 'Completed' || task.status === 'Rejected' || task.status === 'Under Review');
  const canLinkIssue = ghActive && (profile?.role === 'Admin' || profile?.role === 'Director') && task.status === 'Completed';
  const isDeadlineExtended = !!task.original_deadline;
  const isForeignTask = profile && task.created_by !== profile.id;
  const foreignCreatorName = isForeignTask ? (users.find(u => u.id === task.created_by)?.full_name || 'another admin') : '';

  const confirmForeignTask = (action: string) =>
    !isForeignTask || window.confirm(`This task was assigned by ${foreignCreatorName}. ${action} anyway?`);

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
            <div className="shrink-0 flex items-center gap-2">
              {isDeadlineExtended && (
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  Extended
                </span>
              )}
              <TaskStatusBadge status={task.status} />
              {isGHIssue && <GHIssueBadge url={task.pow_url!} />}
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
            {isAdminView && assignedUser && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {assignedUser.full_name}
                </span>
              </div>
            )}
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
            {isAdminView && assignedUser && (
              <>
                <div className="w-px h-5" style={{ backgroundColor: 'var(--border-color)' }} />
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {assignedUser.full_name}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (canMarkDone || canReview || canDirectorApprove || isPendingDirectorApproval || canEdit || canExtendDeadline || canDelete || canGiveFeedback || canLinkIssue) && (
          <div
            className="px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            {canEdit && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium border"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            {canMarkDone && (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all disabled:opacity-50 text-xs font-medium"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Mark as Done</span>
              </button>
            )}

            {canReview && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={() => confirmForeignTask('Approve') && setShowApproveModal(true)} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-success hover:bg-success/90 text-white rounded-lg transition-all disabled:opacity-50 text-xs font-medium">
                  {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" /><span>Approve</span></>}
                </button>
                <button onClick={handleReassign} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all disabled:opacity-50 text-xs font-medium">
                  <RotateCcw className="w-3.5 h-3.5" /><span>Reassign</span>
                </button>
                <button onClick={handleReject} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-danger hover:bg-danger/90 text-white rounded-lg transition-all disabled:opacity-50 text-xs font-medium">
                  <XCircle className="w-3.5 h-3.5" /><span>Reject</span>
                </button>
              </div>
            )}

            {canDirectorApprove && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={handleDirectorApprove} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all disabled:opacity-50 text-xs font-medium">
                  {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ShieldCheck className="w-3.5 h-3.5" /><span>Approve for Users</span></>}
                </button>
                <button onClick={handleReject} disabled={loading} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-danger hover:bg-danger/90 text-white rounded-lg transition-all disabled:opacity-50 text-xs font-medium">
                  <XCircle className="w-3.5 h-3.5" /><span>Reject</span>
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
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium border"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{task.admin_feedback ? 'Edit Feedback' : 'Give Feedback'}</span>
              </button>
            )}

            {canLinkIssue && (
              <LinkIssueButton
                currentUrl={task.pow_url}
                onSave={async url => { await useTaskStore.getState().linkPowUrl(task.id, url); }}
                onUnlink={task.pow_url ? async () => { await useTaskStore.getState().linkPowUrl(task.id, ''); } : undefined}
              />
            )}

            {canExtendDeadline && (
              <button
                onClick={() => confirmForeignTask('Extend deadline') && setShowExtendModal(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/30"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Extend Deadline</span>
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20 sm:ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
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
      {showApproveModal && (
        <ApproveTaskModal
          taskTitle={task.title}
          baseTokens={task.tokens}
          deadline={task.deadline}
          submissionNote={task.submission_note}
          loading={loading}
          onApprove={handleApprove}
          onClose={() => setShowApproveModal(false)}
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
      {showExtendModal && (
        <ExtendDeadlineModal
          taskTitle={task.title}
          currentDeadline={task.deadline}
          loading={loading}
          onExtend={handleExtendDeadline}
          onClose={() => setShowExtendModal(false)}
        />
      )}
    </>
  );
}
