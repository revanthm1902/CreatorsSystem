import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { TaskCard } from '../components/tasks/TaskCard';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import {
  Plus,
  ClipboardList,
  Filter,
  ShieldAlert,
  Loader2,
  Building2,
  Users,
  Settings2,
  ArrowRight,
  Trash2,
  UserPlus,
  LayoutGrid,
} from 'lucide-react';
import type { Task, TaskStatus, Profile, DepartmentAccess } from '../types/database';
import { ALL_DEPARTMENTS, USER_DEPARTMENTS } from '../types/database';
import * as departmentService from '../services/departmentService';

export function TasksPage() {
  const { profile } = useAuthStore();
  const { tasks, fetchTasks, subscribeToTasks, loading, initialized } = useTaskStore();
  const { users, fetchUsers } = useUserStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [selectedDept, setSelectedDept] = useState<string | 'All'>('All');

  // Department tasks for regular users (fetched via departmentService)
  const [deptTasks, setDeptTasks] = useState<(Task & { assignee?: Profile })[]>([]);
  const [viewableDepartments, setViewableDepartments] = useState<string[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);

  // Access management state (Admin/Director only)
  const [showAccessManager, setShowAccessManager] = useState(false);
  const [accessRules, setAccessRules] = useState<DepartmentAccess[]>([]);
  const [newRuleFrom, setNewRuleFrom] = useState('');
  const [newRuleTo, setNewRuleTo] = useState('');
  const [newUserRuleUser, setNewUserRuleUser] = useState('');
  const [newUserRuleTo, setNewUserRuleTo] = useState('');
  const [accessTab, setAccessTab] = useState<'dept' | 'user'>('dept');
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const isAdmin = profile?.role === 'Director' || profile?.role === 'Admin';
  const isDirector = profile?.role === 'Director';

  /* ------------------------------------------------------------------ */
  /* Data fetching                                                       */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    fetchTasks(profile?.role === 'User' ? profile?.id : undefined, profile?.role);
    fetchUsers();
    const unsubscribe = subscribeToTasks();
    return () => unsubscribe();
  }, [fetchTasks, fetchUsers, subscribeToTasks, profile?.id, profile?.role]);

  // For regular users — load accessible department tasks
  const loadDeptData = useCallback(async () => {
    if (!profile || isAdmin) return;
    setDeptLoading(true);
    try {
      let departments: string[] = [];
      if (profile.department) departments = [profile.department];

      const { data: accessibleDepts } = await departmentService.fetchAccessibleDepartments(
        profile.department,
        profile.id,
      );
      departments = [...new Set([...departments, ...accessibleDepts])];
      setViewableDepartments(departments);

      if (departments.length > 0) {
        const { data: taskData } = await departmentService.fetchTasksByDepartments(departments);
        setDeptTasks(taskData ?? []);
      }
    } catch {
      // silently fail — user still sees their own tasks
    } finally {
      setDeptLoading(false);
    }
  }, [profile, isAdmin]);

  useEffect(() => {
    loadDeptData();
  }, [loadDeptData]);

  /* ------------------------------------------------------------------ */
  /* Lookup maps                                                         */
  /* ------------------------------------------------------------------ */
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const effectiveViewableDepts = isAdmin ? [...ALL_DEPARTMENTS] : viewableDepartments;

  /* ------------------------------------------------------------------ */
  /* Merge & deduplicate tasks                                           */
  /* ------------------------------------------------------------------ */
  const allTasks = useMemo(() => {
    if (isAdmin) return tasks;
    // User: merge own tasks + dept tasks, deduplicate by id
    const map = new Map<string, Task & { assignee?: Profile }>();
    for (const t of tasks) map.set(t.id, t);
    for (const t of deptTasks) if (!map.has(t.id)) map.set(t.id, t);
    return Array.from(map.values());
  }, [isAdmin, tasks, deptTasks]);

  // Director approval section
  const pendingApprovalTasks = isDirector
    ? allTasks.filter((t) => !t.director_approved && t.status === 'Pending')
    : [];

  // Approved / visible tasks
  const approvedTasks = isAdmin
    ? allTasks.filter((t) => !(isDirector && !t.director_approved && t.status === 'Pending'))
    : allTasks.filter((t) => t.director_approved);

  /* ------------------------------------------------------------------ */
  /* Department + status filtering                                       */
  /* ------------------------------------------------------------------ */
  const deptFilteredTasks = useMemo(() => {
    if (selectedDept === 'All') return approvedTasks;
    return approvedTasks.filter((t) => {
      const assignee = (t as Task & { assignee?: Profile }).assignee ?? userMap.get(t.assigned_to);
      return assignee?.department === selectedDept;
    });
  }, [approvedTasks, selectedDept, userMap]);

  const filteredTasks =
    statusFilter === 'All'
      ? deptFilteredTasks
      : deptFilteredTasks.filter((t) => t.status === statusFilter);

  /* ------------------------------------------------------------------ */
  /* Department stats                                                    */
  /* ------------------------------------------------------------------ */
  const usersByDept = useMemo(() => {
    const map: Record<string, Profile[]> = {};
    const pool = isAdmin ? users : users.filter((u) => effectiveViewableDepts.includes(u.department ?? ''));
    for (const u of pool) {
      const dept = u.department ?? 'Unknown';
      (map[dept] ??= []).push(u);
    }
    return map;
  }, [users, isAdmin, effectiveViewableDepts]);

  const taskCountByDept = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of approvedTasks) {
      const assignee = (t as Task & { assignee?: Profile }).assignee ?? userMap.get(t.assigned_to);
      const dept = assignee?.department ?? 'Unknown';
      map[dept] = (map[dept] ?? 0) + 1;
    }
    return map;
  }, [approvedTasks, userMap]);

  /* ------------------------------------------------------------------ */
  /* Access management (Admin / Director only)                           */
  /* ------------------------------------------------------------------ */
  const loadAccessRules = useCallback(async () => {
    setAccessLoading(true);
    const { data, error: err } = await departmentService.fetchAllDepartmentAccess();
    if (err) setAccessError(err);
    else setAccessRules(data ?? []);
    setAccessLoading(false);
  }, []);

  const handleGrantAccess = async () => {
    if (!newRuleFrom || !newRuleTo || newRuleFrom === newRuleTo) return;
    setAccessError(null);
    const { error: err } = await departmentService.grantDepartmentAccess(newRuleFrom, newRuleTo, profile?.id ?? '');
    if (err) setAccessError(err.includes('duplicate') ? 'This access rule already exists' : err);
    else { setNewRuleFrom(''); setNewRuleTo(''); await loadAccessRules(); }
  };

  const handleRevokeAccess = async (dept: string, canViewDept: string) => {
    const { error: err } = await departmentService.revokeDepartmentAccess(dept, canViewDept);
    if (err) setAccessError(err);
    else await loadAccessRules();
  };

  const handleGrantUserAccess = async () => {
    if (!newUserRuleUser || !newUserRuleTo) return;
    setAccessError(null);
    const { error: err } = await departmentService.grantUserDepartmentAccess(newUserRuleUser, newUserRuleTo, profile?.id ?? '');
    if (err) setAccessError(err.includes('duplicate') ? 'This access rule already exists' : err);
    else { setNewUserRuleUser(''); setNewUserRuleTo(''); await loadAccessRules(); }
  };

  const handleRevokeUserAccess = async (userId: string, canViewDept: string) => {
    const { error: err } = await departmentService.revokeUserDepartmentAccess(userId, canViewDept);
    if (err) setAccessError(err);
    else await loadAccessRules();
  };

  useEffect(() => {
    if (showAccessManager && isAdmin) loadAccessRules();
  }, [showAccessManager, isAdmin, loadAccessRules]);

  const deptRules = accessRules.filter((r) => r.department != null && r.user_id == null);
  const userRules = accessRules.filter((r) => r.user_id != null);

  /* ------------------------------------------------------------------ */
  /* Loading state                                                       */
  /* ------------------------------------------------------------------ */
  if (!initialized && loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* ============================================================ */}
      {/* Header                                                       */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1
            className="text-lg sm:text-2xl font-bold flex items-center gap-2 sm:gap-3"
            style={{ color: 'var(--text-primary)' }}
          >
            <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
            {isAdmin ? 'All Tasks' : 'My Tasks'}
          </h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin
              ? 'Manage tasks across all departments'
              : 'Your tasks and accessible department tasks'}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => setShowAccessManager(!showAccessManager)}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
              style={{
                backgroundColor: showAccessManager ? 'var(--color-primary)' : 'var(--bg-card)',
                borderColor: showAccessManager ? 'var(--color-primary)' : 'var(--border-color)',
                color: showAccessManager ? 'white' : 'var(--text-primary)',
              }}
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Dept Access</span>
              <span className="sm:hidden font-medium">Access</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all text-sm"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium">Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Access Manager Panel (collapsible) — Admin / Director only   */}
      {/* ============================================================ */}
      {isAdmin && showAccessManager && (
        <div
          className="rounded-2xl border p-4 sm:p-6 space-y-5"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div>
            <h3
              className="text-base sm:text-lg font-bold flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <Settings2 className="w-5 h-5 text-primary" />
              Cross-Department Access Rules
            </h3>
            <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
              Configure department-level or user-level access to view other departments' task data.
            </p>
          </div>

          {accessError && (
            <div
              className="p-3 rounded-lg text-sm border"
              style={{
                backgroundColor: 'var(--bg-danger)',
                borderColor: 'var(--border-danger)',
                color: 'var(--text-danger)',
              }}
            >
              {accessError}
            </div>
          )}

          {/* Tab Switcher */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <button
              onClick={() => setAccessTab('dept')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                accessTab === 'dept' ? 'bg-primary text-white shadow-sm' : ''
              }`}
              style={accessTab !== 'dept' ? { color: 'var(--text-secondary)' } : undefined}
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Dept → Dept</span>
              <span className="sm:hidden">Dept</span>
            </button>
            <button
              onClick={() => setAccessTab('user')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                accessTab === 'user' ? 'bg-primary text-white shadow-sm' : ''
              }`}
              style={accessTab !== 'user' ? { color: 'var(--text-secondary)' } : undefined}
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">User → Dept</span>
              <span className="sm:hidden">User</span>
            </button>
          </div>

          {/* Dept → Dept Tab */}
          {accessTab === 'dept' && (
            <div className="space-y-4">
              <div
                className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-4 rounded-xl"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Department
                  </label>
                  <select
                    value={newRuleFrom}
                    onChange={(e) => setNewRuleFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Select department...</option>
                    {USER_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-center sm:pb-2">
                  <ArrowRight className="w-5 h-5 rotate-90 sm:rotate-0" style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Can View Department
                  </label>
                  <select
                    value={newRuleTo}
                    onChange={(e) => setNewRuleTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Select department...</option>
                    {USER_DEPARTMENTS.filter((d) => d !== newRuleFrom).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleGrantAccess}
                  disabled={!newRuleFrom || !newRuleTo || newRuleFrom === newRuleTo}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Grant
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Department Rules ({deptRules.length})
                </h4>
                {accessLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : deptRules.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No department-to-department rules configured yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {deptRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-3 rounded-xl border"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                      >
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span
                            className="px-2.5 py-1 rounded-lg font-medium text-xs"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                          >
                            {rule.department}
                          </span>
                          <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>can view</span>
                          <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <span
                            className="px-2.5 py-1 rounded-lg font-medium text-xs"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                          >
                            {rule.can_view_department}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRevokeAccess(rule.department!, rule.can_view_department)}
                          className="p-1.5 rounded-lg transition-all shrink-0"
                          style={{ color: 'var(--text-muted)' }}
                          title="Revoke access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User → Dept Tab */}
          {accessTab === 'user' && (
            <div className="space-y-4">
              <div
                className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-4 rounded-xl"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    User
                  </label>
                  <select
                    value={newUserRuleUser}
                    onChange={(e) => setNewUserRuleUser(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Select user...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} {u.department ? `(${u.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-center sm:pb-2">
                  <ArrowRight className="w-5 h-5 rotate-90 sm:rotate-0" style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Can View Department
                  </label>
                  <select
                    value={newUserRuleTo}
                    onChange={(e) => setNewUserRuleTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Select department...</option>
                    {USER_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleGrantUserAccess}
                  disabled={!newUserRuleUser || !newUserRuleTo}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Grant
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  User Rules ({userRules.length})
                </h4>
                {accessLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : userRules.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No user-level access rules configured yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {userRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-3 rounded-xl border"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                      >
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span
                            className="px-2.5 py-1 rounded-lg font-medium text-xs"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                          >
                            {rule.user?.full_name ?? rule.user_id}
                          </span>
                          <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>can view</span>
                          <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <span
                            className="px-2.5 py-1 rounded-lg font-medium text-xs"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                          >
                            {rule.can_view_department}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRevokeUserAccess(rule.user_id!, rule.can_view_department)}
                          className="p-1.5 rounded-lg transition-all shrink-0"
                          style={{ color: 'var(--text-muted)' }}
                          title="Revoke access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Pending Director Approval — Director only                    */}
      {/* ============================================================ */}
      {isDirector && pendingApprovalTasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Pending Your Approval ({pendingApprovalTasks.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-3 sm:p-4 rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/5">
            {pendingApprovalTasks.map((task) => (
              <TaskCard key={task.id} task={task} isAdminView />
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Department Overview Cards                                    */}
      {/* ============================================================ */}
      {effectiveViewableDepts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {/* "All" card */}
          <button
            onClick={() => setSelectedDept('All')}
            className={`p-3 sm:p-4 rounded-xl border transition-all text-left hover:scale-[1.02] active:scale-[0.98] ${
              selectedDept === 'All' ? 'ring-2 ring-primary' : ''
            }`}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: selectedDept === 'All' ? 'var(--color-primary)' : 'var(--border-color)',
            }}
          >
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
              <LayoutGrid className="w-3.5 h-3.5 inline mr-1" />
              All
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {approvedTasks.length}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>tasks</span>
            </div>
          </button>

          {effectiveViewableDepts.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(selectedDept === dept ? 'All' : dept)}
              className={`p-3 sm:p-4 rounded-xl border transition-all text-left hover:scale-[1.02] active:scale-[0.98] ${
                selectedDept === dept ? 'ring-2 ring-primary' : ''
              }`}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: selectedDept === dept ? 'var(--color-primary)' : 'var(--border-color)',
              }}
            >
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
                {dept}
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {taskCountByDept[dept] ?? 0}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>tasks</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <Users className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {usersByDept[dept]?.length ?? 0}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* Status Filter                                                */}
      {/* ============================================================ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 filter-scroll">
        <Filter className="w-5 h-5 shrink-0" style={{ color: 'var(--text-muted)' }} />
        <div className="flex gap-1.5 sm:gap-2">
          {(['All', 'Pending', 'Under Review', 'Completed', 'Rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-2 sm:py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                statusFilter === status ? 'bg-primary text-white' : 'hover:opacity-80'
              }`}
              style={
                statusFilter !== status
                  ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
                  : undefined
              }
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Tasks Grid                                                   */}
      {/* ============================================================ */}
      {deptLoading && allTasks.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredTasks.map((task) => {
            const assignee =
              (task as Task & { assignee?: Profile }).assignee ?? userMap.get(task.assigned_to);
            const showBadge = assignee && (isAdmin || assignee.id !== profile?.id);

            return (
              <div key={task.id} className="relative">
                {showBadge && (
                  <div
                    className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-xs font-medium z-10 border"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {assignee.full_name} • {assignee.department ?? 'No dept'}
                  </div>
                )}
                <TaskCard task={task} isAdminView={isAdmin} showActions={isAdmin} />
              </div>
            );
          })}
          {filteredTasks.length === 0 && (
            <div className="col-span-2 text-center py-12" style={{ color: 'var(--text-muted)' }}>
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tasks found</p>
            </div>
          )}
        </div>
      )}

      {isAdmin && showCreateModal && (
        <CreateTaskModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
