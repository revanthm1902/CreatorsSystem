-- Supabase SQL Schema for Creators System
-- Run this in your Supabase SQL Editor

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  employee_id TEXT UNIQUE, -- Made optional here so the trigger can fill it
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'User' CHECK (role IN ('Director', 'Admin', 'User')),
  total_tokens INTEGER DEFAULT 0,
  is_temporary_password BOOLEAN DEFAULT TRUE,
  -- Personal info fields
  date_of_birth DATE,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  resume_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: Add new columns to existing profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- 2. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ NOT NULL,
  tokens INTEGER NOT NULL CHECK (tokens >= 0),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Under Review', 'Completed', 'Rejected')),
  director_approved BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: Add director_approved column to existing tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS director_approved BOOLEAN DEFAULT FALSE;

-- Migration: Add submission_note and admin_feedback columns
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS submission_note TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS admin_feedback TEXT;

-- 3. Create points log table
CREATE TABLE IF NOT EXISTS public.points_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  task_id UUID REFERENCES public.tasks(id) NOT NULL,
  tokens_awarded INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AUTO-GENERATE EMPLOYEE ID (Trigger)
-- This automatically creates IDs like AV-2026-001, AV-2026-002
-- SECURITY DEFINER allows the function to bypass RLS when counting profiles
CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id TEXT;
    max_num INTEGER;
BEGIN
    -- Extract the highest existing number to avoid duplicates after deletions
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_id FROM '[0-9]+$') AS INTEGER)), 0)
    INTO max_num
    FROM public.profiles
    WHERE employee_id IS NOT NULL;
    
    new_id := 'AV-2026-' || LPAD((max_num + 1)::text, 3, '0');
    NEW.employee_id := new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_employee_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.employee_id IS NULL)
  EXECUTE FUNCTION public.generate_employee_id();

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_points_log_user_id ON public.points_log(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_total_tokens ON public.profiles(total_tokens DESC);

-- 6. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for profiles
-- IMPORTANT: Use simple policies that don't cause circular dependencies

-- All authenticated users can view all profiles (safe for internal team apps)
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile (for password reset flag, etc.)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Directors have full control over all profiles
CREATE POLICY "Directors have full access"
  ON public.profiles FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Director'
  );

-- Admins can insert new User profiles
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('Director', 'Admin')
  );

-- 8. RLS Policies for tasks
CREATE POLICY "Users can view their assigned tasks"
  ON public.tasks FOR SELECT
  USING (assigned_to = auth.uid());

CREATE POLICY "Users can update their own task status"
  ON public.tasks FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Admins and Directors have full task control"
  ON public.tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('Director', 'Admin')
    )
  );

-- 9. RLS Policies for points_log
CREATE POLICY "Users can view their own points log"
  ON public.points_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins and Directors can view all points logs"
  ON public.points_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('Director', 'Admin')
    )
  );

CREATE POLICY "System can insert points log"
  ON public.points_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('Director', 'Admin')
    )
  );

-- 10. Function to increment tokens
CREATE OR REPLACE FUNCTION public.increment_tokens(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET total_tokens = total_tokens + amount,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 12. Activity Feed table for real-time updates
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id) NOT NULL, -- Who performed the action
  action_type TEXT NOT NULL CHECK (action_type IN (
    'user_added', 'task_created', 'task_assigned', 'task_completed', 
    'task_marked_done', 'task_approved', 'task_rejected', 'task_reassigned',
    'director_approved_task', 'custom_message', 'task_deleted'
  )),
  target_user_id UUID REFERENCES public.profiles(id), -- Optional: affected user
  task_id UUID REFERENCES public.tasks(id), -- Optional: related task
  message TEXT NOT NULL, -- Human-readable message
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick time-based queries
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- Enable RLS on activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Everyone can view activity
CREATE POLICY "Authenticated users can view activity"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (true);

-- Directors and Admins can insert activity (including custom messages)
CREATE POLICY "Directors and Admins can insert activity"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('Director', 'Admin')
    )
  );

-- Enable realtime for activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;

-- 13. Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- 14. Password Reset Requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON public.password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_created_at ON public.password_reset_requests(created_at DESC);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can submit a password reset request
CREATE POLICY "Anyone can request password reset"
  ON public.password_reset_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Only Directors can view password reset requests
CREATE POLICY "Directors can view reset requests"
  ON public.password_reset_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Director')
  );

-- Only Directors can update password reset requests (approve/dismiss)
CREATE POLICY "Directors can manage reset requests"
  ON public.password_reset_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Director')
  );

