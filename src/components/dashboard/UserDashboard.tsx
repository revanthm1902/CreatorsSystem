import { useEffect, useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { TaskCard } from '../tasks/TaskCard';

import { ClipboardList, Zap, CheckCircle, Clock } from 'lucide-react';

export function UserDashboard() {
  const { profile } = useAuthStore();
  const { tasks, fetchTasks, subscribeToTasks } = useTaskStore();

  useEffect(() => {
    if (profile) {
      fetchTasks(profile.id, profile.role);
      const unsubscribe = subscribeToTasks();
      return () => unsubscribe();
    }
  }, [fetchTasks, subscribeToTasks, profile]);

  const stats = useMemo(() => ({
    totalTasks: tasks.length,
    pending: tasks.filter((t) => t.status === 'Pending').length,
    underReview: tasks.filter((t) => t.status === 'Under Review').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
  }), [tasks]);

  const pendingTasks = tasks.filter((t) => t.status === 'Pending');
  const otherTasks = tasks.filter((t) => t.status !== 'Pending');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Tasks</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            Welcome back, {profile?.full_name}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-lg">
          <Zap className="w-5 h-5" />
          <span className="font-bold text-lg">{profile?.total_tokens || 0}</span>
          <span className="text-sm opacity-70">Tokens</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Total Tasks" value={stats.totalTasks} />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="warning" />
        <StatCard icon={Zap} label="Under Review" value={stats.underReview} color="accent" />
        <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="success" />
      </div>

      {/* Tasks */}
      <div className="space-y-6">
        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Clock className="w-5 h-5 text-warning" />
              Tasks To Complete
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {pendingTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Other Tasks */}
        {otherTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Other Tasks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {otherTasks.map((task) => (
                <TaskCard key={task.id} task={task} showActions={false} />
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tasks assigned to you yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: typeof ClipboardList;
  label: string;
  value: number;
  color?: 'warning' | 'accent' | 'success';
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
  };

  return (
    <div 
      className="rounded-xl p-4 border"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color ? colorClasses[color] : 'bg-primary/10 text-primary'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
        </div>
      </div>
    </div>
  );
}
