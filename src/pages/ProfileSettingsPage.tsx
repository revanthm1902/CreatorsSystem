import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { 
  User, 
  Lock, 
  Mail, 
  Phone, 
  Calendar, 
  Linkedin, 
  Github, 
  FileText, 
  Save, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface FormData {
  full_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  resume_url: string;
}

export function ProfileSettingsPage() {
  const { profile, updateProfile, updatePassword, fetchProfile } = useAuthStore();
  
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    date_of_birth: '',
    email: '',
    phone: '',
    linkedin_url: '',
    github_url: '',
    resume_url: '',
  });

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        date_of_birth: profile.date_of_birth || '',
        email: profile.email || '',
        phone: profile.phone || '',
        linkedin_url: profile.linkedin_url || '',
        github_url: profile.github_url || '',
        resume_url: profile.resume_url || '',
      });
    }
  }, [profile]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);

    const result = await updateProfile({
      full_name: formData.full_name,
      date_of_birth: formData.date_of_birth || null,
      email: formData.email || null,
      phone: formData.phone || null,
      linkedin_url: formData.linkedin_url || null,
      github_url: formData.github_url || null,
      resume_url: formData.resume_url || null,
    });

    setProfileLoading(false);

    if (result.error) {
      setProfileMessage({ type: 'error', text: result.error });
    } else {
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      await fetchProfile();
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    if (passwords.newPassword.length < 8) {
      setPasswordLoading(false);
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordLoading(false);
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    const result = await updatePassword(passwords.newPassword);

    setPasswordLoading(false);

    if (result.error) {
      setPasswordMessage({ type: 'error', text: result.error });
    } else {
      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswords({ newPassword: '', confirmPassword: '' });
    }
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary";
  const labelClasses = "block text-sm font-medium mb-2";

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Profile Settings</h1>
        <p style={{ color: 'var(--text-muted)' }} className="mt-2">
          Manage your personal information and account security
        </p>
      </div>

      {/* Employee Info Card */}
      <div 
        className="card rounded-2xl p-6 mb-6 stagger-item"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {profile?.full_name}
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              {profile?.employee_id} • {profile?.role}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information Form */}
      <form onSubmit={handleProfileSubmit}>
        <div 
          className="card rounded-2xl p-6 mb-6 stagger-item"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', animationDelay: '50ms' }}
        >
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <User className="w-5 h-5 text-primary" />
            Personal Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClasses} style={{ color: 'var(--text-secondary)' }}>
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className={`${inputClasses} pl-11`}
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClasses} style={{ color: 'var(--text-secondary)' }}>
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  className={`${inputClasses} pl-11`}
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            <div>
              <label className={labelClasses} style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`${inputClasses} pl-11`}
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div>
              <label className={labelClasses} style={{ color: 'var(--text-secondary)' }}>
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className={`${inputClasses} pl-11`}
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div>
              <label className={labelClasses} style={{ color: 'var(--text-secondary)' }}>
                LinkedIn / Portfolio URL
              </label>
              <div className="relative">
                <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                  className={`${inputClasses} pl-11`}
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
            </div>

            <div>
              <label className={labelClasses} style={{ color: 'var(--text-secondary)' }}>
                GitHub URL
              </label>
              <div className="relative">
                <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="url"
                  value={formData.github_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, github_url: e.target.value }))}
                  className={`${inputClasses} pl-11`}
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="https://github.com/username"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClasses} style={{ color: 'var(--text-secondary)' }}>
                Resume / CV Link (Open Access)
              </label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="url"
                  value={formData.resume_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, resume_url: e.target.value }))}
                  className={`${inputClasses} pl-11`}
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="https://drive.google.com/your-resume-link"
                />
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Provide a publicly accessible link to your resume (e.g., Google Drive, Dropbox)
              </p>
            </div>
          </div>

          {profileMessage && (
            <div 
              className={`mt-5 p-4 rounded-xl flex items-center gap-3 animate-fade-in ${
                profileMessage.type === 'success' 
                  ? 'bg-success/10 border border-success/30 text-success' 
                  : 'bg-danger/10 border border-danger/30 text-danger'
              }`}
            >
              {profileMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {profileMessage.text}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={profileLoading}
              className="btn-glow px-6 py-3 bg-linear-to-r from-primary to-accent text-white rounded-xl font-medium flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              {profileLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </form>

      {/* Password Change Form */}
      <form onSubmit={handlePasswordSubmit}>
        <div 
          className="card rounded-2xl p-6 stagger-item"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', animationDelay: '100ms' }}
        >
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Lock className="w-5 h-5 text-accent" />
            Change Password
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClasses} style={{ color: 'var(--text-secondary)' }}>
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showPasswords.newPassword ? 'text' : 'password'}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                  className={`${inputClasses} pl-11 pr-11`}
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="••••••••"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, newPassword: !prev.newPassword }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPasswords.newPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClasses} style={{ color: 'var(--text-secondary)' }}>
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showPasswords.confirmPassword ? 'text' : 'password'}
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`${inputClasses} pl-11 pr-11`}
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="••••••••"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPasswords.confirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
            Password must be at least 8 characters long
          </p>

          {passwordMessage && (
            <div 
              className={`mt-5 p-4 rounded-xl flex items-center gap-3 animate-fade-in ${
                passwordMessage.type === 'success' 
                  ? 'bg-success/10 border border-success/30 text-success' 
                  : 'bg-danger/10 border border-danger/30 text-danger'
              }`}
            >
              {passwordMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {passwordMessage.text}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={passwordLoading || !passwords.newPassword || !passwords.confirmPassword}
              className="px-6 py-3 bg-accent text-white rounded-xl font-medium flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              {passwordLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
              Update Password
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
