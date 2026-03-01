import { useEffect, useState, useMemo } from 'react';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '../stores/authStore';
import { CreateUserModal } from '../components/users/CreateUserModal';
import { GiveTokensModal } from '../components/users/GiveTokensModal';
import {
  Users,
  Plus,
  Trash2,
  Shield,
  User as UserIcon,
  Crown,
  Zap,
  Gift,
} from 'lucide-react';
import type { UserRole, Profile } from '../types/database';

type RoleFilter = 'All' | 'Director' | 'Admin' | 'User';

export function UsersPage() {
  const { users, loading, initialized, fetchUsers, createUser, deleteUser, giveTokens } = useUserStore();
  const { profile } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [giveTokensTarget, setGiveTokensTarget] = useState<Profile | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'All') return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const roleCounts = useMemo(() => ({
    All: users.length,
    Director: users.filter((u) => u.role === 'Director').length,
    Admin: users.filter((u) => u.role === 'Admin').length,
    User: users.filter((u) => u.role === 'User').length,
  }), [users]);

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
        return 'text-gray-400 border-transparent';
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This will also remove their tasks, points, and activity logs.')) {
      const result = await deleteUser(userId);
      if (result.error) {
        alert(`Failed to delete user: ${result.error}`);
      }
    }
  };

  const canManageAdmins = profile?.role === 'Director';

  // Director can give tokens to Admins and Users; Admins can give to Users only
  const canGiveTokens = (user: Profile) => {
    if (user.id === profile?.id) return false; // can't give to yourself
    if (profile?.role === 'Director') return user.role === 'Admin' || user.role === 'User';
    if (profile?.role === 'Admin') return user.role === 'User';
    return false;
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 sm:gap-3" style={{ color: 'var(--text-primary)' }}>
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
            User Management
          </h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-base" style={{ color: 'var(--text-secondary)' }}>Manage team members and their roles</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Role Filter Toggles */}
      <div className="flex flex-wrap gap-2">
        {(['All', 'Director', 'Admin', 'User'] as RoleFilter[]).map((filterRole) => {
          const isActive = roleFilter === filterRole;
          const count = roleCounts[filterRole];
          const iconMap: Record<RoleFilter, React.ReactNode> = {
            All: <Users className="w-3.5 h-3.5" />,
            Director: <Crown className="w-3.5 h-3.5" />,
            Admin: <Shield className="w-3.5 h-3.5" />,
            User: <UserIcon className="w-3.5 h-3.5" />,
          };
          const activeColors: Record<RoleFilter, string> = {
            All: 'bg-primary text-white',
            Director: 'bg-yellow-500/90 text-white',
            Admin: 'bg-accent text-white',
            User: 'bg-gray-500 text-white',
          };
          return (
            <button
              key={filterRole}
              onClick={() => setRoleFilter(filterRole)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                isActive ? activeColors[filterRole] : ''
              }`}
              style={!isActive ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' } : {}}
            >
              {iconMap[filterRole]}
              {filterRole === 'All' ? 'All' : `${filterRole}s`}
              <span
                className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-bold ${
                  isActive ? 'bg-white/20' : ''
                }`}
                style={!isActive ? { backgroundColor: 'var(--bg-elevated)' } : {}}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Users Table (desktop) / Cards (mobile) */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        {/* Desktop table header */}
        <div 
          className={`hidden md:grid ${roleFilter === 'User' || roleFilter === 'All' ? 'grid-cols-[2.5fr_1.5fr_1fr_0.8fr_0.8fr]' : 'grid-cols-[2.5fr_1.5fr_1fr_0.8fr]'} gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider`}
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          <span>User</span>
          <span>Employee ID</span>
          <span>Role</span>
          {(roleFilter === 'User' || roleFilter === 'All') && <span>Tokens</span>}
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {loading && !initialized ? (
            <div className="p-8 flex justify-center">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{roleFilter === 'All' ? 'No users found' : `No ${roleFilter}s found`}</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
            <div
              key={user.id}
              className="transition-all hover:brightness-105"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {/* Desktop row */}
              <div className={`hidden md:grid ${roleFilter === 'User' || roleFilter === 'All' ? 'grid-cols-[2.5fr_1.5fr_1fr_0.8fr_0.8fr]' : 'grid-cols-[2.5fr_1.5fr_1fr_0.8fr]'} gap-4 items-center px-5 py-3.5`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-primary/15 rounded-full flex items-center justify-center shrink-0">
                    {getRoleIcon(user.role)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate text-sm" style={{ color: 'var(--text-primary)' }}>{user.full_name}</p>
                    {user.is_temporary_password && (
                      <span className="text-[11px] text-warning">Pending password reset</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{user.employee_id}</span>
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass(user.role)}`}>
                    {getRoleIcon(user.role)}
                    {user.role}
                  </span>
                </div>
                {(roleFilter === 'User' || roleFilter === 'All') && (
                  <div className="flex items-center gap-1 text-accent">
                    {(user.role === 'User' || user.role === 'Admin') ? (
                      <>
                        <Zap className="w-4 h-4" />
                        <span className="font-medium text-sm">{user.total_tokens}</span>
                      </>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-end gap-1">
                  {/* Give Tokens button */}
                  {canGiveTokens(user) && (
                    <button
                      onClick={() => setGiveTokensTarget(user)}
                      className="p-2 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Give tokens"
                    >
                      <Gift className="w-4 h-4" />
                    </button>
                  )}
                  {(user.role === 'User' || (canManageAdmins && user.role === 'Admin')) && user.id !== profile?.id ? (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="w-8" />
                  )}
                </div>
              </div>

              {/* Mobile card */}
              <div className="md:hidden flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center shrink-0">
                  {getRoleIcon(user.role)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate text-sm" style={{ color: 'var(--text-primary)' }}>{user.full_name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{user.employee_id}</span>
                    {(user.role === 'User' || user.role === 'Admin') && (
                      <div className="flex items-center gap-1 text-accent text-xs">
                        <Zap className="w-3 h-3" />
                        <span className="font-medium">{user.total_tokens}</span>
                      </div>
                    )}
                  </div>
                  {user.is_temporary_password && (
                    <span className="text-[11px] text-warning mt-0.5 block">Pending password reset</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canGiveTokens(user) && (
                    <button
                      onClick={() => setGiveTokensTarget(user)}
                      className="p-2 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Give tokens"
                    >
                      <Gift className="w-4 h-4" />
                    </button>
                  )}
                  {(user.role === 'User' || (canManageAdmins && user.role === 'Admin')) && user.id !== profile?.id && (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          canCreateAdmin={canManageAdmins}
          actorId={profile?.id || ''}
          actorName={profile?.full_name || ''}
          createUser={createUser}
        />
      )}

      {giveTokensTarget && (
        <GiveTokensModal
          target={giveTokensTarget}
          actorId={profile?.id || ''}
          actorName={profile?.full_name || ''}
          giveTokens={giveTokens}
          onClose={() => setGiveTokensTarget(null)}
        />
      )}
    </div>
  );
}
