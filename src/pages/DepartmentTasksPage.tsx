import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { TaskCard } from '../components/tasks/TaskCard';
import {
  Building2,
  ClipboardList,
  Filter,
  Loader2,
  Users,
  ChevronDown,
  Settings2,
  Plus,
  Trash2,
  ArrowRight,
  UserPlus,
  LayoutGrid,
} from 'lucide-react';
import type { Task, TaskStatus, Profile, DepartmentAccess } from '../types/database';
import { ALL_DEPARTMENTS, USER_DEPARTMENTS } from '../types/database';
import * as departmentService from '../services/departmentService';

export function DepartmentTasksPage() {
  const { profile } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // All departments this user can view
  const [viewableDepartments, setViewableDepartments] = useState<string[]>([]);
  // Selected department filter
  const [selectedDept, setSelectedDept] = useState<string | 'All'>('All');
  // Task status filter
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');

  const [tasks, setTasks] = useState<(Task & { assignee?: Profile })[]>([]);
  const [deptUsers, setDeptUsers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);

  // Access management state (Admin/Director only)
  const [showAccessManager, setShowAccessManager] = useState(false);
  const [accessRules, setAccessRules] = useState<DepartmentAccess[]>([]);
  const [newRuleFrom, setNewRuleFrom] = useState<string>('');
  const [newRuleTo, setNewRuleTo] = useState<string>('');
  // User-to-dept access state
  const [newUserRuleUser, setNewUserRuleUser] = useState<string>('');
  const [newUserRuleTo, setNewUserRuleTo] = useState<string>('');
  const [accessTab, setAccessTab] = useState<'dept' | 'user'>('dept');
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const isAdminOrDirector = profile?.role === 'Director' || profile?.role === 'Admin';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    try {
      let departments: string[] = [];

      if (isAdminOrDirector) {
        // Admin/Director can see all departments
        departments = [...ALL_DEPARTMENTS];
      } else if (profile.department) {
        // Regular user: own department + departments they have access to
        departments = [profile.department];
        const { data: accessibleDepts } = await departmentService.fetchAccessibleDepartments(
          profile.department,
          profile.id,
        );
        departments = [...new Set([...departments, ...accessibleDepts])];
      }

      setViewableDepartments(departments);

      // Fetch tasks for the selected or all departments
      const deptFilter = selectedDept === 'All' ? departments : [selectedDept];
      const { data: taskData, error: taskError } = await departmentService.fetchTasksByDepartments(deptFilter);

      if (taskError) {
        setError(taskError);
        return;
      }

      setTasks(taskData ?? []);

      // Fetch users in viewable departments
      const { data: userData } = await departmentService.fetchUsersByDepartments(departments);
      setDeptUsers(userData ?? []);

      // Fetch all users for user-level access grant (admin/director)
      if (isAdminOrDirector) {
        const { data: allUserData } = await departmentService.fetchUsersByDepartments(ALL_DEPARTMENTS);
        setAllUsers(allUserData ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [profile, isAdminOrDirector, selectedDept]);

  // Access management functions
  const loadAccessRules = useCallback(async () => {
    setAccessLoading(true);
    const { data, error: err } = await departmentService.fetchAllDepartmentAccess();
    if (err) {
      setAccessError(err);
    } else {
      setAccessRules(data ?? []);
    }
    setAccessLoading(false);
  }, []);

  const handleGrantAccess = async () => {
    if (!newRuleFrom || !newRuleTo || newRuleFrom === newRuleTo) return;
    setAccessError(null);
    const { error: err } = await departmentService.grantDepartmentAccess(
      newRuleFrom,
      newRuleTo,
      profile?.id ?? '',
    );
    if (err) {
      setAccessError(err.includes('duplicate') ? 'This access rule already exists' : err);
    } else {
      setNewRuleFrom('');
      setNewRuleTo('');
      await loadAccessRules();
    }
  };

  const handleRevokeAccess = async (dept: string, canViewDept: string) => {
    const { error: err } = await departmentService.revokeDepartmentAccess(dept, canViewDept);
    if (err) {
      setAccessError(err);
    } else {
      await loadAccessRules();
    }
  };

  const handleGrantUserAccess = async () => {
    if (!newUserRuleUser || !newUserRuleTo) return;
    setAccessError(null);
    const { error: err } = await departmentService.grantUserDepartmentAccess(
      newUserRuleUser,
      newUserRuleTo,
      profile?.id ?? '',
    );
    if (err) {
      setAccessError(err.includes('duplicate') ? 'This access rule already exists' : err);
    } else {
      setNewUserRuleUser('');
      setNewUserRuleTo('');
      await loadAccessRules();
    }
  };

  const handleRevokeUserAccess = async (userId: string, canViewDept: string) => {
    const { error: err } = await departmentService.revokeUserDepartmentAccess(userId, canViewDept);
    if (err) {
      setAccessError(err);
    } else {
      await loadAccessRules();
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (showAccessManager && isAdminOrDirector) {
      loadAccessRules();
    }
  }, [showAccessManager, isAdminOrDirector, loadAccessRules]);

  // Filter tasks by status
  const filteredTasks = statusFilter === 'All'
    ? tasks
    : tasks.filter((t) => t.status === statusFilter);

  // Separate dept-to-dept and user-to-dept rules
  const deptRules = accessRules.filter((r) => r.department != null && r.user_id == null);
  const userRules = accessRules.filter((r) => r.user_id != null);

  // Group users by department for the sidebar stats
  const usersByDept = deptUsers.reduce<Record<string, Profile[]>>((acc, user) => {
    const dept = user.department ?? 'Unknown';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(user);
    return acc;
  }, {});

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1
            className="text-lg sm:text-2xl font-bold flex items-center gap-2 sm:gap-3"
            style={{ color: 'var(--text-primary)' }}
          >
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
            Department Tasks
          </h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {isAdminOrDirector
              ? 'View tasks across all departments'
              : `View tasks for accessible departments`}
          </p>
        </div>
      </div>

      {error && (
        <div
          className="p-4 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-danger)', borderColor: 'var(--border-danger)', color: 'var(--text-danger)' }}
        >
          {error}
        </div>
      )}

      {/* Department Overview Cards */}
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
            All Departments
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {tasks.length}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>tasks</span>
          </div>
          <div className="mt-1 flex items-center gap-1">
            <Users className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {deptUsers.length} members
            </span>
          </div>
        </button>

        {viewableDepartments.map((dept) => {
          const deptTaskCount = tasks.filter(
            (t) => t.assignee?.department === dept,
          ).length;
          const deptUserCount = usersByDept[dept]?.length ?? 0;

          return (
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
                  {deptTaskCount}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>tasks</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <Users className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {deptUserCount} members
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status Filter */}
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

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {filteredTasks.map((task) => (
          <div key={task.id} className="relative">
            {task.assignee && (
              <div
                className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-xs font-medium z-10 border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
              >
                {task.assignee.full_name} • {task.assignee.department}
              </div>
            )}
            <TaskCard
              task={task}
              isAdminView={isAdminOrDirector}
              showActions={isAdminOrDirector}
            />
          </div>
        ))}
        {filteredTasks.length === 0 && !loading && (
          <div className="col-span-2 text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tasks found for the selected department</p>
          </div>
        )}
      </div>

      {/* Department Access Management — Admin/Director only */}
      {isAdminOrDirector && (
        <div className="mt-6">
          <button
            onClick={() => setShowAccessManager(!showAccessManager)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <Settings2 className="w-5 h-5 text-primary" />
            <span className="font-medium text-sm">
              {showAccessManager ? 'Hide' : 'Manage'} Department Access
            </span>
            <ChevronDown
              className={`w-4 h-4 ml-1 transition-transform ${showAccessManager ? 'rotate-180' : ''}`}
            />
          </button>

          {showAccessManager && (
            <div
              className="mt-4 rounded-2xl border p-4 sm:p-6 space-y-5"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
              }}
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
                  style={{ backgroundColor: 'var(--bg-danger)', borderColor: 'var(--border-danger)', color: 'var(--text-danger)' }}
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
                  {/* Add dept rule */}
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
                        style={{
                          backgroundColor: 'var(--bg-main)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="">Select department...</option>
                        {USER_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-center sm:pb-2">
                      <ArrowRight
                        className="w-5 h-5 rotate-90 sm:rotate-0"
                        style={{ color: 'var(--text-muted)' }}
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                        Can View Department
                      </label>
                      <select
                        value={newRuleTo}
                        onChange={(e) => setNewRuleTo(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: 'var(--bg-main)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="">Select department...</option>
                        {USER_DEPARTMENTS.filter((d) => d !== newRuleFrom).map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleGrantAccess}
                      disabled={!newRuleFrom || !newRuleTo || newRuleFrom === newRuleTo}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">Grant</span>
                    </button>
                  </div>

                  {/* Dept rules list */}
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
                            style={{
                              backgroundColor: 'var(--bg-elevated)',
                              borderColor: 'var(--border-color)',
                            }}
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
                              className="p-1.5 hover:text-danger hover:bg-danger/10 rounded-lg transition-all shrink-0"
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
                  {/* Add user rule */}
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
                        style={{
                          backgroundColor: 'var(--bg-main)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="">Select user...</option>
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} {u.department ? `(${u.department})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-center sm:pb-2">
                      <ArrowRight
                        className="w-5 h-5 rotate-90 sm:rotate-0"
                        style={{ color: 'var(--text-muted)' }}
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                        Can View Department
                      </label>
                      <select
                        value={newUserRuleTo}
                        onChange={(e) => setNewUserRuleTo(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: 'var(--bg-main)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="">Select department...</option>
                        {USER_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleGrantUserAccess}
                      disabled={!newUserRuleUser || !newUserRuleTo}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">Grant</span>
                    </button>
                  </div>

                  {/* User rules list */}
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
                            style={{
                              backgroundColor: 'var(--bg-elevated)',
                              borderColor: 'var(--border-color)',
                            }}
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
                              className="p-1.5 hover:text-danger hover:bg-danger/10 rounded-lg transition-all shrink-0"
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
        </div>
      )}
    </div>
  );
}
