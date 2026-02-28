import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Shield,
  Users,
  User,
  ArrowRight,
  Database,
  Key,
  CheckCircle,
  Copy,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

export function SetupGuidePage() {
  const navigate = useNavigate();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const sqlSnippets = {
    createDirector: `-- Step 1: Create a Director in Supabase Auth Dashboard first
-- Then run this SQL to create their profile:

INSERT INTO public.profiles (id, full_name, role, is_temporary_password)
VALUES (
  'YOUR_USER_UUID_FROM_AUTH', -- Get this from Authentication > Users
  'Director Name',
  'Director',
  false -- Set to false so they can login directly
);`,
    
    createAdmin: `-- Create an Admin user (run after creating auth user)
INSERT INTO public.profiles (id, full_name, role, is_temporary_password)
VALUES (
  'ADMIN_USER_UUID',
  'Admin Name', 
  'Admin',
  true -- They must reset password on first login
);`,

    createUser: `-- Create a regular User (run after creating auth user)
INSERT INTO public.profiles (id, full_name, role, is_temporary_password)
VALUES (
  'USER_UUID',
  'User Name',
  'User', 
  true -- They must reset password on first login
);`,
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4" style={{ backgroundColor: 'var(--bg-main)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Creators System</h1>
          </div>
          <p className="text-base sm:text-lg" style={{ color: 'var(--text-muted)' }}>Setup Guide & Login Instructions</p>
        </div>

        {/* Warning Banner */}
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h3 className="text-warning font-medium">First-Time Setup Required</h3>
            <p className="text-warning/80 text-sm mt-1">
              This app requires Supabase backend setup before you can log in. 
              Follow the steps below to create your database and first user.
            </p>
          </div>
        </div>

        {/* Role Overview */}
        <div className="rounded-xl border p-4 sm:p-6 mb-8" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Users className="w-5 h-5 text-accent" />
            User Roles Overview
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-lg p-4 border border-purple-500/30" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-purple-400">Director</span>
              </div>
              <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• Full system access</li>
                <li>• Manage all users</li>
                <li>• View all tasks & analytics</li>
                <li>• Create Admins & Users</li>
              </ul>
            </div>

            <div className="rounded-lg p-4 border border-blue-500/30" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-blue-400">Admin</span>
              </div>
              <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• Create & assign tasks</li>
                <li>• Set deadlines & tokens</li>
                <li>• Approve/reject submissions</li>
                <li>• View team performance</li>
              </ul>
            </div>

            <div className="rounded-lg p-4 border border-green-500/30" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-green-400" />
                <span className="font-semibold text-green-400">User</span>
              </div>
              <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• View assigned tasks</li>
                <li>• Submit completed work</li>
                <li>• Track earned tokens</li>
                <li>• View leaderboard</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Database className="w-5 h-5 text-accent" />
            Setup Steps
          </h2>

          {/* Step 1 */}
          <div className="rounded-xl border p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
              <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Create Supabase Project</h3>
            </div>
            <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
              Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                supabase.com <ExternalLink className="w-3 h-3" />
              </a> and create a new project. Copy your project URL and anon key.
            </p>
            <div className="rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <p style={{ color: 'var(--text-secondary)' }}># .env file</p>
              <p className="text-green-400">VITE_SUPABASE_URL=https://your-project.supabase.co</p>
              <p className="text-green-400">VITE_SUPABASE_ANON_KEY=your-anon-key-here</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
              <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Run Database Schema</h3>
            </div>
            <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
              In Supabase Dashboard, go to <strong style={{ color: 'var(--text-primary)' }}>SQL Editor</strong> and run the contents of 
              <code className="px-2 py-1 rounded mx-1 text-accent" style={{ backgroundColor: 'var(--bg-elevated)' }}>supabase/schema.sql</code>
            </p>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <CheckCircle className="w-4 h-4 text-success" />
              This creates tables, triggers, and RLS policies
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
              <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Create First Director Account</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="mb-2" style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>A)</strong> Go to Supabase Dashboard → <strong style={{ color: 'var(--text-primary)' }}>Authentication</strong> → <strong style={{ color: 'var(--text-primary)' }}>Users</strong> → <strong style={{ color: 'var(--text-primary)' }}>Add User</strong>
                </p>
                <p className="ml-4" style={{ color: 'var(--text-muted)' }}>Enter email and password for your Director account.</p>
              </div>
              
              <div>
                <p className="mb-2" style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>B)</strong> Copy the user's UUID and run this SQL:
                </p>
                <div className="relative">
                  <pre className="rounded-lg p-4 font-mono text-sm overflow-x-auto" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
{sqlSnippets.createDirector}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(sqlSnippets.createDirector, 0)}
                    className="absolute top-2 right-2 p-2 rounded-lg transition-colors hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-card)' }}
                  >
                    {copiedIndex === 0 ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="rounded-xl border p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
              <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Login & Create More Users</h3>
            </div>
            <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
              Once logged in as Director, you can create Admins and Users from the <strong style={{ color: 'var(--text-primary)' }}>Manage Users</strong> page.
              The system will auto-generate Employee IDs like <code className="px-2 py-1 rounded text-accent" style={{ backgroundColor: 'var(--bg-elevated)' }}>AV-2026-001</code>.
            </p>
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Key className="w-4 h-4 inline mr-2 text-warning" />
                <strong className="text-warning">Temporary Password Flow:</strong>
              </p>
              <ul className="text-sm ml-6 space-y-1" style={{ color: 'var(--text-muted)' }}>
                <li>• Admin creates user with a temporary password</li>
                <li>• User logs in with temporary password</li>
                <li>• System forces password reset on first login</li>
                <li>• After reset, user accesses their dashboard</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Additional SQL Examples */}
        <div className="rounded-xl border p-4 sm:p-6 mb-8" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Additional SQL Examples</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Create Admin:</p>
              <div className="relative">
                <pre className="rounded-lg p-3 font-mono text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
{sqlSnippets.createAdmin}
                </pre>
                <button
                  onClick={() => copyToClipboard(sqlSnippets.createAdmin, 1)}
                  className="absolute top-2 right-2 p-1.5 rounded transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  {copiedIndex === 1 ? (
                    <CheckCircle className="w-3 h-3 text-success" />
                  ) : (
                    <Copy className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Create User:</p>
              <div className="relative">
                <pre className="rounded-lg p-3 font-mono text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
{sqlSnippets.createUser}
                </pre>
                <button
                  onClick={() => copyToClipboard(sqlSnippets.createUser, 2)}
                  className="absolute top-2 right-2 p-1.5 rounded transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  {copiedIndex === 2 ? (
                    <CheckCircle className="w-3 h-3 text-success" />
                  ) : (
                    <Copy className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="rounded-xl border border-danger/30 p-4 sm:p-6 mb-8" style={{ backgroundColor: 'var(--bg-card)' }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <AlertTriangle className="w-5 h-5 text-danger" />
            Troubleshooting Login Issues
          </h2>
          
          <div className="space-y-4 text-sm">
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Error: "Profile not found"</p>
              <p style={{ color: 'var(--text-muted)' }}>
                This means you created a user in <strong style={{ color: 'var(--text-primary)' }}>Authentication → Users</strong> but didn't run the SQL to create their profile in the <strong style={{ color: 'var(--text-primary)' }}>profiles</strong> table.
              </p>
              <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
                <strong className="text-accent">Fix:</strong> Run the SQL INSERT statement with the user's UUID from the auth table.
              </p>
            </div>

            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Error: "Invalid login credentials"</p>
              <p style={{ color: 'var(--text-muted)' }}>
                The email or password is incorrect. Check that:
              </p>
              <ul className="mt-2 ml-4 list-disc space-y-1" style={{ color: 'var(--text-muted)' }}>
                <li>Email is exactly as entered in Supabase Auth</li>
                <li>Password matches (case-sensitive)</li>
                <li>User email is confirmed (if email confirmation is enabled)</li>
              </ul>
            </div>

            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Stuck on loading screen</p>
              <p style={{ color: 'var(--text-muted)' }}>
                Check browser console for errors. Common causes:
              </p>
              <ul className="mt-2 ml-4 list-disc space-y-1" style={{ color: 'var(--text-muted)' }}>
                <li>Missing or incorrect <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-card)' }}>.env</code> variables</li>
                <li>Supabase project URL/key mismatch</li>
                <li>Database schema not applied</li>
              </ul>
            </div>

            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Check your Supabase setup</p>
              <p style={{ color: 'var(--text-muted)' }}>
                In SQL Editor, verify your profile exists:
              </p>
              <pre className="rounded p-2 mt-2 text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
SELECT * FROM public.profiles;</pre>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors w-full sm:w-auto justify-center"
          >
            Go to Login
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
            Make sure you've completed all setup steps before logging in
          </p>
        </div>
      </div>
    </div>
  );
}
