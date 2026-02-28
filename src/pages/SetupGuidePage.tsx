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
    <div className="min-h-screen bg-surface-900 py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Creators System</h1>
          </div>
          <p className="text-gray-400 text-base sm:text-lg">Setup Guide & Login Instructions</p>
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
        <div className="bg-surface-800 rounded-xl border border-surface-600 p-4 sm:p-6 mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            User Roles Overview
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-surface-700 rounded-lg p-4 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-purple-400">Director</span>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Full system access</li>
                <li>• Manage all users</li>
                <li>• View all tasks & analytics</li>
                <li>• Create Admins & Users</li>
              </ul>
            </div>

            <div className="bg-surface-700 rounded-lg p-4 border border-blue-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-blue-400">Admin</span>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Create & assign tasks</li>
                <li>• Set deadlines & tokens</li>
                <li>• Approve/reject submissions</li>
                <li>• View team performance</li>
              </ul>
            </div>

            <div className="bg-surface-700 rounded-lg p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-green-400" />
                <span className="font-semibold text-green-400">User</span>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
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
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-accent" />
            Setup Steps
          </h2>

          {/* Step 1 */}
          <div className="bg-surface-800 rounded-xl border border-surface-600 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
              <h3 className="text-lg font-medium text-white">Create Supabase Project</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                supabase.com <ExternalLink className="w-3 h-3" />
              </a> and create a new project. Copy your project URL and anon key.
            </p>
            <div className="bg-surface-700 rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto">
              <p className="text-gray-300"># .env file</p>
              <p className="text-green-400">VITE_SUPABASE_URL=https://your-project.supabase.co</p>
              <p className="text-green-400">VITE_SUPABASE_ANON_KEY=your-anon-key-here</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-surface-800 rounded-xl border border-surface-600 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
              <h3 className="text-lg font-medium text-white">Run Database Schema</h3>
            </div>
            <p className="text-gray-400 mb-4">
              In Supabase Dashboard, go to <strong className="text-white">SQL Editor</strong> and run the contents of 
              <code className="bg-surface-700 px-2 py-1 rounded mx-1 text-accent">supabase/schema.sql</code>
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <CheckCircle className="w-4 h-4 text-success" />
              This creates tables, triggers, and RLS policies
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-surface-800 rounded-xl border border-surface-600 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
              <h3 className="text-lg font-medium text-white">Create First Director Account</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 mb-2">
                  <strong className="text-white">A)</strong> Go to Supabase Dashboard → <strong className="text-white">Authentication</strong> → <strong className="text-white">Users</strong> → <strong className="text-white">Add User</strong>
                </p>
                <p className="text-gray-400 ml-4">Enter email and password for your Director account.</p>
              </div>
              
              <div>
                <p className="text-gray-400 mb-2">
                  <strong className="text-white">B)</strong> Copy the user's UUID and run this SQL:
                </p>
                <div className="relative">
                  <pre className="bg-surface-700 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
{sqlSnippets.createDirector}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(sqlSnippets.createDirector, 0)}
                    className="absolute top-2 right-2 p-2 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors"
                  >
                    {copiedIndex === 0 ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-surface-800 rounded-xl border border-surface-600 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
              <h3 className="text-lg font-medium text-white">Login & Create More Users</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Once logged in as Director, you can create Admins and Users from the <strong className="text-white">Manage Users</strong> page.
              The system will auto-generate Employee IDs like <code className="bg-surface-700 px-2 py-1 rounded text-accent">AV-2026-001</code>.
            </p>
            <div className="bg-surface-700 rounded-lg p-4">
              <p className="text-sm text-gray-300 mb-2">
                <Key className="w-4 h-4 inline mr-2 text-warning" />
                <strong className="text-warning">Temporary Password Flow:</strong>
              </p>
              <ul className="text-sm text-gray-400 ml-6 space-y-1">
                <li>• Admin creates user with a temporary password</li>
                <li>• User logs in with temporary password</li>
                <li>• System forces password reset on first login</li>
                <li>• After reset, user accesses their dashboard</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Additional SQL Examples */}
        <div className="bg-surface-800 rounded-xl border border-surface-600 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Additional SQL Examples</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Create Admin:</p>
              <div className="relative">
                <pre className="bg-surface-700 rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto">
{sqlSnippets.createAdmin}
                </pre>
                <button
                  onClick={() => copyToClipboard(sqlSnippets.createAdmin, 1)}
                  className="absolute top-2 right-2 p-1.5 bg-surface-600 hover:bg-surface-500 rounded transition-colors"
                >
                  {copiedIndex === 1 ? (
                    <CheckCircle className="w-3 h-3 text-success" />
                  ) : (
                    <Copy className="w-3 h-3 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-2">Create User:</p>
              <div className="relative">
                <pre className="bg-surface-700 rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto">
{sqlSnippets.createUser}
                </pre>
                <button
                  onClick={() => copyToClipboard(sqlSnippets.createUser, 2)}
                  className="absolute top-2 right-2 p-1.5 bg-surface-600 hover:bg-surface-500 rounded transition-colors"
                >
                  {copiedIndex === 2 ? (
                    <CheckCircle className="w-3 h-3 text-success" />
                  ) : (
                    <Copy className="w-3 h-3 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-surface-800 rounded-xl border border-danger/30 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-danger" />
            Troubleshooting Login Issues
          </h2>
          
          <div className="space-y-4 text-sm">
            <div className="bg-surface-700 rounded-lg p-4">
              <p className="text-white font-medium mb-2">Error: "Profile not found"</p>
              <p className="text-gray-400">
                This means you created a user in <strong className="text-white">Authentication → Users</strong> but didn't run the SQL to create their profile in the <strong className="text-white">profiles</strong> table.
              </p>
              <p className="text-gray-400 mt-2">
                <strong className="text-accent">Fix:</strong> Run the SQL INSERT statement with the user's UUID from the auth table.
              </p>
            </div>

            <div className="bg-surface-700 rounded-lg p-4">
              <p className="text-white font-medium mb-2">Error: "Invalid login credentials"</p>
              <p className="text-gray-400">
                The email or password is incorrect. Check that:
              </p>
              <ul className="text-gray-400 mt-2 ml-4 list-disc space-y-1">
                <li>Email is exactly as entered in Supabase Auth</li>
                <li>Password matches (case-sensitive)</li>
                <li>User email is confirmed (if email confirmation is enabled)</li>
              </ul>
            </div>

            <div className="bg-surface-700 rounded-lg p-4">
              <p className="text-white font-medium mb-2">Stuck on loading screen</p>
              <p className="text-gray-400">
                Check browser console for errors. Common causes:
              </p>
              <ul className="text-gray-400 mt-2 ml-4 list-disc space-y-1">
                <li>Missing or incorrect <code className="bg-surface-600 px-1 rounded">.env</code> variables</li>
                <li>Supabase project URL/key mismatch</li>
                <li>Database schema not applied</li>
              </ul>
            </div>

            <div className="bg-surface-700 rounded-lg p-4">
              <p className="text-white font-medium mb-2">Check your Supabase setup</p>
              <p className="text-gray-400">
                In SQL Editor, verify your profile exists:
              </p>
              <pre className="bg-surface-600 rounded p-2 mt-2 text-xs text-gray-300 overflow-x-auto">
SELECT * FROM public.profiles;</pre>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
          >
            Go to Login
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-gray-500 text-sm mt-4">
            Make sure you've completed all setup steps before logging in
          </p>
        </div>
      </div>
    </div>
  );
}
