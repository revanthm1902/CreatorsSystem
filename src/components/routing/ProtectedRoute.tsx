import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading, initialized } = useAuthStore();

  // Show loading state
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Force password reset for temporary passwords
  if (profile?.is_temporary_password) {
    return <Navigate to="/reset-password" replace />;
  }

  // Check role permissions
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
