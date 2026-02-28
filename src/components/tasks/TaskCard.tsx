import { useState } from 'react';
import { format } from 'date-fns';
import type { Task } from '../../types/database';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskCountdown } from './TaskCountdown';
import { useTaskStore } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';
import { Zap, CheckCircle, XCircle, Send, ShieldCheck, Clock, X, Calendar, ClipboardList, Pencil, Trash2, MessageSquare, FileText, RotateCcw } from 'lucide-react';
import { EditTaskModal } from './EditTaskModal';

interface TaskCardProps {
  task: Task;
  showActions?: boolean;
  isAdminView?: boolean;
}

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

function TaskDetailModal({ task, isOpen, onClose }: TaskDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull indicator on mobile */}
        <div className="modal-pull-indicator sm:hidden" />
        {/* Header */}
        <div 
          className="flex items-start justify-between p-4 sm:p-6 gap-4"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <ClipboardList className="w-5 h-5 text-accent shrink-0" />
              <h2 className="text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {task.title}
              </h2>
            </div>
            <TaskStatusBadge status={task.status} />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-primary/10 shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Description / Responsibility
            </h3>
            <p 
              className="text-base leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--text-primary)' }}
            >
              {task.description || 'No description provided'}
            </p>
          </div>

          {/* Details Grid */}
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Tokens</p>
              <div className="flex items-center gap-1.5 text-accent">
                <Zap className="w-4 h-4" />
                <span className="font-bold text-lg">{task.tokens}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Status</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{task.status}</p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Deadline</p>
              <div className="flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <Calendar className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm font-medium">{format(new Date(task.deadline), 'MMM d, yyyy')}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {format(new Date(task.deadline), 'h:mm a')}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Created</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {format(new Date(task.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Time Remaining */}
          {task.status === 'Pending' && (
            <div 
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Time Remaining
              </span>
              <TaskCountdown deadline={task.deadline} status={task.status} />
            </div>
          )}

          {/* Submitted/Approved dates */}
          {task.submitted_at && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>Submitted</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {format(new Date(task.submitted_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          )}
          {task.approved_at && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>Approved</span>
              <span className="text-success">
                {format(new Date(task.approved_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          )}

          {/* Submission Note */}
          {task.submission_note && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <FileText className="w-4 h-4" />
                User's Work Summary
              </h3>
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-elevated)', borderLeft: '3px solid var(--color-primary)' }}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                  {task.submission_note}
                </p>
              </div>
            </div>
          )}

          {/* Admin/Director Feedback */}
          {task.admin_feedback && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <MessageSquare className="w-4 h-4" />
                Feedback
              </h3>
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-elevated)', borderLeft: '3px solid var(--color-success)' }}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                  {task.admin_feedback}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-4 sm:p-6"
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl font-medium transition-all"
            style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskCard({ task, showActions = true, isAdminView = false }: TaskCardProps) {
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submissionNote, setSubmissionNote] = useState('');
  const [feedbackText, setFeedbackText] = useState(task.admin_feedback || '');
  const { updateTaskStatus, approveTask, rejectTask, reassignTask, approveTaskByDirector, addFeedback, deleteTask } = useTaskStore();
  const { profile } = useAuthStore();

  const handleMarkDone = async () => {
    if (!profile) return;
    setLoading(true);
    await updateTaskStatus(task.id, 'Under Review', profile.id, new Date().toISOString(), submissionNote || undefined);
    setLoading(false);
    setShowSubmitModal(false);
    setSubmissionNote('');
  };

  const handleApprove = async () => {
    if (!profile) return;
    setLoading(true);
    await approveTask(task.id, task.assigned_to, task.tokens, task.deadline, profile.id);
    setLoading(false);
  };

  const handleReject = async () => {
    if (!profile) return;
    setLoading(true);
    await rejectTask(task.id, profile.id);
    setLoading(false);
  };

  const handleReassign = async () => {
    if (!profile) return;
    setLoading(true);
    await reassignTask(task.id, profile.id);
    setLoading(false);
  };

  const handleDirectorApprove = async () => {
    if (!profile) return;
    setLoading(true);
    await approveTaskByDirector(task.id, profile.id);
    setLoading(false);
  };

  const handleSaveFeedback = async () => {
    if (!profile) return;
    setLoading(true);
    await addFeedback(task.id, feedbackText, profile.id);
    setLoading(false);
    setShowFeedbackModal(false);
  };

  const handleDelete = async () => {
    if (!profile) return;
    setLoading(true);
    await deleteTask(task.id, profile.id);
    setLoading(false);
    setShowDeleteConfirm(false);
  };

  const canMarkDone = profile?.role === 'User' && task.status === 'Pending';
  const canReview = isAdminView && task.status === 'Under Review';
  const canDirectorApprove = profile?.role === 'Director' && !task.director_approved && task.status === 'Pending';
  const isPendingDirectorApproval = !task.director_approved && task.status === 'Pending';
  const canEdit = (profile?.role === 'Admin' || profile?.role === 'Director') && task.status === 'Pending';
  const canDelete = profile?.role === 'Admin' || profile?.role === 'Director';
  const canGiveFeedback = (profile?.role === 'Admin' || profile?.role === 'Director') && (task.status === 'Completed' || task.status === 'Rejected' || task.status === 'Under Review');

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) return;
    setShowDetail(true);
  };

  return (
    <>
      <div 
        className="card rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 border"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        onClick={handleCardClick}
      >
        {/* Header Section */}
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 
                className="text-base font-semibold leading-tight mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                {task.title}
              </h3>
              <p 
                className="text-sm line-clamp-2 leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {task.description}
              </p>
            </div>
            <div className="shrink-0">
              <TaskStatusBadge status={task.status} />
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div 
          className="px-4 sm:px-5 py-3 sm:py-4"
          style={{ backgroundColor: 'var(--bg-elevated)', borderTop: '1px solid var(--border-color)' }}
        >
          {/* Mobile: compact 2-row layout */}
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

          {/* Desktop: horizontal layout */}
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

        {/* Actions Section */}
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
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-success hover:bg-success/90 text-white rounded-xl transition-all disabled:opacity-50 font-medium"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleReassign}
                  disabled={loading}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all disabled:opacity-50 font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reassign</span>
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-danger hover:bg-danger/90 text-white rounded-xl transition-all disabled:opacity-50 font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            )}

            {canDirectorApprove && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDirectorApprove}
                  disabled={loading}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all disabled:opacity-50 font-medium"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Approve for Users</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-danger hover:bg-danger/90 text-white rounded-xl transition-all disabled:opacity-50 font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
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
                onClick={() => { setFeedbackText(task.admin_feedback || ''); setShowFeedbackModal(true); }}
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

      {/* Detail Modal */}
      <TaskDetailModal 
        task={task} 
        isOpen={showDetail} 
        onClose={() => setShowDetail(false)} 
      />

      {/* Edit Modal */}
      <EditTaskModal
        task={task}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />

      {/* Submit / Mark Done Modal */}
      {showSubmitModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setShowSubmitModal(false)}
        >
          <div 
            className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-pull-indicator sm:hidden" />
            <div className="p-4 sm:p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Send className="w-5 h-5 text-primary" />
                  Submit Task
                </h2>
                <button onClick={() => setShowSubmitModal(false)} className="p-2 rounded-lg hover:bg-primary/10" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Describe what you worked on for "<strong style={{ color: 'var(--text-primary)' }}>{task.title}</strong>"
              </p>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Work Summary <span style={{ color: 'var(--text-muted)' }}>(optional but recommended)</span>
                </label>
                <textarea
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="Describe what you did, files changed, links to work, etc..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-medium transition-all"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkDone}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit for Review
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setShowFeedbackModal(false)}
        >
          <div 
            className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-pull-indicator sm:hidden" />
            <div className="p-4 sm:p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <MessageSquare className="w-5 h-5 text-success" />
                  {task.admin_feedback ? 'Edit Feedback' : 'Give Feedback'}
                </h2>
                <button onClick={() => setShowFeedbackModal(false)} className="p-2 rounded-lg hover:bg-primary/10" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Feedback for "<strong style={{ color: 'var(--text-primary)' }}>{task.title}</strong>"
              </p>
            </div>

            {/* Show user's submission note if available */}
            {task.submission_note && (
              <div className="px-4 sm:px-6 pt-4">
                <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <FileText className="w-3.5 h-3.5" />
                  User's Work Summary
                </p>
                <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderLeft: '3px solid var(--color-primary)' }}>
                  {task.submission_note}
                </div>
              </div>
            )}

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Constructive Feedback
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share constructive feedback about this task — what was done well, areas for improvement, suggestions..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-medium transition-all"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFeedback}
                  disabled={loading || !feedbackText.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-success hover:bg-success/90 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      Save Feedback
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-pull-indicator sm:hidden" />
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-danger/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-danger" />
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Delete Task?</h2>
              <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                This will permanently delete
              </p>
              <p className="text-sm font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>"{task.title}"</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-medium transition-all"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
