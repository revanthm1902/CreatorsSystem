import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { ExportAccess } from '../types/database';

const CAT = 'exportAccessService';

/** Check if a user can export (by role, user grant, or department grant). */
export async function canUserExport(
  userId: string,
  role: string,
  department?: string | null,
): Promise<boolean> {
  if (role === 'Director' || role === 'Admin') return true;

  const { data, error } = await supabase
    .from('export_access')
    .select('id')
    .or(`user_id.eq.${userId}${department ? `,department.eq.${department}` : ''}`)
    .limit(1);

  if (error) {
    logger.error(CAT, 'canUserExport failed', { error: error.message });
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/** Fetch all export access rules. */
export async function fetchAllExportAccess(): Promise<{
  data: ExportAccess[] | null;
  error: string | null;
}> {
  logger.info(CAT, 'fetchAllExportAccess');

  const { data, error } = await supabase
    .from('export_access')
    .select('*, user:profiles!export_access_user_id_fkey(*), granter:profiles!export_access_granted_by_fkey(*)')
    .order('created_at', { ascending: true });

  if (error) {
    logger.error(CAT, 'fetchAllExportAccess failed', { error: error.message });
    return { data: null, error: error.message };
  }

  return { data: data as ExportAccess[], error: null };
}

/** Grant export access to a specific user. */
export async function grantUserExportAccess(
  userId: string,
  grantedBy: string,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'grantUserExportAccess', { userId, grantedBy });

  const { error } = await supabase
    .from('export_access')
    .insert({ user_id: userId, granted_by: grantedBy });

  if (error) {
    logger.error(CAT, 'grantUserExportAccess failed', { error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Grant export access to an entire department. */
export async function grantDeptExportAccess(
  department: string,
  grantedBy: string,
): Promise<{ error: string | null }> {
  logger.info(CAT, 'grantDeptExportAccess', { department, grantedBy });

  const { error } = await supabase
    .from('export_access')
    .insert({ department, granted_by: grantedBy });

  if (error) {
    logger.error(CAT, 'grantDeptExportAccess failed', { error: error.message });
    return { error: error.message };
  }

  return { error: null };
}

/** Revoke a specific export access rule by ID. */
export async function revokeExportAccess(ruleId: string): Promise<{ error: string | null }> {
  logger.info(CAT, 'revokeExportAccess', { ruleId });

  const { error } = await supabase
    .from('export_access')
    .delete()
    .eq('id', ruleId);

  if (error) {
    logger.error(CAT, 'revokeExportAccess failed', { error: error.message });
    return { error: error.message };
  }

  return { error: null };
}
