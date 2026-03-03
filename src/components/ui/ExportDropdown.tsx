import { useRef, useState, useEffect } from 'react';
import { Download, Loader2, Database, ClipboardList, ChevronDown } from 'lucide-react';
import { exportToExcel, exportTasksData } from '../../lib/exportExcel';

type ExportType = 'complete' | 'tasks';

export function ExportDropdown() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ExportType | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const run = async (type: ExportType) => {
    setOpen(false);
    setLoading(type);
    try {
      if (type === 'complete') await exportToExcel();
      else await exportTasksData();
    } finally {
      setLoading(null);
    }
  };

  const busy = loading !== null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => !busy && setOpen((v) => !v)}
        disabled={busy}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all border disabled:opacity-60 select-none"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
        title="Export data"
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          <Download className="w-4 h-4 shrink-0" />
        )}
        <span className="text-sm font-medium">
          {loading === 'complete'
            ? 'Exporting all…'
            : loading === 'tasks'
            ? 'Exporting tasks…'
            : 'Export'}
        </span>
        {!busy && <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className="absolute right-0 mt-1.5 w-56 rounded-xl shadow-lg z-50 overflow-hidden border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <button
            onClick={() => run('tasks')}
            className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/10 group"
          >
            <ClipboardList className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Tasks Data</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Tasks, token awards, per-user summary &amp; activity timeline
              </p>
            </div>
          </button>

          <div style={{ borderTop: '1px solid var(--border-color)' }} />

          <button
            onClick={() => run('complete')}
            className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/10 group"
          >
            <Database className="w-4 h-4 mt-0.5 text-accent shrink-0" />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Complete Data</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                All tables — profiles, tasks, points, activity, dept access &amp; more
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
