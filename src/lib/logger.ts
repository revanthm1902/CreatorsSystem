/**
 * Structured logging system for the Creators System.
 *
 * Responsibilities (SRP):
 *  - Capture structured log entries (level, category, message, optional data)
 *  - Persist recent entries to localStorage so they survive page reloads
 *  - Provide helpers to download / clear the log for debugging
 *
 * All Supabase interactions are routed through services that call this logger,
 * giving full visibility into data-layer operations without coupling the logger
 * to Supabase itself.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export const LogLevel = {
  DEBUG: 'DEBUG' as const,
  INFO: 'INFO' as const,
  WARN: 'WARN' as const,
  ERROR: 'ERROR' as const,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

const STORAGE_KEY = 'creators_system_logs';
const MAX_ENTRIES = 500; // circular buffer size
const PERSIST_INTERVAL_MS = 5_000;

// ---------------------------------------------------------------------------
// In-memory buffer
// ---------------------------------------------------------------------------
let buffer: LogEntry[] = [];

// Hydrate from localStorage on first load
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    buffer = JSON.parse(raw) as LogEntry[];
  }
} catch {
  // Storage unavailable or corrupt — start fresh
}

// Periodic persistence (avoids thrashing localStorage on every log call)
let persistTimer: ReturnType<typeof setInterval> | null = null;

function ensurePersistTimer() {
  if (persistTimer) return;
  persistTimer = setInterval(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
    } catch {
      // quota exceeded — trim and retry once
      buffer = buffer.slice(-Math.floor(MAX_ENTRIES / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
      } catch {
        // give up silently
      }
    }
  }, PERSIST_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Core logging function
// ---------------------------------------------------------------------------
function log(level: LogLevel, category: string, message: string, data?: unknown): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    data: data !== undefined ? sanitise(data) : undefined,
  };

  buffer.push(entry);

  // Keep buffer bounded
  if (buffer.length > MAX_ENTRIES) {
    buffer = buffer.slice(-MAX_ENTRIES);
  }

  ensurePersistTimer();

  // Mirror to browser console for dev convenience
  const consoleFn = level === LogLevel.ERROR
    ? console.error
    : level === LogLevel.WARN
      ? console.warn
      : level === LogLevel.DEBUG
        ? console.debug
        : console.log;

  const prefix = `[${entry.timestamp}] [${level}] [${category}]`;
  if (data !== undefined) {
    consoleFn(prefix, message, data);
  } else {
    consoleFn(prefix, message);
  }
}

// ---------------------------------------------------------------------------
// Sanitise helper — prevents logging sensitive / huge objects
// ---------------------------------------------------------------------------
function sanitise(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  try {
    const str = JSON.stringify(value);
    // Truncate very large payloads
    if (str.length > 5_000) {
      return `[Truncated — ${str.length} chars]`;
    }
    return JSON.parse(str);
  } catch {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const logger = {
  debug: (category: string, message: string, data?: unknown) =>
    log(LogLevel.DEBUG, category, message, data),

  info: (category: string, message: string, data?: unknown) =>
    log(LogLevel.INFO, category, message, data),

  warn: (category: string, message: string, data?: unknown) =>
    log(LogLevel.WARN, category, message, data),

  error: (category: string, message: string, data?: unknown) =>
    log(LogLevel.ERROR, category, message, data),

  /** Return all in-memory entries (most recent last). */
  getEntries(): ReadonlyArray<LogEntry> {
    return buffer;
  },

  /** Flush current buffer to localStorage immediately. */
  flush(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
    } catch {
      // silent
    }
  },

  /** Clear all stored logs. */
  clear(): void {
    buffer = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // silent
    }
  },

  /** Trigger a browser download of the current log as a JSON file. */
  download(): void {
    const blob = new Blob([JSON.stringify(buffer, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creators-system-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
