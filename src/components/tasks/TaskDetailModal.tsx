/**
 * TaskDetailModal — read-only detail view of a task.
 *
 * Single responsibility: display all task fields in a modal overlay.
 */

import { format } from 'date-fns';
import type { Task } from '../../types/database';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskCountdown } from './TaskCountdown';
import {
  Zap,
  X,
  Calendar,
  ClipboardList,
  MessageSquare,
  FileText,
} from 'lucide-react';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
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
              <h2
                className="text-xl font-bold truncate"
                style={{ color: 'var(--text-primary)' }}
              >
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
            <h3
              className="text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
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
              <p
                className="text-xs font-medium mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Tokens
              </p>
              <div className="flex items-center gap-1.5 text-accent">
                <Zap className="w-4 h-4" />
                <span className="font-bold text-lg">{task.tokens}</span>
              </div>
            </div>
            <div>
              <p
                className="text-xs font-medium mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Status
              </p>
              <p
                className="font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {task.status}
              </p>
            </div>
            <div>
              <p
                className="text-xs font-medium mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Deadline
              </p>
              <div
                className="flex items-center gap-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                <Calendar
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                />
                <span className="text-sm font-medium">
                  {format(new Date(task.deadline), 'MMM d, yyyy')}
                </span>
              </div>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                {format(new Date(task.deadline), 'h:mm a')}
              </p>
            </div>
            <div>
              <p
                className="text-xs font-medium mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Created
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
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
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
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
                {format(
                  new Date(task.submitted_at),
                  'MMM d, yyyy h:mm a',
                )}
              </span>
            </div>
          )}
          {task.approved_at && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>Approved</span>
              <span className="text-success">
                {format(
                  new Date(task.approved_at),
                  'MMM d, yyyy h:mm a',
                )}
              </span>
            </div>
          )}

          {/* Submission Note */}
          {task.submission_note && (
            <div>
              <h3
                className="text-sm font-medium mb-2 flex items-center gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <FileText className="w-4 h-4" />
                User's Work Summary
              </h3>
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderLeft: '3px solid var(--color-primary)',
                }}
              >
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {task.submission_note}
                </p>
              </div>
            </div>
          )}

          {/* Admin/Director Feedback */}
          {task.admin_feedback && (
            <div>
              <h3
                className="text-sm font-medium mb-2 flex items-center gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <MessageSquare className="w-4 h-4" />
                Feedback
              </h3>
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderLeft: '3px solid var(--color-success)',
                }}
              >
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--text-primary)' }}
                >
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
            style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-secondary)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
