import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ActivityButton, ActivityToast } from '../dashboard/ActivityNotification';

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto safe-bottom">
        {/* Mobile header bar — solid backdrop behind hamburger & activity bell */}
        <div 
          className="fixed top-0 left-0 right-0 h-14 z-30 border-b lg:hidden"
          style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        />
        <div className="px-3 pt-16 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pt-8 lg:pb-8">
          <div className="float-right sticky top-4 z-40 ml-4">
            <ActivityButton />
          </div>
          <Outlet />
        </div>
      </main>

      {/* Toast notification for new activities */}
      <ActivityToast />
    </div>
  );
}
