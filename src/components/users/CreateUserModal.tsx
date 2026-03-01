import { useState } from 'react';
import {
  Plus,
  Shield,
  User as UserIcon,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  canCreateAdmin: boolean;
  actorId: string;
  actorName: string;
  createUser: (email: string, password: string, fullName: string, role: 'Admin' | 'User', actorId: string, actorName: string) => Promise<{ error: string | null; employeeId?: string }>;
}

export function CreateUserModal({ isOpen, onClose, canCreateAdmin, actorId, actorName, createUser }: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'User'>('User');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ employeeId: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setLoading(true);

    const result = await createUser(email, password, fullName, role, actorId, actorName);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.employeeId) {
      setSuccess({ employeeId: result.employeeId });
      setEmail('');
      setFullName('');
      setPassword('');
      setRole('User');
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div 
        className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="sm:hidden w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ backgroundColor: 'var(--border-color)' }} />
        <div 
          className="flex items-center justify-between p-5 sm:p-6"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Add New User</h2>
          <button
            onClick={handleClose}
            className="transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {success ? (
          <div className="p-6 space-y-6">
            <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
              <p className="text-success font-medium mb-2">User created successfully!</p>
              <p style={{ color: 'var(--text-primary)' }}>
                Employee ID: <span className="font-mono font-bold">{success.employeeId}</span>
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="john@aryverse.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Temporary Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-12"
                  style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>User will be required to reset this on first login</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Role</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRole('User')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                    role === 'User'
                      ? 'bg-primary border-primary text-white'
                      : ''
                  }`}
                  style={role !== 'User' ? { backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' } : {}}
                >
                  <UserIcon className="w-4 h-4" />
                  User
                </button>
                {canCreateAdmin && (
                  <button
                    type="button"
                    onClick={() => setRole('Admin')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                      role === 'Admin'
                        ? 'bg-accent border-accent text-white'
                        : ''
                    }`}
                    style={role !== 'Admin' ? { backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' } : {}}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 rounded-lg transition-all"
                style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Create User
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
