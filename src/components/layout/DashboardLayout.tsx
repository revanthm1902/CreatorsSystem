import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ActivityButton, ActivityToast } from '../dashboard/ActivityNotification';
import { RefreshCw } from 'lucide-react';

export function DashboardLayout() {
  const handleHardRefresh = () => {
    // Hard refresh: bypass cache on all platforms
    window.location.reload();
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto safe-bottom">
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

      {/* Hard Refresh FAB — fixed bottom-right */}
      <button
        onClick={handleHardRefresh}
        className="fixed bottom-5 right-5 z-50 p-3 rounded-full shadow-lg border transition-all hover:scale-110 active:scale-95 group"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
        title="Hard Refresh"
        aria-label="Hard refresh page"
      >
        <RefreshCw
          className="w-5 h-5 transition-transform group-hover:rotate-180"
          style={{ color: 'var(--text-secondary)' }}
        />
      </button>

      {/* Toast notification for new activities */}
      <ActivityToast />
    </div>
  );
}
