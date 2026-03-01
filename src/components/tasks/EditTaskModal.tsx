import { useState, useEffect } from 'react';
import { X, Save, Calendar, Zap } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import { getMinDateTimeLocal } from '../../lib/dateUtils';
import type { Task } from '../../types/database';

interface EditTaskModalProps {
  onClose: () => void;
  task: Task;
}

function formatDeadlineForInput(isoDate: string): string {
  const d = new Date(isoDate);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EditTaskModal({ onClose, task }: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [assignedTo, setAssignedTo] = useState(task.assigned_to);
  const [deadline, setDeadline] = useState(formatDeadlineForInput(task.deadline));
  const [tokens, setTokens] = useState(task.tokens);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { editTask } = useTaskStore();
  const { users, fetchUsers, loading: usersLoading } = useUserStore();
  const { profile } = useAuthStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const userOptions = users.filter((u) => u.role === 'User');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!profile) return;

    // Validate deadline is not in the past
    if (new Date(deadline) <= new Date()) {
      setError('Deadline must be in the future');
      return;
    }

    setLoading(true);
    try {
      const result = await editTask(
        task.id,
        {
          title,
          description,
          deadline,
          tokens,
          assigned_to: assignedTo,
        },
        profile.id,
        profile.role
      );

      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Compute minimum datetime (current time)
  const minDateTime = getMinDateTimeLocal();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="modal-pull-indicator sm:hidden" />
        <div className="flex items-center justify-between p-4 sm:p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Edit Task</h2>
            {profile?.role === 'Admin' && (
              <p className="text-xs text-amber-400 mt-1">Editing will require Director re-approval</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="transition-colors p-1 rounded-lg hover:bg-primary/10"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              placeholder="Describe the task..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Assign To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              required
              disabled={usersLoading && userOptions.length === 0}
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              <option value="">{usersLoading && userOptions.length === 0 ? 'Loading users...' : 'Select a user'}</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Calendar className="w-4 h-4 inline mr-1" />
                Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                min={minDateTime}
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Zap className="w-4 h-4 inline mr-1" />
                Token Value
              </label>
              <input
                type="number"
                value={tokens}
                onChange={(e) => setTokens(parseInt(e.target.value) || 0)}
                min={0}
                max={1000}
                required
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
