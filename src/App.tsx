import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { UsersPage } from './pages/UsersPage';
import { TasksPage } from './pages/TasksPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ProtectedRoute } from './components/routing/ProtectedRoute';

function App() {
  const { initialize, initialized, loading, user, profile } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show loading state
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Creators System...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            user && profile && !profile.is_temporary_password ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/reset-password"
          element={
            user && profile?.is_temporary_password ? (
              <ResetPasswordPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute allowedRoles={['Director', 'Admin']}>
                <TasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['Director', 'Admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Redirect root to dashboard or login */}
        <Route
          path="/"
          element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
        />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
