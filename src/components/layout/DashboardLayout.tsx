import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ActivityButton, ActivityToast } from '../dashboard/ActivityNotification';

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto px-3 py-4 pt-16 sm:px-6 sm:py-6 sm:pt-16 lg:px-8 lg:py-8 lg:pt-8 safe-bottom">
        <div className="float-right sticky top-4 z-40 ml-4">
          <ActivityButton />
        </div>
        <Outlet />
      </main>

      {/* Toast notification for new activities */}
      <ActivityToast />
    </div>
  );
}
