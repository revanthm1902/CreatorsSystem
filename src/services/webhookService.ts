/**
 * Webhook data-access service — GitHub Webhooks viewer.
 *
 * Responsibilities (SRP):
 *  - Query the `github_webhooks` table (read-only from the frontend)
 *  - Subscribe to realtime inserts so the viewer auto-updates
 *
 * Row-Level Security means only the designated super-admin session can read rows.
 * All writes happen server-side via the Vercel function + service-role key.
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { GithubWebhook } from '../types/database';

const CAT = 'webhookService';

export interface WebhookFilters {
  eventType?: string;
  repository?: string;
  limit?: number;
}

/** Fetch recent webhooks, optionally filtered. */
export async function fetchWebhooks(
  filters: WebhookFilters = {},
): Promise<{ data: GithubWebhook[] | null; error: string | null }> {
  logger.info(CAT, 'fetchWebhooks', filters);

  let query = supabase
    .from('github_webhooks')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.eventType) query = query.eq('event_type', filters.eventType);
  if (filters.repository) query = query.ilike('repository', `%${filters.repository}%`);

  const { data, error } = await query;

  if (error) {
    logger.error(CAT, 'fetchWebhooks failed', { error: error.message });
    return { data: null, error: error.message };
  }

  return { data: data as GithubWebhook[], error: null };
}

/** Subscribe to new webhook inserts for real-time updates. */
export function subscribeToWebhooks(
  onInsert: (webhook: GithubWebhook) => void,
) {
  const channel = supabase
    .channel('github_webhooks_realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'github_webhooks' },
      (payload) => {
        logger.debug(CAT, 'realtime insert', { id: payload.new?.id });
        onInsert(payload.new as GithubWebhook);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Get distinct event_type values for the filter dropdown. */
export async function fetchDistinctEventTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('github_webhooks')
    .select('event_type')
    .order('event_type');

  if (error || !data) return [];

  const unique = [...new Set(data.map((r: { event_type: string }) => r.event_type))];
  return unique;
}
