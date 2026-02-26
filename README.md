# Creators System - AryVerse Task & Performance Manager

A modern Task Management System built with React, TypeScript, Tailwind CSS, and Supabase. Features role-based access control, real-time task updates, and a token-based performance tracking system.

## Features

### Core Features
- **Role-Based Access Control**: Director, Admin, and User roles with hierarchical permissions
- **Task Management**: Create, assign, and track tasks with deadlines and token values
- **Token System**: Points awarded for completing tasks on time
- **Real-time Updates**: Live task status updates via Supabase realtime
- **Leaderboard**: Visual ranking of users based on accumulated tokens
- **Task Countdown**: Live countdown timers for task deadlines

### User Roles

| Role | Capabilities |
|------|--------------|
| **Director** | Full dashboard access, view all tasks, manage Admins/Users, view global leaderboards |
| **Admin** | Create/assign tasks, set deadlines & token values, approve/reject completed tasks |
| **User** | View assigned tasks, mark tasks as done, track personal tokens |

### Auth Flow
- Unique Employee ID auto-generated (e.g., AV-2026-001)
- Temporary password set by Admin
- First-login password reset enforcement
- Secure password handling via Supabase Auth

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS v4 (Dark Mode)
- **State Management**: Zustand
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Real-time**: Supabase Realtime

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account & project

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**

   Create a new Supabase project and run the SQL schema:
   
   ```bash
   # Copy the contents of supabase/schema.sql to your Supabase SQL Editor and execute
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   ```
   
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Create initial Director account**
   
   In Supabase Dashboard:
   - Go to Authentication > Users
   - Create a new user with email/password
   - In SQL Editor, insert a profile:
   ```sql
   INSERT INTO profiles (id, employee_id, full_name, role, total_tokens, is_temporary_password)
   VALUES ('user-uuid-from-auth', 'AV-2026-001', 'Director Name', 'Director', 0, false);
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/
│   ├── dashboard/     # Role-specific dashboard components
│   ├── layout/        # Sidebar, DashboardLayout
│   ├── routing/       # ProtectedRoute
│   └── tasks/         # TaskCard, TaskCountdown, CreateTaskModal
├── lib/
│   └── supabase.ts    # Supabase client configuration
├── pages/
│   ├── LoginPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── LeaderboardPage.tsx
│   ├── UsersPage.tsx
│   └── TasksPage.tsx
├── stores/
│   ├── authStore.ts   # Authentication state
│   ├── taskStore.ts   # Task management state
│   └── userStore.ts   # User management state
├── types/
│   └── database.ts    # TypeScript types and Supabase schema
├── App.tsx            # Main app with routing
├── main.tsx           # Entry point
└── index.css          # Tailwind imports
```

## Database Schema

### Tables

- **profiles**: User profiles with role, tokens, and employee ID
- **tasks**: Task records with status, deadlines, and token values
- **points_log**: Audit log for all token transactions

### Row Level Security (RLS)

- Users can only view their own tasks and profile
- Admins can view all tasks and profiles
- Directors have full access
- Users cannot modify their own token balance

## Task Flow

1. **Admin creates task** → Status: `Pending`
2. **User marks as Done** → Status: `Under Review`
3. **Admin approves** → Status: `Completed`, tokens awarded if on time
4. **Admin rejects** → Status: `Rejected`, no tokens awarded

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## License

MIT
