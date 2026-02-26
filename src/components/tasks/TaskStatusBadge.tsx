import type { TaskStatus } from '../../types/database';
import { Clock, Eye, CheckCircle, XCircle } from 'lucide-react';

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusConfig: Record<TaskStatus, { icon: typeof Clock; color: string; bg: string }> = {
  Pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  'Under Review': { icon: Eye, color: 'text-accent', bg: 'bg-accent/10' },
  Completed: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  Rejected: { icon: XCircle, color: 'text-danger', bg: 'bg-danger/10' },
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </span>
  );
}
