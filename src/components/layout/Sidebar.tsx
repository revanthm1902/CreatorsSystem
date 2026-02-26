import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types/database';
import {
  Zap,
  LayoutDashboard,
  ClipboardList,
  Users,
  Trophy,
  LogOut,
  User,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const navItemsByRole: Record<UserRole, NavItem[]> = {
  Director: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: ClipboardList, label: 'All Tasks' },
    { to: '/users', icon: Users, label: 'Manage Users' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  ],
  Admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
    { to: '/users', icon: Users, label: 'Users' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  ],
  User: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'My Tasks' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  ],
};

export function Sidebar() {
  const { profile, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = profile?.role ? navItemsByRole[profile.role] : [];

  return (
    <aside className="w-64 bg-surface-800 border-r border-surface-600 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-surface-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Creators</h1>
            <p className="text-xs text-gray-500">AryVerse System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:bg-surface-700 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
            <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-surface-600 space-y-4">
        <div className="flex items-center gap-3 px-4 py-3 bg-surface-700 rounded-lg">
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500">{profile?.employee_id}</p>
          </div>
          {profile?.role === 'User' && (
            <div className="flex items-center gap-1 text-accent">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-bold">{profile?.total_tokens || 0}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-surface-700 rounded-lg transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
