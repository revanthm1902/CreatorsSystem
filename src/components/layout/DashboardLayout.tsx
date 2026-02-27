import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ActivityButton, ActivityToast } from '../dashboard/ActivityNotification';

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Top Bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-end px-8 py-3 border-b"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <ActivityButton />
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>

      {/* Toast notification for new activities */}
      <ActivityToast />
    </div>
  );
}
