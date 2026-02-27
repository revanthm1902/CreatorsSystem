import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import type { UserRole } from '../../types/database';
import {
  Zap,
  LayoutDashboard,
  ClipboardList,
  Users,
  Trophy,
  LogOut,
  User,
  Sun,
  Moon,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';

// Brand logo component
function BrandLogo({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <img 
      src="/icon.png" 
      alt="Creators Logo" 
      className={`${className} rounded-xl object-cover logo-animate`}
    />
  );
}

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
    { to: '/settings', icon: Settings, label: 'Settings' },
  ],
  Admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
    { to: '/users', icon: Users, label: 'Users' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ],
  User: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'My Tasks' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ],
};

export function Sidebar() {
  const { profile, signOut } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = profile?.role ? navItemsByRole[profile.role] : [];

  return (
    <aside 
      className={`${
        collapsed ? 'w-20' : 'w-72'
      } flex flex-col h-screen sticky top-0 border-r animate-fade-in transition-all duration-300`}
      style={{ 
        backgroundColor: 'var(--bg-card)', 
        borderColor: 'var(--border-color)' 
      }}
    >
      {/* Logo + Collapse toggle */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center w-full' : ''}`}>
          <BrandLogo className="w-10 h-10 shrink-0 shadow-lg" />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-lg font-bold gradient-text leading-tight">Creators</h1>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>AryVerse System</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-primary/10"
            style={{ color: 'var(--text-muted)' }}
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2">
          <button
            onClick={() => setCollapsed(false)}
            className="p-2 rounded-lg transition-colors hover:bg-primary/10"
            style={{ color: 'var(--text-muted)' }}
            title="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 ${collapsed ? 'px-2 py-3' : 'p-4'} space-y-1.5`}>
        {navItems.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              `nav-item flex items-center ${
                collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
              } rounded-xl transition-all group stagger-item ${
                isActive
                  ? 'bg-primary text-white'
                  : 'hover:bg-(--bg-elevated)'
              }`
            }
            style={({ isActive }) => ({ 
              color: isActive ? undefined : 'var(--text-secondary)',
              animationDelay: `${index * 0.05}s`
            })}
            title={collapsed ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? '' : 'group-hover:text-primary'}`} />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div className={`${collapsed ? 'px-2' : 'px-4'} pb-2`}>
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center px-0 py-3' : 'justify-between px-4 py-3'
          } rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]`}
          style={{ 
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-secondary)'
          }}
          title={collapsed ? (theme === 'dark' ? 'Dark Mode' : 'Light Mode') : undefined}
        >
          {!collapsed && (
            <span className="text-sm font-medium">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          )}
          {collapsed ? (
            theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />
          ) : (
            <div 
              className="w-10 h-6 rounded-full flex items-center px-1 transition-all"
              style={{ 
                backgroundColor: theme === 'dark' ? 'var(--color-primary)' : 'var(--bg-hover)'
              }}
            >
              <div 
                className={`w-4 h-4 rounded-full bg-white flex items-center justify-center transition-transform ${
                  theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
                }`}
              >
                {theme === 'dark' ? (
                  <Moon className="w-2.5 h-2.5 text-primary" />
                ) : (
                  <Sun className="w-2.5 h-2.5 text-warning" />
                )}
              </div>
            </div>
          )}
        </button>
      </div>

      {/* User Profile & Logout */}
      <div className={`${collapsed ? 'p-2' : 'p-4'} border-t space-y-2`} style={{ borderColor: 'var(--border-color)' }}>
        <div 
          className={`flex items-center ${collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-4 py-3'} rounded-xl`}
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="w-9 h-9 bg-primary/15 rounded-full flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{profile?.employee_id}</p>
              </div>
              {profile?.role === 'User' && (
                <div className="flex items-center gap-1 text-accent">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-bold">{profile?.total_tokens || 0}</span>
                </div>
              )}
            </>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className={`w-full flex items-center justify-center gap-2 ${collapsed ? 'px-0 py-2' : 'px-4 py-2.5'} rounded-xl transition-all hover:bg-danger/10 hover:text-danger`}
          style={{ color: 'var(--text-muted)' }}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
