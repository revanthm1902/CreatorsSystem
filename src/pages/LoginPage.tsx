import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { submitPasswordResetRequest } from '../services/userService';
import { LogIn, Eye, EyeOff, HelpCircle, Sun, Moon, KeyRound, ArrowLeft, CheckCircle, Mail } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn, loading } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await signIn(email, password);
    
    if (result.error) {
      setError(result.error);
      return;
    }

    // Navigate based on password reset requirement
    if (result.requiresPasswordReset) {
      navigate('/reset-password', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-main)' }}
    >
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-xl transition-all hover:scale-110 active:scale-95 animate-fade-in"
        style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', boxShadow: '0 2px 10px var(--shadow-color)' }}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>



      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div 
          className="card rounded-3xl shadow-2xl p-6 sm:p-8"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-block mb-4">
              <img 
                src="/icon.jpeg" 
                alt="Creators Logo" 
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-xl logo-animate mx-auto"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Creators System</h1>
            <p className="mt-2" style={{ color: 'var(--text-muted)' }}>AryVerse Task & Performance Manager</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-4 text-sm flex items-start gap-3 animate-fade-in">
                <div className="w-5 h-5 rounded-full bg-danger/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold">!</span>
                </div>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)', 
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
                placeholder="you@aryverse.com"
              />
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all pr-12"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors hover:bg-primary/20"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="w-full text-center text-sm font-medium transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <span className="hover:text-primary transition-colors flex items-center justify-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                Forgot Password?
              </span>
            </button>
          </form>

          <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
            Contact your Admin for account access
          </p>

          <Link
            to="/setup"
            className="flex items-center justify-center gap-2 text-primary hover:text-primary-hover text-sm mt-4 transition-colors font-medium"
          >
            <HelpCircle className="w-4 h-4" />
            First time? View Setup Guide
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  );
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
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
