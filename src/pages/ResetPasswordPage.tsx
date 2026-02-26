import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { updatePassword } = useAuthStore();
  const navigate = useNavigate();

  const passwordRequirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'Contains number', met: /\d/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every((r) => r.met);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await updatePassword(newPassword);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface-800 rounded-2xl shadow-2xl p-8 border border-surface-600">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-warning/20 rounded-full mb-4">
              <KeyRound className="w-8 h-8 text-warning" />
            </div>
            <h1 className="text-2xl font-bold text-white">Reset Your Password</h1>
            <p className="text-gray-400 mt-2">
              Create a new secure password to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {passwordRequirements.map((req) => (
                <div
                  key={req.label}
                  className={`flex items-center gap-2 text-sm ${
                    req.met ? 'text-success' : 'text-gray-500'
                  }`}
                >
                  <CheckCircle className={`w-4 h-4 ${req.met ? 'opacity-100' : 'opacity-30'}`} />
                  {req.label}
                </div>
              ))}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full px-4 py-3 bg-surface-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? 'border-success'
                      : 'border-danger'
                    : 'border-surface-600'
                }`}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !allRequirementsMet || !passwordsMatch}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  Set New Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
