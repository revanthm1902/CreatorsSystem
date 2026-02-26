import { useEffect, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import { TaskCard } from '../components/tasks/TaskCard';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { Plus, ClipboardList, Filter } from 'lucide-react';
import type { TaskStatus } from '../types/database';

export function TasksPage() {
  const { profile } = useAuthStore();
  const { tasks, fetchTasks, subscribeToTasks } = useTaskStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');

  useEffect(() => {
    fetchTasks(profile?.role === 'User' ? profile?.id : undefined, profile?.role);
    const unsubscribe = subscribeToTasks();
    return () => unsubscribe();
  }, [fetchTasks, subscribeToTasks, profile?.id, profile?.role]);

  const filteredTasks = statusFilter === 'All'
    ? tasks
    : tasks.filter((t) => t.status === statusFilter);

  const isAdmin = profile?.role === 'Director' || profile?.role === 'Admin';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-accent" />
            {isAdmin ? 'All Tasks' : 'My Tasks'}
          </h1>
          <p className="text-gray-400 mt-1">
            {isAdmin ? 'Manage and review all tasks' : 'View and complete your assigned tasks'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Task
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-gray-400" />
        <div className="flex gap-2">
          {(['All', 'Pending', 'Under Review', 'Completed', 'Rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-surface-700 text-gray-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isAdminView={isAdmin}
          />
        ))}
        {filteredTasks.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tasks found</p>
          </div>
        )}
      </div>

      {isAdmin && (
        <CreateTaskModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
