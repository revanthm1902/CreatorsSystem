import { useEffect, useState, useMemo } from 'react';
import { differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays, isPast } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface TaskCountdownProps {
  deadline: string;
  status: string;
}

export function TaskCountdown({ deadline, status }: TaskCountdownProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const deadlineDate = useMemo(() => new Date(deadline), [deadline]);
  const isOverdue = isPast(deadlineDate);
  const isCompleted = status === 'Completed';

  const timeRemaining = useMemo(() => {
    if (isCompleted) return null;
    if (isOverdue) return { days: 0, hours: 0, minutes: 0, seconds: 0, overdue: true };

    const days = differenceInDays(deadlineDate, now);
    const hours = differenceInHours(deadlineDate, now) % 24;
    const minutes = differenceInMinutes(deadlineDate, now) % 60;
    const seconds = differenceInSeconds(deadlineDate, now) % 60;

    return { days, hours, minutes, seconds, overdue: false };
  }, [now, deadlineDate, isOverdue, isCompleted]);

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-success">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Completed</span>
      </div>
    );
  }

  if (!timeRemaining || timeRemaining.overdue) {
    return (
      <div className="flex items-center gap-2 text-danger">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">Overdue</span>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = timeRemaining;
  const isUrgent = days === 0 && hours < 6;

  return (
    <div className={`flex items-center gap-2 ${isUrgent ? 'text-warning' : ''}`} style={!isUrgent ? { color: 'var(--text-muted)' } : undefined}>
      <Clock className="w-4 h-4" />
      <div className="flex items-center gap-1 text-sm font-mono">
        {days > 0 && (
          <>
            <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }}>{days}d</span>
          </>
        )}
        <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          {String(hours).padStart(2, '0')}
        </span>
        <span>:</span>
        <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          {String(minutes).padStart(2, '0')}
        </span>
        <span>:</span>
        <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          {String(seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
