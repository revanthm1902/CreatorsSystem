import { useState, useEffect } from 'react';
import { X, Save, Calendar, Zap } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import type { Task } from '../../types/database';

interface EditTaskModalProps {
  isOpen: boolean;
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

export function EditTaskModal({ isOpen, onClose, task }: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [assignedTo, setAssignedTo] = useState(task.assigned_to);
  const [deadline, setDeadline] = useState(formatDeadlineForInput(task.deadline));
  const [tokens, setTokens] = useState(task.tokens);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { editTask } = useTaskStore();
  const { users, fetchUsers } = useUserStore();
  const { profile } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      // Reset form to match latest task data when modal opens
    }
  }, [isOpen, fetchUsers]);

  // Sync form fields when the task prop changes (e.g., modal reopened for a different task)
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setAssignedTo(task.assigned_to);
    setDeadline(formatDeadlineForInput(task.deadline));
    setTokens(task.tokens);
    setError('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

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
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Compute minimum datetime (current time)
  const minDateTime = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  })();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-800 rounded-2xl border border-surface-600 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-surface-600">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Task</h2>
            {profile?.role === 'Admin' && (
              <p className="text-xs text-amber-400 mt-1">Editing will require Director re-approval</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              placeholder="Describe the task..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Assign To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              required
              className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="">Select a user</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                min={minDateTime}
                className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-surface-700 hover:bg-surface-600 text-gray-300 rounded-lg transition-all"
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
