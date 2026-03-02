import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ActivityButton, ActivityToast } from '../dashboard/ActivityNotification';
import { RefreshCw, Github, Phone, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export function DashboardLayout() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Nudge non-admin, non-Non-Technical users for missing GitHub URL or phone
  const isTechUser = profile?.role === 'User' && profile.department !== 'Non-Technical';
  const missingGh = isTechUser && !profile.github_url;
  const missingPhone = profile?.role === 'User' && !profile.phone;
  const showNudge = !nudgeDismissed && (missingGh || missingPhone);

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

          {showNudge && (
            <div className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
              {missingGh ? <Github className="w-5 h-5 shrink-0" style={{ color: 'var(--text-secondary)' }} /> : <Phone className="w-5 h-5 shrink-0" style={{ color: 'var(--text-secondary)' }} />}
              <span style={{ color: 'var(--text-secondary)' }}>
                {missingGh && missingPhone
                  ? <>Add your GitHub profile & phone number in <button onClick={() => navigate('/settings')} className="underline font-medium" style={{ color: 'var(--color-primary)' }}>Settings</button> for smooth functioning.</>
                  : missingGh
                    ? <>Add your GitHub profile in <button onClick={() => navigate('/settings')} className="underline font-medium" style={{ color: 'var(--color-primary)' }}>Settings</button> so admins can auto-assign tasks to you.</>
                    : <>Add your phone/WhatsApp number in <button onClick={() => navigate('/settings')} className="underline font-medium" style={{ color: 'var(--color-primary)' }}>Settings</button> for smooth communication.</>}
              </span>
              <button onClick={() => setNudgeDismissed(true)} className="ml-auto p-1 rounded hover:bg-primary/10 shrink-0" style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

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
