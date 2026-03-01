import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { useUserStore } from '../../stores/userStore';
import { TaskCard } from '../tasks/TaskCard';
import { CreateTaskModal } from '../tasks/CreateTaskModal';
import { StatCard } from '../ui/StatCard';
import { ResetPasswordModal } from './ResetPasswordModal';

import {
  Plus,
  ClipboardList,
  Users,
  Clock,
  CheckCircle,
  Zap,
  TrendingUp,
  ShieldAlert,
  KeyRound,
  X,
} from 'lucide-react';

export function DirectorDashboard() {
  const { profile } = useAuthStore();
  const { tasks, fetchTasks, subscribeToTasks } = useTaskStore();
  const { users, fetchUsers, leaderboard, fetchLeaderboard, passwordResetRequests, fetchPasswordResetRequests, resetUserPassword, dismissPasswordResetRequest } = useUserStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetModal, setResetModal] = useState<{ requestId: string; email: string } | null>(null);

  useEffect(() => {
    fetchTasks(undefined, profile?.role);
    fetchUsers();
    fetchLeaderboard();
    fetchPasswordResetRequests();
    const unsubscribe = subscribeToTasks();
    return () => unsubscribe();
  }, [fetchTasks, fetchUsers, fetchLeaderboard, fetchPasswordResetRequests, subscribeToTasks, profile?.role]);

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
        <StatCard icon={ClipboardList} label="Total Tasks" value={stats.totalTasks} color="primary" variant="gradient" />
        <StatCard icon={ShieldAlert} label="Awaiting Approval" value={stats.pendingApproval} color="warning" variant="gradient" />
        <StatCard icon={Clock} label="Pending" value={stats.pendingTasks} color="accent" variant="gradient" />
        <StatCard icon={TrendingUp} label="Under Review" value={stats.underReview} color="primary" variant="gradient" />
        <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="success" variant="gradient" />
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-2.5 sm:gap-6">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="primary" variant="gradient" />
        <StatCard icon={Users} label="Admins" value={stats.totalAdmins} color="accent" variant="gradient" />
      </div>

      {/* Password Reset Requests */}
      {passwordResetRequests.length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <KeyRound className="w-5 h-5 text-warning" />
            Password Reset Requests ({passwordResetRequests.length})
          </h2>
          <div className="space-y-2.5 p-3 sm:p-4 rounded-xl border-2 border-dashed border-warning/30 bg-warning/5">
            {passwordResetRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 text-warning" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{request.email}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Requested {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                  <button
                    onClick={() => setResetModal({ requestId: request.id, email: request.email })}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-lg transition-all"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Set Password
                  </button>
                  <button
                    onClick={() => dismissPasswordResetRequest(request.id)}
                    className="p-2 rounded-lg transition-all hover:bg-danger/10"
                    style={{ color: 'var(--text-muted)' }}
                    title="Dismiss request"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Reset Password Modal */}
      {resetModal && (
        <ResetPasswordModal
          requestId={resetModal.requestId}
          email={resetModal.email}
          users={users}
          actorId={profile?.id || ''}
          actorName={profile?.full_name || ''}
          resetUserPassword={resetUserPassword}
          onClose={() => setResetModal(null)}
        />
      )}
    </div>
  );
}
