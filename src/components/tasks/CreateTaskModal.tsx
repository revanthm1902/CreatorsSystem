import { useState, useEffect } from 'react';
import { X, Save, Calendar, Zap } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTaskModal({ isOpen, onClose }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [tokens, setTokens] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { createTask } = useTaskStore();
  const { users, fetchUsers } = useUserStore();
  const { profile } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  const userOptions = users.filter((u) => u.role === 'User');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!profile) return;

    setLoading(true);
    const result = await createTask({
      title,
      description,
      assigned_to: assignedTo,
      created_by: profile.id,
      deadline: new Date(deadline).toISOString(),
      tokens,
      status: 'Pending',
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setTitle('');
      setDescription('');
      setAssignedTo('');
      setDeadline('');
      setTokens(10);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-800 rounded-2xl border border-surface-600 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-surface-600">
          <h2 className="text-xl font-bold text-white">Create New Task</h2>
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
                  Create Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
