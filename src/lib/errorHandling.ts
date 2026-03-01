/**
 * Error-handling utilities extracted from authStore for reuse across services.
 *
 * Responsibilities (SRP):
 *  - Retry a Supabase query on transient errors (network, 5xx, schema cache)
 *  - Map raw Supabase / network error messages to user-friendly strings
 */

import { logger } from './logger';

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------
export async function retryQuery<T>(
  fn: () => PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>,
  {
    retries = 3,
    delayMs = 1_000,
    label = 'query',
  }: { retries?: number; delayMs?: number; label?: string } = {},
): Promise<{ data: T | null; error: { message: string; code?: string } | null }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await fn();

      if (!result.error) return result;

      if (!isTransientError(result.error.message) || attempt === retries - 1) {
        logger.error('retryQuery', `${label} failed permanently`, {
          attempt: attempt + 1,
          error: result.error.message,
        });
        return result;
      }

      logger.warn('retryQuery', `${label} transient error — retrying (${attempt + 1}/${retries})`, {
        error: result.error.message,
      });
      await delay(delayMs * (attempt + 1));
    } catch (err) {
      if (attempt === retries - 1) {
        logger.error('retryQuery', `${label} threw after ${retries} attempts`, { error: String(err) });
        return { data: null, error: { message: 'Network error. Please check your connection.' } };
      }
      logger.warn('retryQuery', `${label} threw — retrying (${attempt + 1}/${retries})`, {
        error: String(err),
      });
      await delay(delayMs * (attempt + 1));
    }
  }

  return { data: null, error: { message: 'Query failed after retries' } };
}

// ---------------------------------------------------------------------------
// Transient-error detection
// ---------------------------------------------------------------------------
export function isTransientError(message: string): boolean {
  const lower = (message ?? '').toLowerCase();
  return (
    lower.includes('schema') ||
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('timeout') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('connection')
  );
}

// ---------------------------------------------------------------------------
// User-friendly error mapping
// ---------------------------------------------------------------------------
export function friendlyError(msg: string): string {
  const lower = msg.toLowerCase();

  if (
    lower.includes('schema') ||
    lower.includes('connection') ||
    lower.includes('503') ||
    lower.includes('502') ||
    lower.includes('500') ||
    lower.includes('internal server')
  ) {
    return 'Temporary server issue. Please try again in a moment.';
  }

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (lower.includes('invalid login') || lower.includes('invalid email or password')) {
    return 'Invalid email or password.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Your account is not yet confirmed. Please contact your administrator.';
  }

  return msg;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
