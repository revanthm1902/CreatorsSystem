import { useEffect, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '../stores/authStore';
import {
  Users,
  Plus,
  Trash2,
  Shield,
  User as UserIcon,
  Crown,
  Zap,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { UserRole } from '../types/database';

export function UsersPage() {
  const { users, loading, initialized, fetchUsers, createUser, deleteUser } = useUserStore();
  const { profile } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'Director':
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'Admin':
        return <Shield className="w-4 h-4 text-accent" />;
      default:
        return <UserIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'Director':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'Admin':
        return 'bg-accent/10 text-accent border-accent/30';
      default:
        return 'bg-surface-600 text-gray-300 border-surface-500';
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteUser(userId);
    }
  };

  const canManageAdmins = profile?.role === 'Director';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-accent" />
            User Management
          </h1>
          <p className="text-gray-400 mt-1">Manage team members and their roles</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-surface-800 border border-surface-600 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 p-4 bg-surface-700 text-sm font-medium text-gray-400">
          <span>User</span>
          <span>Employee ID</span>
          <span>Role</span>
          <span>Tokens</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-surface-600">
          {loading && !initialized ? (
            <div className="p-8 flex justify-center">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            users.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 p-4 items-center hover:bg-surface-700/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  {getRoleIcon(user.role)}
                </div>
                <div>
                  <p className="text-white font-medium">{user.full_name}</p>
                  {user.is_temporary_password && (
                    <span className="text-xs text-warning">Pending password reset</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-400 font-mono text-sm">{user.employee_id}</span>
              </div>
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass(user.role)}`}>
                  {getRoleIcon(user.role)}
                  {user.role}
                </span>
              </div>
              <div className="flex items-center gap-1 text-accent">
                <Zap className="w-4 h-4" />
                <span className="font-medium">{user.total_tokens}</span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                {(user.role === 'User' || (canManageAdmins && user.role === 'Admin')) && user.id !== profile?.id && (
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 text-gray-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                    title="Delete user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        canCreateAdmin={canManageAdmins}
        createUser={createUser}
      />
    </div>
  );
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  canCreateAdmin: boolean;
  createUser: (email: string, password: string, fullName: string, role: 'Admin' | 'User') => Promise<{ error: string | null; employeeId?: string }>;
}

function CreateUserModal({ isOpen, onClose, canCreateAdmin, createUser }: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'User'>('User');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ employeeId: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setLoading(true);

    const result = await createUser(email, password, fullName, role);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.employeeId) {
      setSuccess({ employeeId: result.employeeId });
      setEmail('');
      setFullName('');
      setPassword('');
      setRole('User');
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-800 rounded-2xl border border-surface-600 w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-surface-600">
          <h2 className="text-xl font-bold text-white">Add New User</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {success ? (
          <div className="p-6 space-y-6">
            <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
              <p className="text-success font-medium mb-2">User created successfully!</p>
              <p className="text-white">
                Employee ID: <span className="font-mono font-bold">{success.employeeId}</span>
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="john@aryverse.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Temporary Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">User will be required to reset this on first login</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRole('User')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                    role === 'User'
                      ? 'bg-primary border-primary text-white'
                      : 'bg-surface-700 border-surface-600 text-gray-300 hover:border-primary/50'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  User
                </button>
                {canCreateAdmin && (
                  <button
                    type="button"
                    onClick={() => setRole('Admin')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                      role === 'Admin'
                        ? 'bg-accent border-accent text-white'
                        : 'bg-surface-700 border-surface-600 text-gray-300 hover:border-accent/50'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
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
                    <Plus className="w-5 h-5" />
                    Create User
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
