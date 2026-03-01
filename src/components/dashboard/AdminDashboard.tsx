import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { TaskCard } from '../tasks/TaskCard';
import { CreateTaskModal } from '../tasks/CreateTaskModal';
import { StatCard } from '../ui/StatCard';

import {
  Plus,
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import type { TaskStatus } from '../../types/database';

export function AdminDashboard() {
  const { profile } = useAuthStore();
  const { tasks, fetchTasks, subscribeToTasks } = useTaskStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');

  useEffect(() => {
    fetchTasks(undefined, profile?.role);
    const unsubscribe = subscribeToTasks();
    return () => unsubscribe();
  }, [fetchTasks, subscribeToTasks, profile?.role]);

  const stats = {
    totalTasks: tasks.length,
    pending: tasks.filter((t) => t.status === 'Pending').length,
    underReview: tasks.filter((t) => t.status === 'Under Review').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
    rejected: tasks.filter((t) => t.status === 'Rejected').length,
  };

  const filteredTasks = statusFilter === 'All'
    ? tasks
    : tasks.filter((t) => t.status === statusFilter);

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Task Management</h1>
          <p className="text-sm mt-0.5 sm:mt-1" style={{ color: 'var(--text-secondary)' }}>Create and manage tasks for your team</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Create Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-4 [&>:last-child:nth-child(odd)]:col-span-2 sm:[&>:last-child:nth-child(odd)]:col-span-1">
        <StatCard icon={ClipboardList} label="Total" value={stats.totalTasks} active={statusFilter === 'All'} onClick={() => setStatusFilter('All')} />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="warning" active={statusFilter === 'Pending'} onClick={() => setStatusFilter('Pending')} />
        <StatCard icon={Filter} label="Review" value={stats.underReview} color="accent" active={statusFilter === 'Under Review'} onClick={() => setStatusFilter('Under Review')} />
        <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="success" active={statusFilter === 'Completed'} onClick={() => setStatusFilter('Completed')} />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="danger" active={statusFilter === 'Rejected'} onClick={() => setStatusFilter('Rejected')} />
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredTasks.map((task) => (
          <TaskCard key={task.id} task={task} isAdminView />
        ))}
        {filteredTasks.length === 0 && (
          <div className="col-span-full text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tasks found</p>
          </div>
        )}
      </div>

      {showCreateModal && <CreateTaskModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
