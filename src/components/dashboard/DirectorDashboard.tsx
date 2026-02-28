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
  ShieldAlert,
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

  // Tasks pending director approval (created by admins)
  const pendingApprovalTasks = tasks.filter((t) => !t.director_approved && t.status === 'Pending');

  const stats = {
    totalTasks: tasks.length,
    pendingTasks: tasks.filter((t) => t.status === 'Pending').length,
    underReview: tasks.filter((t) => t.status === 'Under Review').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
    totalUsers: users.filter((u) => u.role === 'User').length,
    totalAdmins: users.filter((u) => u.role === 'Admin').length,
    pendingApproval: pendingApprovalTasks.length,
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold gradient-text">Director Dashboard</h1>
          <p className="text-sm sm:text-base mt-0.5 sm:mt-1" style={{ color: 'var(--text-muted)' }}>
            Welcome back, {profile?.full_name}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all font-medium w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Create Task
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-6 [&>:last-child:nth-child(odd)]:col-span-2 sm:[&>:last-child:nth-child(odd)]:col-span-1">
        <StatCard
          icon={ClipboardList}
          label="Total Tasks"
          value={stats.totalTasks}
          color="primary"
        />
        <StatCard
          icon={ShieldAlert}
          label="Awaiting Approval"
          value={stats.pendingApproval}
          color="warning"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pendingTasks}
          color="accent"
        />
        <StatCard
          icon={TrendingUp}
          label="Under Review"
          value={stats.underReview}
          color="primary"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completed}
          color="success"
        />
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-2.5 sm:gap-6">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="primary" />
        <StatCard icon={Users} label="Admins" value={stats.totalAdmins} color="accent" />
      </div>

      {/* Pending Director Approval */}
      {pendingApprovalTasks.length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Pending Your Approval ({pendingApprovalTasks.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-3 sm:p-4 rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/5">
            {pendingApprovalTasks.slice(0, 4).map((task) => (
              <TaskCard key={task.id} task={task} isAdminView />
            ))}
          </div>
        </div>
      )}

      {/* Top Performers */}
      <div 
        className="card rounded-2xl p-4 sm:p-6"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Zap className="w-5 h-5 text-accent" />
          Top Performers
        </h2>
        <div className="space-y-2 sm:space-y-3">
          {leaderboard.slice(0, 5).map((user, index) => (
            <div
              key={user.id}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all hover:scale-[1.01]"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <span className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl font-bold text-sm sm:text-lg ${
                index === 0 ? 'bg-yellow-500 text-white' :
                index === 1 ? 'bg-gray-400 text-white' :
                index === 2 ? 'bg-orange-500 text-white' :
                'bg-primary/20 text-primary'
              }`}>
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base truncate" style={{ color: 'var(--text-primary)' }}>{user.full_name}</p>
                <p className="text-[10px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>{user.employee_id}</p>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-accent/10 text-accent">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="font-bold text-sm sm:text-base">{user.total_tokens}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Tasks Under Review */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4" style={{ color: 'var(--text-primary)' }}>Tasks Under Review</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {tasks
            .filter((t) => t.status === 'Under Review')
            .slice(0, 4)
            .map((task) => (
              <TaskCard key={task.id} task={task} isAdminView />
            ))}
          {tasks.filter((t) => t.status === 'Under Review').length === 0 && (
            <p style={{ color: 'var(--text-muted)' }} className="col-span-2">No tasks pending review</p>
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
  const gradientClasses = {
    primary: 'stat-gradient-1',
    warning: 'stat-gradient-4',
    accent: 'stat-gradient-2',
    success: 'stat-gradient-3',
    danger: 'stat-gradient-4',
  };

  const iconClasses = {
    primary: 'bg-primary/20 text-primary',
    warning: 'bg-warning/20 text-warning',
    accent: 'bg-accent/20 text-accent',
    success: 'bg-success/20 text-success',
    danger: 'bg-danger/20 text-danger',
  };

  return (
    <div 
      className={`card rounded-2xl p-3 sm:p-6 ${gradientClasses[color]} hover:scale-[1.02] transition-transform cursor-default`}
      style={{ borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-center gap-2.5 sm:gap-4">
        <div className={`w-9 h-9 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center ${iconClasses[color]}`}>
          <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
        </div>
        <div>
          <p className="text-xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          <p className="text-[10px] sm:text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
        </div>
      </div>
    </div>
  );
}
