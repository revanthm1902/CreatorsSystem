import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ActivityButton, ActivityToast } from '../dashboard/ActivityNotification';

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
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
