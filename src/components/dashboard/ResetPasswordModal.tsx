/**
 * ResetPasswordModal — modal for directors/admins to set a new temporary password.
 *
 * Single responsibility: collect a new password and call the reset function
 * for a given user email / password-reset request.
 */

import { useState } from 'react';
import type { Profile } from '../../types/database';
import {
  KeyRound,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface ResetPasswordModalProps {
  requestId: string;
  email: string;
  users: Profile[];
  actorId: string;
  actorName: string;
  resetUserPassword: (
    userId: string,
    newPassword: string,
    requestId: string,
    actorId: string,
    actorName: string,
    userEmail: string,
  ) => Promise<{ error: string | null }>;
  onClose: () => void;
}

export function ResetPasswordModal({
  requestId,
  email,
  users,
  actorId,
  actorName,
  resetUserPassword,
  onClose,
}: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const targetUser = users.find((u) => u.email === email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!targetUser) {
      setError('User not found in system. The email may not match any registered user.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await resetUserPassword(targetUser.id, newPassword, requestId, actorId, actorName, email);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="sm:hidden w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ backgroundColor: 'var(--border-color)' }} />

        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-success/20 rounded-full">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Password reset successfully!</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              The user will need to log in with the new temporary password and set their own.
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {!targetUser && (
              <div className="bg-warning/10 border border-warning/30 text-warning rounded-xl p-3 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>No user found with email "<strong>{email}</strong>". The email in the request may not match a registered profile.</span>
              </div>
            )}

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                New Temporary Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all pr-12"
                  style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="Enter new password..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                User will be required to change this on their next login.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl transition-all text-sm font-medium"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !targetUser}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Reset Password
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
