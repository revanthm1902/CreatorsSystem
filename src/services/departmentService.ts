/**
 * Department data-access service.
 *
 * Responsibilities (SRP):
 *  - CRUD operations on the `department_access` table
 *  - Fetch tasks for departments a user has access to
 *  - Fetch users belonging to specific departments
 *
 * All calls are logged via the structured logger.
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { DepartmentAccess, Task, Profile } from '../types/database';

const CAT = 'departmentService';

/** Fetch all department access rules (both dept-to-dept and user-to-dept). */
export async function fetchAllDepartmentAccess(): Promise<{
  data: DepartmentAccess[] | null;
  error: string | null;
}> {
  logger.info(CAT, 'fetchAllDepartmentAccess');

  const { data, error } = await supabase
    .from('department_access')
    .select('*, user:profiles!department_access_user_id_fkey(*)')
    .order('created_at', { ascending: true });

  if (error) {
    logger.error(CAT, 'fetchAllDepartmentAccess failed', { error: error.message });
    return { data: null, error: error.message };
  }

  logger.debug(CAT, `fetchAllDepartmentAccess returned ${data?.length ?? 0} rows`);
  return { data: data as DepartmentAccess[], error: null };
}

/** Fetch which departments a given user/department can view. */
export async function fetchAccessibleDepartments(
  department?: string | null,
  userId?: string,
): Promise<{ data: string[]; error: string | null }> {
  logger.info(CAT, 'fetchAccessibleDepartments', { department, userId });

  // Dept-to-dept rules
  let deptDepartments: string[] = [];
  if (department) {
    const { data: deptRules, error: deptErr } = await supabase
      .from('department_access')
      .select('can_view_department')
      .eq('department', department);

    if (deptErr) {
      logger.error(CAT, 'fetchAccessibleDepartments dept failed', { error: deptErr.message });
      return { data: [], error: deptErr.message };
    }

    deptDepartments = (deptRules ?? []).map((row) => row.can_view_department);
  }

  // User-to-dept rules
  let userDepartments: string[] = [];
  if (userId) {
    const { data: userRules, error: userErr } = await supabase
      .from('department_access')
      .select('can_view_department')
      .eq('user_id', userId);

    if (!userErr && userRules) {
      userDepartments = userRules.map((row) => row.can_view_department);
    }
  }

  const departments = [...new Set([...deptDepartments, ...userDepartments])];
  logger.debug(CAT, `fetchAccessibleDepartments: ${department} can view`, { departments });
  return { data: departments, error: null };
}

/** Grant a department access to view another department's tasks. */
export async function grantDepartmentAccess(
  department: string,
  canViewDepartment: string,
  grantedBy: string,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'grantDepartmentAccess', { department, canViewDepartment, grantedBy });

  const { error } = await supabase
    .from('department_access')
    .insert({
      department,
      can_view_department: canViewDepartment,
      granted_by: grantedBy,
    });

  if (error) {
    logger.error(CAT, 'grantDepartmentAccess failed', { error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Grant a specific user access to view a department's tasks. */
export async function grantUserDepartmentAccess(
  userId: string,
  canViewDepartment: string,
  grantedBy: string,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'grantUserDepartmentAccess', { userId, canViewDepartment, grantedBy });

  const { error } = await supabase
    .from('department_access')
    .insert({
      user_id: userId,
      can_view_department: canViewDepartment,
      granted_by: grantedBy,
    });

  if (error) {
    logger.error(CAT, 'grantUserDepartmentAccess failed', { error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Revoke a department's access to view another department. */
export async function revokeDepartmentAccess(
  department: string,
  canViewDepartment: string,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'revokeDepartmentAccess', { department, canViewDepartment });

  const { error } = await supabase
    .from('department_access')
    .delete()
    .eq('department', department)
    .eq('can_view_department', canViewDepartment);

  if (error) {
    logger.error(CAT, 'revokeDepartmentAccess failed', { error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Revoke a specific user's access to view a department. */
export async function revokeUserDepartmentAccess(
  userId: string,
  canViewDepartment: string,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'revokeUserDepartmentAccess', { userId, canViewDepartment });

  const { error } = await supabase
    .from('department_access')
    .delete()
    .eq('user_id', userId)
    .eq('can_view_department', canViewDepartment);

  if (error) {
    logger.error(CAT, 'revokeUserDepartmentAccess failed', { error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Fetch users belonging to specific departments. */
export async function fetchUsersByDepartments(
  departments: string[],
): Promise<{ data: Profile[] | null; error: string | null }> {
  if (departments.length === 0) return { data: [], error: null };

  logger.info(CAT, 'fetchUsersByDepartments', { departments });

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('department', departments)
    .order('employee_id', { ascending: true });

  if (error) {
    logger.error(CAT, 'fetchUsersByDepartments failed', { error: error.message });
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/** Fetch tasks assigned to users in specific departments (approved tasks only). */
export async function fetchTasksByDepartments(
  departments: string[],
): Promise<{ data: (Task & { assignee?: Profile })[] | null; error: string | null }> {
  if (departments.length === 0) return { data: [], error: null };

  logger.info(CAT, 'fetchTasksByDepartments', { departments });

  // Step 1: Get user IDs from those departments
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, full_name, employee_id, department, role')
    .in('department', departments);

  if (usersError) {
    logger.error(CAT, 'fetchTasksByDepartments — users query failed', { error: usersError.message });
    return { data: null, error: usersError.message };
  }

  if (!users || users.length === 0) {
    return { data: [], error: null };
  }

  const userIds = users.map((u) => u.id);

  // Step 2: Fetch tasks assigned to those users
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .in('assigned_to', userIds)
    .eq('director_approved', true)
    .order('created_at', { ascending: false });

  if (tasksError) {
    logger.error(CAT, 'fetchTasksByDepartments — tasks query failed', { error: tasksError.message });
    return { data: null, error: tasksError.message };
  }

  // Step 3: Attach assignee info
  const userMap = new Map(users.map((u) => [u.id, u]));
  const enrichedTasks = (tasks ?? []).map((task) => ({
    ...task,
    assignee: userMap.get(task.assigned_to) as Profile | undefined,
  }));

  logger.debug(CAT, `fetchTasksByDepartments returned ${enrichedTasks.length} tasks`);
  return { data: enrichedTasks, error: null };
}
