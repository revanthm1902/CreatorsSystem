import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { TaskCard } from '../tasks/TaskCard';
import { CreateTaskModal } from '../tasks/CreateTaskModal';
import { ActivityFeed } from './ActivityFeed';
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Task Management</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Create and manage tasks for your team</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatPill icon={ClipboardList} label="Total" value={stats.totalTasks} active={statusFilter === 'All'} onClick={() => setStatusFilter('All')} />
        <StatPill icon={Clock} label="Pending" value={stats.pending} color="warning" active={statusFilter === 'Pending'} onClick={() => setStatusFilter('Pending')} />
        <StatPill icon={Filter} label="Review" value={stats.underReview} color="accent" active={statusFilter === 'Under Review'} onClick={() => setStatusFilter('Under Review')} />
        <StatPill icon={CheckCircle} label="Completed" value={stats.completed} color="success" active={statusFilter === 'Completed'} onClick={() => setStatusFilter('Completed')} />
        <StatPill icon={XCircle} label="Rejected" value={stats.rejected} color="danger" active={statusFilter === 'Rejected'} onClick={() => setStatusFilter('Rejected')} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tasks Column */}
        <div className="xl:col-span-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} isAdminView />
            ))}
            {filteredTasks.length === 0 && (
              <div className="col-span-2 text-center py-12" style={{ color: 'var(--text-muted)' }}>
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tasks found</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed Column */}
        <div className="xl:col-span-1">
          <ActivityFeed showPostForm maxItems={20} />
        </div>
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
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
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
      <Icon className={`w-5 h-5 ${!active && color ? colorClasses[color] : ''}`} />
      <div className="text-left">
        <p className="text-lg font-bold">{value}</p>
        <p className="text-xs" style={{ color: active ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{label}</p>
      </div>
    </button>
  );
}
