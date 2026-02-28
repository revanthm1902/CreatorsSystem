import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { TaskCard } from '../tasks/TaskCard';
import { CreateTaskModal } from '../tasks/CreateTaskModal';

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
        <StatPill icon={ClipboardList} label="Total" value={stats.totalTasks} active={statusFilter === 'All'} onClick={() => setStatusFilter('All')} />
        <StatPill icon={Clock} label="Pending" value={stats.pending} color="warning" active={statusFilter === 'Pending'} onClick={() => setStatusFilter('Pending')} />
        <StatPill icon={Filter} label="Review" value={stats.underReview} color="accent" active={statusFilter === 'Under Review'} onClick={() => setStatusFilter('Under Review')} />
        <StatPill icon={CheckCircle} label="Completed" value={stats.completed} color="success" active={statusFilter === 'Completed'} onClick={() => setStatusFilter('Completed')} />
        <StatPill icon={XCircle} label="Rejected" value={stats.rejected} color="danger" active={statusFilter === 'Rejected'} onClick={() => setStatusFilter('Rejected')} />
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

      <CreateTaskModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}

interface StatPillProps {
  icon: typeof ClipboardList;
  label: string;
  value: number;
  color?: 'warning' | 'accent' | 'success' | 'danger';
  active?: boolean;
  onClick?: () => void;
}

function StatPill({ icon: Icon, label, value, color, active, onClick }: StatPillProps) {
  const colorClasses = {
    warning: 'text-warning',
    accent: 'text-accent',
    success: 'text-success',
    danger: 'text-danger',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl transition-all border ${
        active
          ? 'bg-primary text-white border-primary'
          : 'hover:border-primary/30'
      }`}
      style={!active ? {
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)'
      } : undefined}
    >
      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${!active && color ? colorClasses[color] : ''}`} />
      <div className="text-left">
        <p className="text-base sm:text-lg font-bold">{value}</p>
        <p className="text-[10px] sm:text-xs" style={{ color: active ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{label}</p>
      </div>
    </button>
  );
}
