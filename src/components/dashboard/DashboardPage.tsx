import { useAuthStore } from '../../stores/authStore';
import { DirectorDashboard } from './DirectorDashboard';
import { AdminDashboard } from './AdminDashboard';
import { UserDashboard } from './UserDashboard';

export function DashboardPage() {
  const { profile } = useAuthStore();

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  switch (profile.role) {
    case 'Director':
      return <DirectorDashboard />;
    case 'Admin':
      return <AdminDashboard />;
    case 'User':
      return <UserDashboard />;
    default:
      return <UserDashboard />;
  }
}
