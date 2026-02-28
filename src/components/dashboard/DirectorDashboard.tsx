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
  KeyRound,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  Loader2,
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

/* ────────── Reset Password Modal ────────── */
interface ResetPasswordModalProps {
  requestId: string;
  email: string;
  users: import('../../types/database').Profile[];
  actorId: string;
  actorName: string;
  resetUserPassword: (userId: string, newPassword: string, requestId: string, actorId: string, actorName: string, userEmail: string) => Promise<{ error: string | null }>;
  onClose: () => void;
}

function ResetPasswordModal({ requestId, email, users, actorId, actorName, resetUserPassword, onClose }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Find the user by email
  const targetUser = users.find((u) => u.email === email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!targetUser) {
      setError('User not found in system. The email may not match any registered user.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await resetUserPassword(targetUser.id, newPassword, requestId, actorId, actorName, email);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="sm:hidden w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ backgroundColor: 'var(--border-color)' }} />

        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-success/20 rounded-full">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Password reset successfully!</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              The user will need to log in with the new temporary password and set their own.
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {!targetUser && (
              <div className="bg-warning/10 border border-warning/30 text-warning rounded-xl p-3 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>No user found with email "<strong>{email}</strong>". The email in the request may not match a registered profile.</span>
              </div>
            )}

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                New Temporary Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all pr-12"
                  style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="Enter new password..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                User will be required to change this on their next login.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl transition-all text-sm font-medium"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !targetUser}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Reset Password
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
