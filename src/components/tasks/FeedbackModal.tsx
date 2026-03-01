/**
 * FeedbackModal — modal for admins/directors to give constructive feedback on a task.
 *
 * Single responsibility: display submission note + collect and save feedback text.
 */

import { useState } from 'react';
import { MessageSquare, FileText, X } from 'lucide-react';

interface FeedbackModalProps {
  taskTitle: string;
  existingFeedback: string | null;
  submissionNote: string | null;
  loading: boolean;
  onSave: (feedback: string) => Promise<void>;
  onClose: () => void;
}

export function FeedbackModal({
  taskTitle,
  existingFeedback,
  submissionNote,
  loading,
  onSave,
  onClose,
}: FeedbackModalProps) {
  const [feedbackText, setFeedbackText] = useState(existingFeedback || '');

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
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
              {existingFeedback ? 'Edit Feedback' : 'Give Feedback'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-primary/10" style={{ color: 'var(--text-muted)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Feedback for "<strong style={{ color: 'var(--text-primary)' }}>{taskTitle}</strong>"
          </p>
        </div>

        {/* Show user's submission note if available */}
        {submissionNote && (
          <div className="px-4 sm:px-6 pt-4">
            <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <FileText className="w-3.5 h-3.5" />
              User's Work Summary
            </p>
            <div
              className="rounded-lg p-3 text-sm"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderLeft: '3px solid var(--color-primary)' }}
            >
              {submissionNote}
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
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(feedbackText)}
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
  );
}
