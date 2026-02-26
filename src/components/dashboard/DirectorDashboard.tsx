import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { useUserStore } from '../../stores/userStore';
import { TaskCard } from '../tasks/TaskCard';
import { CreateTaskModal } from '../tasks/CreateTaskModal';
import {
  Plus,
  ClipboardList,
  Users,
  Clock,
  CheckCircle,
  Zap,
  TrendingUp,
} from 'lucide-react';

export function DirectorDashboard() {
  const { profile } = useAuthStore();
  const { tasks, fetchTasks, subscribeToTasks } = useTaskStore();
  const { users, fetchUsers, leaderboard, fetchLeaderboard } = useUserStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchTasks(undefined, profile?.role);
    fetchUsers();
    fetchLeaderboard();
    const unsubscribe = subscribeToTasks();
    return () => unsubscribe();
  }, [fetchTasks, fetchUsers, fetchLeaderboard, subscribeToTasks, profile?.role]);

  const stats = {
    totalTasks: tasks.length,
    pendingTasks: tasks.filter((t) => t.status === 'Pending').length,
    underReview: tasks.filter((t) => t.status === 'Under Review').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
    totalUsers: users.filter((u) => u.role === 'User').length,
    totalAdmins: users.filter((u) => u.role === 'Admin').length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Director Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Welcome back, {profile?.full_name}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Task
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={ClipboardList}
          label="Total Tasks"
          value={stats.totalTasks}
          color="primary"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pendingTasks}
          color="warning"
        />
        <StatCard
          icon={TrendingUp}
          label="Under Review"
          value={stats.underReview}
          color="accent"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completed}
          color="success"
        />
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="primary" />
        <StatCard icon={Users} label="Admins" value={stats.totalAdmins} color="accent" />
      </div>

      {/* Top Performers */}
      <div className="bg-surface-800 border border-surface-600 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent" />
          Top Performers
        </h2>
        <div className="space-y-3">
          {leaderboard.slice(0, 5).map((user, index) => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-3 bg-surface-700 rounded-lg"
            >
              <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                index === 1 ? 'bg-gray-400/20 text-gray-300' :
                index === 2 ? 'bg-orange-500/20 text-orange-400' :
                'bg-surface-600 text-gray-400'
              }`}>
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="text-white font-medium">{user.full_name}</p>
                <p className="text-xs text-gray-500">{user.employee_id}</p>
              </div>
              <div className="flex items-center gap-1 text-accent">
                <Zap className="w-4 h-4" />
                <span className="font-bold">{user.total_tokens}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Tasks Under Review */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Tasks Under Review</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tasks
            .filter((t) => t.status === 'Under Review')
            .slice(0, 4)
            .map((task) => (
              <TaskCard key={task.id} task={task} isAdminView />
            ))}
          {tasks.filter((t) => t.status === 'Under Review').length === 0 && (
            <p className="text-gray-500 col-span-2">No tasks pending review</p>
          )}
        </div>
      </div>

      <CreateTaskModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}

interface StatCardProps {
  icon: typeof ClipboardList;
  label: string;
  value: number;
  color: 'primary' | 'warning' | 'accent' | 'success' | 'danger';
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
  };

  return (
    <div className="bg-surface-800 border border-surface-600 rounded-xl p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
