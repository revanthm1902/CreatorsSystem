import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SetupGuidePage } from './pages/SetupGuidePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { UsersPage } from './pages/UsersPage';
import { TasksPage } from './pages/TasksPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ProtectedRoute } from './components/routing/ProtectedRoute';

function App() {
  const { initialize, initialized, user, profile } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Only show loading during initial auth check, not during login
  if (!initialized) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-main)' }}
      >
        <div className="text-center animate-scale-in">
          <img 
            src="/icon.jpeg" 
            alt="Creators Logo" 
            className="w-20 h-20 rounded-2xl mx-auto mb-6 shadow-xl logo-animate"
          />
          <p className="font-medium animate-pulse-soft" style={{ color: 'var(--text-muted)' }}>Loading Creators System...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/setup" element={<SetupGuidePage />} />
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
          <Route path="/settings" element={<ProfileSettingsPage />} />
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
