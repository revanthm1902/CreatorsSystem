import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { getMinDateTimeLocal } from '../../lib/dateUtils';
import { format } from 'date-fns';

interface ExtendDeadlineModalProps {
  taskTitle: string;
  currentDeadline: string;
  loading: boolean;
  onExtend: (newDeadline: string) => Promise<void>;
  onClose: () => void;
}

export function ExtendDeadlineModal({
  taskTitle,
  currentDeadline,
  loading,
  onExtend,
  onClose,
}: ExtendDeadlineModalProps) {
  const [newDeadline, setNewDeadline] = useState('');
  const [error, setError] = useState('');

  const minDateTime = getMinDateTimeLocal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newDeadline) {
      setError('Please select a new deadline');
      return;
    }

    if (new Date(newDeadline) <= new Date()) {
      setError('New deadline must be in the future');
      return;
    }

    if (new Date(newDeadline) <= new Date(currentDeadline)) {
      setError('New deadline must be after the current deadline');
      return;
    }

    await onExtend(newDeadline);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div
        className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="modal-pull-indicator sm:hidden" />
        <div
          className="flex items-center justify-between p-4 sm:p-6"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div>
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Extend Deadline
            </h2>
            <p className="text-sm mt-0.5 truncate max-w-60" style={{ color: 'var(--text-muted)' }}>
              {taskTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="transition-colors p-1 rounded-lg hover:bg-primary/10"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Current Deadline</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {format(new Date(currentDeadline), 'MMM d, yyyy — h:mm a')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              <Clock className="w-4 h-4 inline mr-1" />
              New Deadline
            </label>
            <input
              type="datetime-local"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              required
              min={minDateTime}
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg transition-all"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Clock className="w-5 h-5" />
                  Extend
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
