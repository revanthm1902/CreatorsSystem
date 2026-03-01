/**
 * Server-side logging service.
 *
 * Writes structured log entries to a `system_logs` table in Supabase
 * so that critical events (errors, task creation, auth events) persist
 * independently of the browser console / localStorage.
 *
 * Uses fire-and-forget semantics — never blocks the caller.
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const CAT = 'serverLog';

export type ServerLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface ServerLogEntry {
  level: ServerLogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown> | null;
  user_id?: string | null;
}

/**
 * Write a log entry to the `system_logs` Supabase table.
 *
 * Fire-and-forget — errors are caught and logged locally but never thrown.
 */
async function writeLog(entry: ServerLogEntry): Promise<void> {
  try {
    const { error } = await supabase.from('system_logs').insert({
      level: entry.level,
      category: entry.category,
      message: entry.message,
      data: entry.data ?? null,
      user_id: entry.user_id ?? null,
    });

    if (error) {
      // Don't recurse — just log locally
      logger.warn(CAT, 'Failed to write server log', { error: error.message, entry });
    }
  } catch (err) {
    logger.warn(CAT, 'Server log write threw', { error: String(err) });
  }
}

/** Convenience wrappers matching standard log levels. */
export const serverLog = {
  debug(category: string, message: string, data?: Record<string, unknown>, userId?: string) {
    writeLog({ level: 'DEBUG', category, message, data, user_id: userId });
  },
  info(category: string, message: string, data?: Record<string, unknown>, userId?: string) {
    writeLog({ level: 'INFO', category, message, data, user_id: userId });
  },
  warn(category: string, message: string, data?: Record<string, unknown>, userId?: string) {
    writeLog({ level: 'WARN', category, message, data, user_id: userId });
  },
  error(category: string, message: string, data?: Record<string, unknown>, userId?: string) {
    writeLog({ level: 'ERROR', category, message, data, user_id: userId });
  },
};
