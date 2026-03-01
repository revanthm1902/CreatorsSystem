import { useState } from 'react';
import { submitPasswordResetRequest } from '../../services/userService';
import { KeyRound, ArrowLeft, CheckCircle, Mail } from 'lucide-react';

export function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [resetEmail, setResetEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleSubmitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setSubmitting(true);
    setResetError('');

    try {
      const { error: submitError } = await submitPasswordResetRequest(resetEmail);

      if (submitError) {
        setResetError('Failed to submit request. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setResetError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        {submitted ? (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-success/20 rounded-full">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Request Submitted!</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Your Director has been notified. They will review your request and set a new temporary password for you.
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              You'll be able to log in once your password has been reset.
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-warning/20 rounded-full mb-3">
                <KeyRound className="w-7 h-7 text-warning" />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Forgot Password?</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Enter your email and your Director will be notified to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmitReset} className="space-y-4">
              {resetError && (
                <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 text-sm">
                  {resetError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Your Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                    placeholder="you@aryverse.com"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all text-sm font-medium"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !resetEmail.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-sm"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
