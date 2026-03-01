/**
 * SubmitTaskModal — modal for users to submit work and mark a task as done.
 *
 * Single responsibility: collect an optional work summary and trigger submission.
 */

import { useState } from 'react';
import { Send, X } from 'lucide-react';

interface SubmitTaskModalProps {
  taskTitle: string;
  loading: boolean;
  onSubmit: (note: string | undefined) => Promise<void>;
  onClose: () => void;
}

export function SubmitTaskModal({ taskTitle, loading, onSubmit, onClose }: SubmitTaskModalProps) {
  const [submissionNote, setSubmissionNote] = useState('');

  const handleSubmit = async () => {
    await onSubmit(submissionNote || undefined);
    setSubmissionNote('');
  };

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
              <Send className="w-5 h-5 text-primary" />
              Submit Task
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-primary/10" style={{ color: 'var(--text-muted)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Describe what you worked on for "<strong style={{ color: 'var(--text-primary)' }}>{taskTitle}</strong>"
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
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
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
  );
}
