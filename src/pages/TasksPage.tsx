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
  Download,
  Search,
  FileEdit,
} from 'lucide-react';
import type { Task, TaskStatus, Profile, DepartmentAccess, ExportAccess } from '../types/database';
import { ALL_DEPARTMENTS, USER_DEPARTMENTS } from '../types/database';
import * as departmentService from '../services/departmentService';
import * as exportAccessService from '../services/exportAccessService';

/* ── DraftsSection: shows draft tasks with ability to publish ──────── */
function DraftsSection({ draftTasks }: { draftTasks: (Task & { assignee?: Profile })[] }) {
  const { users } = useUserStore();
  const { profile } = useAuthStore();
  const { publishDraft, deleteTask } = useTaskStore();
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState<Record<string, string>>({});

  const userOptions = users.filter(u => u.role === 'User');

  const handlePublish = async (taskId: string) => {
    const userId = assignTo[taskId];
    if (!userId || !profile) return;
    setPublishingId(taskId);
    await publishDraft(taskId, userId, profile.id, profile.role);
    setPublishingId(null);
  };

  const handleDelete = async (taskId: string) => {
    if (!profile) return;
    if (!window.confirm('Delete this draft?')) return;
    await deleteTask(taskId, profile.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FileEdit className="w-6 h-6 text-blue-500" />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Drafts ({draftTasks.length})
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-3 sm:p-4 rounded-xl border-2 border-dashed border-blue-500/30 bg-blue-500/5">
        {draftTasks.map((task) => (
          <div key={task.id} className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>{task.title}</h3>
                  <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/30">Draft</span>
              </div>
              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Assign To</label>
                  <select
                    value={assignTo[task.id] || ''}
                    onChange={(e) => setAssignTo(prev => ({ ...prev, [task.id]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Select a user...</option>
                    {userOptions.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.employee_id})</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePublish(task.id)}
                    disabled={!assignTo[task.id] || publishingId === task.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-all"
                  >
                    {publishingId === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Publish
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TasksPage() {
  const { profile } = useAuthStore();
  const { tasks, fetchTasks, subscribeToTasks, loading, initialized } = useTaskStore();
  const { users, fetchUsers } = useUserStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [selectedDept, setSelectedDept] = useState<string | 'All'>('All');
  const [assignedByFilter, setAssignedByFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Department tasks for regular users (fetched via departmentService)
  const [deptTasks, setDeptTasks] = useState<(Task & { assignee?: Profile })[]>([]);
  const [viewableDepartments, setViewableDepartments] = useState<string[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);

  // Access management state (Admin/Director only)
  const [showAccessManager, setShowAccessManager] = useState(false);
  const [accessRules, setAccessRules] = useState<DepartmentAccess[]>([]);
  const [newRuleFrom, setNewRuleFrom] = useState('');
  const [newRuleTo, setNewRuleTo] = useState<string[]>([]);
  const [newUserRuleUser, setNewUserRuleUser] = useState('');
  const [newUserRuleTo, setNewUserRuleTo] = useState<string[]>([]);
  const [accessTab, setAccessTab] = useState<'dept' | 'user' | 'export'>('dept');
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Export access management state
  const [exportRules, setExportRules] = useState<ExportAccess[]>([]);
  const [newExportUser, setNewExportUser] = useState('');
  const [newExportDept, setNewExportDept] = useState('');

  const isAdmin = profile?.role === 'Director' || profile?.role === 'Admin';
  const isDirector = profile?.role === 'Director';

  /* ------------------------------------------------------------------ */
  /* Data fetching                                                       */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    fetchTasks(profile?.role === 'User' ? profile?.id : undefined, profile?.role, true);
    fetchUsers(true);
    const unsubscribe = subscribeToTasks();
    return () => unsubscribe();
  }, [fetchTasks, fetchUsers, subscribeToTasks, profile?.id, profile?.role]);

  // For regular users — load accessible department tasks
  const loadDeptData = useCallback(async () => {
    if (!profile || isAdmin) return;
    setDeptLoading(true);
    try {
      // Only show explicitly-granted departments — no auto own-dept access
      const { data: accessibleDepts } = await departmentService.fetchAccessibleDepartments(
        profile.department,
        profile.id,
      );
      const departments = [...new Set(accessibleDepts)];
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

  const effectiveViewableDepts = useMemo(() => isAdmin ? [...ALL_DEPARTMENTS] : viewableDepartments, [isAdmin, viewableDepartments]);

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

  // Approved / visible tasks (exclude drafts)
  const approvedTasks = isAdmin
    ? allTasks.filter((t) => t.status !== 'Draft' && !(isDirector && !t.director_approved && t.status === 'Pending'))
    : allTasks.filter((t) => t.director_approved && t.status !== 'Draft');

  // Draft tasks (admin/director only)
  const draftTasks = isAdmin ? allTasks.filter((t) => t.status === 'Draft') : [];

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

  const filteredTasks = useMemo(() => {
    let result = statusFilter === 'All' ? deptFilteredTasks : deptFilteredTasks.filter((t) => t.status === statusFilter);
    if (assignedByFilter !== 'All') result = result.filter((t) => t.created_by === assignedByFilter);
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((t) => {
        const assignee = userMap.get(t.assigned_to);
        return t.title.toLowerCase().includes(q)
          || t.description?.toLowerCase().includes(q)
          || assignee?.full_name?.toLowerCase().includes(q);
      });
    }
    // Sort: Under Review → Pending → Completed → Rejected
    const statusOrder: Record<string, number> = { 'Under Review': 0, 'Pending': 1, 'Completed': 2, 'Rejected': 3 };
    result = [...result].sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
    return result;
  }, [deptFilteredTasks, statusFilter, assignedByFilter, searchQuery, userMap]);

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
    const targets = newRuleTo.filter((d) => d !== newRuleFrom);
    if (!newRuleFrom || targets.length === 0) return;
    setAccessError(null);
    const { error: err } = await departmentService.grantDepartmentAccessBatch(newRuleFrom, targets, profile?.id ?? '');
    if (err) setAccessError(err.includes('duplicate') ? 'Some access rules already exist' : err);
    else { setNewRuleFrom(''); setNewRuleTo([]); await loadAccessRules(); }
  };

  const handleRevokeAccess = async (dept: string, canViewDept: string) => {
    const { error: err } = await departmentService.revokeDepartmentAccess(dept, canViewDept);
    if (err) setAccessError(err);
    else await loadAccessRules();
  };

  const handleGrantUserAccess = async () => {
    if (!newUserRuleUser || newUserRuleTo.length === 0) return;
    setAccessError(null);
    const { error: err } = await departmentService.grantUserDepartmentAccessBatch(newUserRuleUser, newUserRuleTo, profile?.id ?? '');
    if (err) setAccessError(err.includes('duplicate') ? 'Some access rules already exist' : err);
    else { setNewUserRuleUser(''); setNewUserRuleTo([]); await loadAccessRules(); }
  };

  const handleRevokeUserAccess = async (userId: string, canViewDept: string) => {
    const { error: err } = await departmentService.revokeUserDepartmentAccess(userId, canViewDept);
    if (err) setAccessError(err);
    else await loadAccessRules();
  };

  /* Export access management */
  const loadExportRules = useCallback(async () => {
    const { data, error: err } = await exportAccessService.fetchAllExportAccess();
    if (err) setAccessError(err);
    else setExportRules(data ?? []);
  }, []);

  const handleGrantExportUser = async () => {
    if (!newExportUser) return;
    setAccessError(null);
    const { error: err } = await exportAccessService.grantUserExportAccess(newExportUser, profile?.id ?? '');
    if (err) setAccessError(err.includes('duplicate') ? 'Export access already granted' : err);
    else { setNewExportUser(''); await loadExportRules(); }
  };

  const handleGrantExportDept = async () => {
    if (!newExportDept) return;
    setAccessError(null);
    const { error: err } = await exportAccessService.grantDeptExportAccess(newExportDept, profile?.id ?? '');
    if (err) setAccessError(err.includes('duplicate') ? 'Export access already granted' : err);
    else { setNewExportDept(''); await loadExportRules(); }
  };

  const handleRevokeExport = async (ruleId: string) => {
    const { error: err } = await exportAccessService.revokeExportAccess(ruleId);
    if (err) setAccessError(err);
    else await loadExportRules();
  };

  useEffect(() => {
    if (showAccessManager && isAdmin) {
      loadAccessRules();
      loadExportRules();
    }
  }, [showAccessManager, isAdmin, loadAccessRules, loadExportRules]);

  const deptRules = accessRules.filter((r) => r.department != null && r.user_id == null);
  const userRules = accessRules.filter((r) => r.user_id != null);
  const exportUserRules = exportRules.filter((r) => r.user_id != null);
  const exportDeptRules = exportRules.filter((r) => r.department != null && r.user_id == null);

  /* Unique task creators for "Assigned by" filter */
  const assignerOptions = useMemo(() => {
    const ids = [...new Set(approvedTasks.map(t => t.created_by))];
    return ids.map(id => userMap.get(id)).filter(Boolean) as Profile[];
  }, [approvedTasks, userMap]);

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
      {/* Header                                                       */}
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

      {/* Access Manager Panel (collapsible) — Admin / Director only   */}
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
            <button
              onClick={() => setAccessTab('export')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                accessTab === 'export' ? 'bg-primary text-white shadow-sm' : ''
              }`}
              style={accessTab !== 'export' ? { color: 'var(--text-secondary)' } : undefined}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Access</span>
              <span className="sm:hidden">Export</span>
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
                    Can View Departments
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {USER_DEPARTMENTS.filter((d) => d !== newRuleFrom).map((d) => {
                      const selected = newRuleTo.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setNewRuleTo((prev) =>
                              selected ? prev.filter((x) => x !== d) : [...prev, d],
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            selected ? 'ring-2 ring-primary' : ''
                          }`}
                          style={{
                            backgroundColor: selected ? 'var(--color-primary)' : 'var(--bg-main)',
                            borderColor: selected ? 'var(--color-primary)' : 'var(--border-color)',
                            color: selected ? 'white' : 'var(--text-primary)',
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={handleGrantAccess}
                  disabled={!newRuleFrom || newRuleTo.length === 0}
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
                    Can View Departments
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {USER_DEPARTMENTS.map((d) => {
                      const selected = newUserRuleTo.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setNewUserRuleTo((prev) =>
                              selected ? prev.filter((x) => x !== d) : [...prev, d],
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            selected ? 'ring-2 ring-primary' : ''
                          }`}
                          style={{
                            backgroundColor: selected ? 'var(--color-primary)' : 'var(--bg-main)',
                            borderColor: selected ? 'var(--color-primary)' : 'var(--border-color)',
                            color: selected ? 'white' : 'var(--text-primary)',
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={handleGrantUserAccess}
                  disabled={!newUserRuleUser || newUserRuleTo.length === 0}
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

          {/* Export Access Tab */}
          {accessTab === 'export' && (
            <div className="space-y-5">
              {/* Grant to User */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Grant to User</h4>
                <div
                  className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-4 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>User</label>
                    <select
                      value={newExportUser}
                      onChange={(e) => setNewExportUser(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Select user...</option>
                      {users
                        .filter((u) => u.role === 'User' && !exportUserRules.some((r) => r.user_id === u.id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.full_name} {u.department ? `(${u.department})` : ''}</option>
                        ))}
                    </select>
                  </div>
                  <button
                    onClick={handleGrantExportUser}
                    disabled={!newExportUser}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Grant
                  </button>
                </div>
                {exportUserRules.length > 0 && (
                  <div className="space-y-2">
                    {exportUserRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-3 rounded-xl border"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <span className="px-2.5 py-1 rounded-lg font-medium text-xs" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                            {rule.user?.full_name ?? rule.user_id}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>can export</span>
                        </div>
                        <button onClick={() => handleRevokeExport(rule.id)} className="p-1.5 rounded-lg transition-all shrink-0" style={{ color: 'var(--text-muted)' }} title="Revoke">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {exportUserRules.length === 0 && (
                  <p className="text-sm py-2 text-center" style={{ color: 'var(--text-muted)' }}>No user-level export rules yet.</p>
                )}
              </div>

              {/* Grant to Department */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Grant to Department</h4>
                <div
                  className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-4 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Department</label>
                    <select
                      value={newExportDept}
                      onChange={(e) => setNewExportDept(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Select department...</option>
                      {USER_DEPARTMENTS
                        .filter((d) => !exportDeptRules.some((r) => r.department === d))
                        .map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                  </div>
                  <button
                    onClick={handleGrantExportDept}
                    disabled={!newExportDept}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Grant
                  </button>
                </div>
                {exportDeptRules.length > 0 && (
                  <div className="space-y-2">
                    {exportDeptRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-3 rounded-xl border"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <span className="px-2.5 py-1 rounded-lg font-medium text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                            {rule.department}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>— all members can export</span>
                        </div>
                        <button onClick={() => handleRevokeExport(rule.id)} className="p-1.5 rounded-lg transition-all shrink-0" style={{ color: 'var(--text-muted)' }} title="Revoke">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {exportDeptRules.length === 0 && (
                  <p className="text-sm py-2 text-center" style={{ color: 'var(--text-muted)' }}>No department-level export rules yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Director Approval — Director only */}
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

      {/* Department Overview Cards                                    */}
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

      {/* Search Bar                                                  */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks by title, description, or assignee..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Draft Tasks — Admin/Director only                            */}
      {isAdmin && draftTasks.length > 0 && (
        <DraftsSection draftTasks={draftTasks} />
      )}

      {/* Status Filter                                                */}
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
        {isAdmin && assignerOptions.length > 1 && (
          <select value={assignedByFilter} onChange={e => setAssignedByFilter(e.target.value)}
            className="ml-auto px-3 py-1.5 rounded-xl text-sm font-medium shrink-0"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
            <option value="All">All assigners</option>
            {assignerOptions.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        )}
      </div>

      {/* Tasks Grid                                                   */}
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