-- 15. RPC: Director can reset a user's password
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Only allow Directors
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Director') THEN
    RAISE EXCEPTION 'Unauthorized: Only Directors can reset passwords';
  END IF;

  -- Update the auth user's password
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  -- Mark as temporary password so user must change on next login
  UPDATE public.profiles 
  SET is_temporary_password = true
  WHERE id = target_user_id;
END;
$$;

-- 16. Migration: Update activity_log action_type constraint to include password_reset_request
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_action_type_check;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_action_type_check CHECK (action_type IN (
  'user_added', 'task_created', 'task_assigned', 'task_completed', 
  'task_marked_done', 'task_approved', 'task_rejected', 'task_reassigned',
  'director_approved_task', 'custom_message', 'task_deleted', 'password_reset_request'
));

-- Enable realtime for password_reset_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_requests;

-- 17. RPC: Admin/Director can create a user (auth + profile in one atomic operation)
-- This avoids the signUp() session-switch problem entirely
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  caller_role TEXT;
  new_user_id UUID;
  new_employee_id TEXT;
BEGIN
  -- 1. Authorization: only Directors and Admins can create users
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role NOT IN ('Director', 'Admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only Directors and Admins can create users';
  END IF;

  -- Admins can only create Users
  IF caller_role = 'Admin' AND p_role != 'User' THEN
    RAISE EXCEPTION 'Admins can only create Users';
  END IF;

  -- Validate role
  IF p_role NOT IN ('Admin', 'User') THEN
    RAISE EXCEPTION 'Invalid role: must be Admin or User';
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;

  -- 2. Create auth user directly in auth.users
  new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    false,
    ''
  );

  -- 3. Create identity entry (required for email/password login)
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', p_email, 'email_verified', true),
    'email',
    new_user_id::text,
    now(), now(), now()
  );

  -- 4. Create profile (employee_id auto-generated by trigger)
  INSERT INTO public.profiles (id, full_name, role, total_tokens, is_temporary_password)
  VALUES (new_user_id, p_full_name, p_role, 0, true);

  -- 5. Get the auto-generated employee_id
  SELECT employee_id INTO new_employee_id FROM public.profiles WHERE id = new_user_id;

  RETURN json_build_object(
    'user_id', new_user_id,
    'employee_id', new_employee_id
  );
END;
$$;

-- 18. RPC: Admin/Director can delete a user (handles FK constraints + auth.users)
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
    target_role TEXT;
BEGIN
    -- Get caller role
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

    -- Get target role
    SELECT role INTO target_role FROM public.profiles WHERE id = p_target_user_id;
    IF target_role IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Authorization checks
    IF caller_role = 'Director' THEN
        IF target_role = 'Director' THEN
            RAISE EXCEPTION 'Cannot delete a Director';
        END IF;
    ELSIF caller_role = 'Admin' THEN
        IF target_role != 'User' THEN
            RAISE EXCEPTION 'Admins can only delete Users';
        END IF;
    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Cannot delete yourself
    IF p_target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete yourself';
    END IF;

    -- 1. Delete activity_log entries where user is actor (actor_id is NOT NULL)
    DELETE FROM public.activity_log WHERE actor_id = p_target_user_id;
    -- 2. Nullify target_user_id references
    UPDATE public.activity_log SET target_user_id = NULL WHERE target_user_id = p_target_user_id;

    -- 3. Delete points_log for this user
    DELETE FROM public.points_log WHERE user_id = p_target_user_id;
    -- Also delete points_log for tasks owned by this user (to avoid FK issues)
    DELETE FROM public.points_log WHERE task_id IN (
        SELECT id FROM public.tasks WHERE assigned_to = p_target_user_id OR created_by = p_target_user_id
    );

    -- 4. Nullify task_id references in activity_log for tasks that will be deleted
    UPDATE public.activity_log SET task_id = NULL WHERE task_id IN (
        SELECT id FROM public.tasks WHERE assigned_to = p_target_user_id OR created_by = p_target_user_id
    );

    -- 5. Delete tasks assigned to or created by this user
    DELETE FROM public.tasks WHERE assigned_to = p_target_user_id OR created_by = p_target_user_id;

    -- 6. Clear password_reset_requests resolved_by references
    UPDATE public.password_reset_requests SET resolved_by = NULL WHERE resolved_by = p_target_user_id;

    -- 7. Delete auth user (cascades to profile via ON DELETE CASCADE)
    DELETE FROM auth.users WHERE id = p_target_user_id;
END;
$$;

