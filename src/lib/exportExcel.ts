/**
 * exportExcel.ts
 * Fetches live data from Supabase and downloads a multi-sheet Excel workbook.
 * Called from Director / Admin dashboards.
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from './supabase';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(ts: string | null | undefined): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('en-IN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch {
    return ts;
  }
}

function bool(v: boolean | null | undefined): string {
  return v ? 'Yes' : 'No';
}

function styledSheet(
  wb: ExcelJS.Workbook,
  name: string,
  rows: Record<string, unknown>[],
  colWidths: number[],
) {
  const ws = wb.addWorksheet(name);
  if (!rows || rows.length === 0) return;

  // derive headers from first row
  const headers = Object.keys(rows[0]);
  ws.columns = headers.map((h, i) => ({ header: h, key: h, width: colWidths[i] ?? 15 }));

  // add rows (ExcelJS accepts array of objects keyed by column keys)
  ws.addRows(rows);
}

// ─── main export ──────────────────────────────────────────────────────────────

export async function exportToExcel(): Promise<void> {
  // ── 1. Fetch all tables in parallel ────────────────────────────────────────
  const [profilesRes, tasksRes, pointsRes, activityRes, deptAccessRes, pwdRes] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('employee_id, full_name, role, department, email, phone, date_of_birth, total_tokens, banked_minutes, token_credit_balance, linkedin_url, github_url, resume_url, is_temporary_password, created_at, updated_at')
        .order('role')
        .order('employee_id'),

      supabase
        .from('tasks')
        .select(`
          id, title, description, status, tokens, director_approved,
          deadline, original_deadline, submitted_at, approved_at,
          submission_note, admin_feedback, pow_url, issue_state, created_at,
          creator:created_by(full_name),
          assignee:assigned_to(full_name, employee_id)
        `)
        .order('created_at', { ascending: false }),

      supabase
        .from('points_log')
        .select(`
          tokens_awarded, reason, created_at,
          user:user_id(full_name, employee_id),
          task:task_id(title)
        `)
        .order('created_at', { ascending: false }),

      supabase
        .from('activity_log')
        .select(`
          action_type, message, created_at,
          actor:actor_id(full_name, role),
          target:target_user_id(full_name),
          task:task_id(title)
        `)
        .order('created_at', { ascending: false }),

      supabase
        .from('department_access')
        .select(`
          department, can_view_department, created_at,
          user:user_id(full_name, employee_id),
          granter:granted_by(full_name)
        `)
        .order('can_view_department'),

      supabase
        .from('password_reset_requests')
        .select(`
          email, status, created_at, resolved_at,
          resolver:resolved_by(full_name)
        `)
        .order('created_at', { ascending: false }),
    ]);

  // ── 2. Build workbook ───────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  const generated = new Date().toLocaleString('en-IN', { hour12: false });

  // ── Overview ────────────────────────────────────────────────────────────────
  const profiles = profilesRes.data ?? [];
  const tasks    = tasksRes.data ?? [];
  const points   = pointsRes.data ?? [];
  const activity = activityRes.data ?? [];
  const deptAccess = deptAccessRes.data ?? [];
  const pwdResets  = pwdRes.data ?? [];

  const overviewRows = [
    { '': 'AryVerse — Creators System Export' },
    { '': `Generated: ${generated}` },
    { '': '' },
    { '': 'Table', _count: 'Rows' },
    { '': 'Team Profiles',         _count: profiles.length },
    { '': 'Tasks',                 _count: tasks.length },
    { '': 'Points Log',            _count: points.length },
    { '': 'Activity Log',          _count: activity.length },
    { '': 'Department Access Rules', _count: deptAccess.length },
    { '': 'Password Reset Requests', _count: pwdResets.length },
    { '': '' },
    { '': '── Quick Stats ──' },
    { '': 'Directors',   _count: profiles.filter((p) => p.role === 'Director').length },
    { '': 'Admins',      _count: profiles.filter((p) => p.role === 'Admin').length },
    { '': 'Users',       _count: profiles.filter((p) => p.role === 'User').length },
    { '': 'Active (Pending) Tasks', _count: tasks.filter((t) => t.status === 'Pending').length },
    { '': 'Completed Tasks',        _count: tasks.filter((t) => t.status === 'Completed').length },
    { '': 'Total Tokens Awarded',   _count: profiles.reduce((s, p) => s + (p.total_tokens ?? 0), 0) },
  ];
  styledSheet(wb, '📊 Overview', overviewRows, [42, 10]);

  // ── Team Profiles ───────────────────────────────────────────────────────────
  styledSheet(
    wb,
    '👥 Team Profiles',
    profiles.map((p) => ({
      'Emp ID':         p.employee_id,
      'Full Name':      p.full_name,
      'Role':           p.role,
      'Department':     p.department ?? '',
      'Email':          p.email ?? '',
      'Phone':          p.phone ?? '',
      'Date of Birth':  p.date_of_birth ?? '',
      'Total Tokens':   p.total_tokens ?? 0,
      'Banked Minutes': p.banked_minutes ?? 0,
      'Token Credit':   p.token_credit_balance ?? 0,
      'LinkedIn':       p.linkedin_url ?? '',
      'GitHub':         p.github_url ?? '',
      'Resume':         p.resume_url ?? '',
      'Temp Password':  bool(p.is_temporary_password),
      'Joined':         fmt(p.created_at),
      'Last Updated':   fmt(p.updated_at),
    })),
    [14, 28, 12, 22, 30, 16, 14, 13, 14, 13, 40, 40, 40, 14, 18, 18],
  );

  // ── Leaderboard ─────────────────────────────────────────────────────────────
  const ranked = [...profiles]
    .filter((p) => p.role === 'User')
    .sort((a, b) => (b.total_tokens ?? 0) - (a.total_tokens ?? 0));
  styledSheet(
    wb,
    '🏆 Leaderboard',
    ranked.map((p, i) => ({
      'Rank':           i + 1,
      'Emp ID':         p.employee_id,
      'Full Name':      p.full_name,
      'Department':     p.department ?? '',
      'Total Tokens':   p.total_tokens ?? 0,
      'Token Credit':   p.token_credit_balance ?? 0,
      'Banked Minutes': p.banked_minutes ?? 0,
      'Joined':         fmt(p.created_at),
    })),
    [6, 14, 28, 22, 14, 13, 14, 18],
  );

  // ── Tasks ────────────────────────────────────────────────────────────────────
  styledSheet(
    wb,
    '📋 Tasks',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tasks.map((t: any) => ({
      'Title':            t.title,
      'Assigned To':      t.assignee?.full_name ?? '',
      'Assignee Emp ID':  t.assignee?.employee_id ?? '',
      'Created By':       t.creator?.full_name ?? '',
      'Status':           t.status,
      'Tokens':           t.tokens,
      'Dir. Approved':    bool(t.director_approved),
      'Deadline':         fmt(t.deadline),
      'Original Deadline':fmt(t.original_deadline),
      'Submitted At':     fmt(t.submitted_at),
      'Approved At':      fmt(t.approved_at),
      'GitHub Issue':     t.pow_url ?? '',
      'Issue State':      t.issue_state ?? '',
      'Submission Note':  t.submission_note ?? '',
      'Admin Feedback':   t.admin_feedback ?? '',
      'Created At':       fmt(t.created_at),
    })),
    [36, 26, 14, 22, 14, 8, 14, 18, 18, 18, 18, 46, 13, 60, 60, 18],
  );

  // ── Points Log ───────────────────────────────────────────────────────────────
  styledSheet(
    wb,
    '💰 Points Log',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    points.map((p: any) => ({
      'Emp ID':         p.user?.employee_id ?? '',
      'Name':           p.user?.full_name ?? '',
      'Task':           p.task?.title ?? '',
      'Tokens Awarded': p.tokens_awarded,
      'Reason':         p.reason ?? '',
      'Awarded At':     fmt(p.created_at),
    })),
    [14, 28, 40, 15, 44, 20],
  );

  // ── Activity Log ─────────────────────────────────────────────────────────────
  styledSheet(
    wb,
    '📜 Activity Log',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activity.map((a: any) => ({
      'Timestamp':   fmt(a.created_at),
      'Actor':       a.actor?.full_name ?? '',
      'Actor Role':  a.actor?.role ?? '',
      'Target User': a.target?.full_name ?? '',
      'Task':        a.task?.title ?? '',
      'Action Type': a.action_type,
      'Message':     a.message ?? '',
    })),
    [18, 26, 12, 26, 36, 26, 80],
  );

  // ── Department Access ─────────────────────────────────────────────────────────
  styledSheet(
    wb,
    '🏢 Dept Access',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deptAccess.map((d: any) => ({
      'User Emp ID':       d.user?.employee_id ?? '',
      'User Name':         d.user?.full_name ?? '',
      'Their Dept':        d.department ?? '',
      'Can View Dept':     d.can_view_department,
      'Granted By':        d.granter?.full_name ?? '',
      'Granted At':        fmt(d.created_at),
    })),
    [14, 26, 22, 22, 26, 20],
  );

  // ── Password Resets ───────────────────────────────────────────────────────────
  styledSheet(
    wb,
    '🔑 Password Resets',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pwdResets.map((r: any) => ({
      'Email':       r.email,
      'Status':      r.status,
      'Resolved By': r.resolver?.full_name ?? '',
      'Requested At':fmt(r.created_at),
      'Resolved At': fmt(r.resolved_at),
    })),
    [34, 14, 26, 22, 22],
  );

  // ── 3. Download ───────────────────────────────────────────────────────────────
  const datestamp = new Date().toISOString().slice(0, 10);
  const filename = `CreatorsSystem_Export_${datestamp}.xlsx`;

  // write workbook to buffer and trigger download in browser
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
}
