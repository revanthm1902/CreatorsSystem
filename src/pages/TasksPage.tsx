import { useEffect, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { TaskCard } from '../components/tasks/TaskCard';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { Plus, ClipboardList, Filter, ShieldAlert, Loader2 } from 'lucide-react';
import type { TaskStatus } from '../types/database';

export function TasksPage() {
  const { profile } = useAuthStore();
  const { tasks, fetchTasks, subscribeToTasks, loading, initialized } = useTaskStore();
  const { fetchUsers } = useUserStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');

  useEffect(() => {
    fetchTasks(profile?.role === 'User' ? profile?.id : undefined, profile?.role);
    fetchUsers();
    const unsubscribe = subscribeToTasks();
    return () => unsubscribe();
  }, [fetchTasks, fetchUsers, subscribeToTasks, profile?.id, profile?.role]);

  const isAdmin = profile?.role === 'Director' || profile?.role === 'Admin';
  const isDirector = profile?.role === 'Director';

  // Tasks pending director approval (for Director view)
  const pendingApprovalTasks = tasks.filter((t) => !t.director_approved && t.status === 'Pending');
  
  // Regular tasks
  const approvedTasks = isAdmin
    ? tasks.filter(t => !(isDirector && !t.director_approved && t.status === 'Pending'))
    : tasks.filter((t) => t.director_approved);

  const filteredTasks = statusFilter === 'All'
    ? approvedTasks
    : approvedTasks.filter((t) => t.status === statusFilter);

  if (!initialized && loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 sm:gap-3" style={{ color: 'var(--text-primary)' }}>
            <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
            {isAdmin ? 'All Tasks' : 'My Tasks'}
          </h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin ? 'Manage and review all tasks' : 'View and complete your assigned tasks'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Create Task
          </button>
        )}
      </div>

      {/* Pending Director Approval Section - Only for Directors */}
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
              <TaskCard
                key={task.id}
                task={task}
                isAdminView={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 filter-scroll">
        <Filter className="w-5 h-5 shrink-0" style={{ color: 'var(--text-muted)' }} />
        <div className="flex gap-1.5 sm:gap-2">
          {(['All', 'Pending', 'Under Review', 'Completed', 'Rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-2 sm:py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'hover:opacity-80'
              }`}
              style={statusFilter !== status ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : undefined}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isAdminView={isAdmin}
          />
        ))}
        {filteredTasks.length === 0 && (
          <div className="col-span-2 text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tasks found</p>
          </div>
        )}
      </div>

      {isAdmin && showCreateModal && (
        <CreateTaskModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
