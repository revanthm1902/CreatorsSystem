/**
 * DeleteTaskConfirm — confirmation dialog before permanently deleting a task.
 *
 * Single responsibility: show a danger confirmation prompt and trigger deletion.
 */

import { Trash2 } from 'lucide-react';

interface DeleteTaskConfirmProps {
  taskTitle: string;
  isOpen: boolean;
  loading: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DeleteTaskConfirm({ taskTitle, isOpen, loading, onConfirm, onClose }: DeleteTaskConfirmProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
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
          <p className="text-sm font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>"{taskTitle}"</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
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
  );
}
