/**
 * Webhook store — manages GitHub webhook viewer UI state.
 *
 * Responsibilities (SRP):
 *  - Hold the list of received webhooks and selected webhook
 *  - Coordinate fetch + realtime subscription
 *  - Expose filter state (event type, repo search)
 */

import { create } from 'zustand';
import type { GithubWebhook } from '../types/database';
import * as webhookService from '../services/webhookService';
import { logger } from '../lib/logger';

const CAT = 'webhookStore';

interface WebhookState {
  // ── data ──
  webhooks:         GithubWebhook[];
  selectedId:       string | null;
  eventTypes:       string[];   // distinct values for filter dropdown

  // ── filters ──
  filterEventType:  string;
  filterRepository: string;

  // ── ui ──
  loading:          boolean;
  error:            string | null;

  // ── actions ──
  fetch:            () => Promise<void>;
  select:           (id: string | null) => void;
  setFilterEvent:   (v: string) => void;
  setFilterRepo:    (v: string) => void;
  prependWebhook:   (wh: GithubWebhook) => void;
  reset:            () => void;
}

let _unsubscribe: (() => void) | null = null;

export const useWebhookStore = create<WebhookState>((set, get) => ({
  webhooks:  [],
  selectedId: null,
  eventTypes: [],
  filterEventType:  '',
  filterRepository: '',
  loading: false,
  error:   null,

  fetch: async () => {
    logger.info(CAT, 'fetch');
    set({ loading: true, error: null });

    const { filterEventType, filterRepository } = get();

    const [{ data, error }, eventTypes] = await Promise.all([
      webhookService.fetchWebhooks({
        eventType:  filterEventType  || undefined,
        repository: filterRepository || undefined,
      }),
      webhookService.fetchDistinctEventTypes(),
    ]);

    if (error) {
      logger.error(CAT, 'fetch failed', { error });
      set({ loading: false, error });
      return;
    }

    set({ webhooks: data ?? [], eventTypes, loading: false });

    // Subscribe for real-time inserts (only once)
    if (!_unsubscribe) {
      _unsubscribe = webhookService.subscribeToWebhooks((wh) => {
        get().prependWebhook(wh);
      });
    }
  },

  select: (id) => set({ selectedId: id }),

  setFilterEvent: (v) => set({ filterEventType: v }),

  setFilterRepo: (v) => set({ filterRepository: v }),

  prependWebhook: (wh) =>
    set((s) => ({
      webhooks: [wh, ...s.webhooks],
      // Keep event types list fresh
      eventTypes: s.eventTypes.includes(wh.event_type)
        ? s.eventTypes
        : [...s.eventTypes, wh.event_type].sort(),
    })),

  reset: () => {
    if (_unsubscribe) {
      _unsubscribe();
      _unsubscribe = null;
    }
    set({
      webhooks: [],
      selectedId: null,
      eventTypes: [],
      filterEventType: '',
      filterRepository: '',
      loading: false,
      error: null,
    });
  },
}));
