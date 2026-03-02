/**
 * WebhooksPage — GitHub Webhook Viewer (super-admin only)
 *
 * Two-panel layout:
 *   Left  — paginated / filtered list of received webhook events
 *   Right — full JSON detail view of the selected event
 *
 * This page is only reachable when:
 *   1. VITE_WEBHOOK_ENABLED=true
 *   2. The logged-in user's email === VITE_WEBHOOK_ALLOWED_EMAIL
 * Both checks are also enforced in the sidebar and the route guard.
 */

import { useEffect, useState } from 'react';
import { useWebhookStore } from '../stores/webhookStore';
import { useAuthStore } from '../stores/authStore';
import {
  GitBranch,
  RefreshCw,
  Search,
  ChevronRight,
  Code2,
  Inbox,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  X,
  Filter,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { GithubWebhook } from '../types/database';

// ─── Event-type colour map ────────────────────────────────────────────────────

const EVENT_COLOURS: Record<string, string> = {
  push:                '#6366f1',
  pull_request:        '#8b5cf6',
  issues:              '#f59e0b',
  issue_comment:       '#f97316',
  create:              '#10b981',
  delete:              '#ef4444',
  release:             '#14b8a6',
  workflow_run:        '#3b82f6',
  check_run:           '#06b6d4',
  status:              '#84cc16',
  fork:                '#a855f7',
  star:                '#eab308',
  watch:               '#64748b',
};

function eventColour(type: string): string {
  return EVENT_COLOURS[type] ?? '#6b7280';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EventBadge({ type }: { type: string }) {
  const bg = eventColour(type);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shrink-0"
      style={{ backgroundColor: bg }}
    >
      {type}
    </span>
  );
}

function WebhookListItem({
  webhook,
  isSelected,
  onClick,
}: {
  webhook: GithubWebhook;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b transition-all hover:bg-(--bg-elevated) ${
        isSelected ? 'bg-(--bg-elevated) border-l-2 border-primary' : ''
      }`}
      style={{ borderBottomColor: 'var(--border-color)' }}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <EventBadge type={webhook.event_type} />
        {webhook.action && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            {webhook.action}
          </span>
        )}
        <ChevronRight
          className={`w-3.5 h-3.5 ml-auto shrink-0 mt-0.5 transition-transform ${isSelected ? 'text-primary rotate-90' : ''}`}
          style={{ color: isSelected ? undefined : 'var(--text-muted)' }}
        />
      </div>

      {webhook.repository && (
        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {webhook.repository}
        </p>
      )}

      <div className="flex items-center gap-2 mt-0.5">
        {webhook.sender && (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            @{webhook.sender}
          </span>
        )}
        <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>
          {formatDistanceToNow(new Date(webhook.received_at), { addSuffix: true })}
        </span>
      </div>
    </button>
  );
}

// ─── JSON viewer with copy button ─────────────────────────────────────────────

function JsonViewer({ data }: { data: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative h-full flex flex-col">
      <button
        onClick={copy}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg transition-all hover:scale-105"
        style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        title="Copy JSON"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
      <pre
        className="flex-1 overflow-auto p-4 text-xs leading-relaxed rounded-xl font-mono"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          tabSize: 2,
        }}
      >
        {json}
      </pre>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function WebhooksPage() {
  const { user, profile } = useAuthStore();

  // Access guard (double-check even though sidebar + route also guard)
  const webhookEnabled = import.meta.env.VITE_WEBHOOK_ENABLED === 'true';
  const isFrank =
    (user?.email ?? '').toLowerCase() === 'frank@aryverse.com' ||
    (profile?.full_name ?? '').toLowerCase().includes('frank');

  const {
    webhooks, selectedId, eventTypes,
    filterEventType, filterRepository,
    loading, error,
    fetch, select,
    setFilterEvent, setFilterRepo,
    reset,
  } = useWebhookStore();

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (webhookEnabled && isFrank) {
      fetch();
    }
    return () => { reset(); };
    // intentionally only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!webhookEnabled || !isFrank) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>
          Access denied — feature not available in this environment.
        </p>
      </div>
    );
  }

  const selected = webhooks.find((w) => w.id === selectedId) ?? null;

  const handleRefresh = () => {
    fetch();
  };

  const handleApplyFilters = () => {
    fetch();
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilterEvent('');
    setFilterRepo('');
    fetch();
    setShowFilters(false);
  };

  return (
    <div className="flex flex-col h-full gap-0 -m-4 sm:-m-6 lg:-m-8">

      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
      >
        <GitBranch className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            GitHub Webhooks
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Received at /webhooks/github &mdash; {webhooks.length} events loaded
          </p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg transition-colors relative ${showFilters ? 'bg-primary text-white' : 'hover:bg-(--bg-elevated)'}`}
          style={{ color: showFilters ? undefined : 'var(--text-secondary)' }}
          title="Filters"
        >
          <Filter className="w-4 h-4" />
          {(filterEventType || filterRepository) && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
          )}
        </button>

        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg transition-colors hover:bg-(--bg-elevated)"
          style={{ color: 'var(--text-secondary)' }}
          title="Refresh"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Filter bar (collapsible) ────────────────────────────────────── */}
      {showFilters && (
        <div
          className="flex flex-wrap items-end gap-3 px-5 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}
        >
          {/* Event type filter */}
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Event Type
            </label>
            <select
              value={filterEventType}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="text-sm rounded-lg px-2.5 py-1.5 border outline-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">All events</option>
              {eventTypes.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>

          {/* Repository filter */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Repository
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="e.g. aryverse/project"
                value={filterRepository}
                onChange={(e) => setFilterRepo(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border outline-none"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white"
            >
              Apply
            </button>
            <button
              onClick={handleClearFilters}
              className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-(--bg-hover)"
              style={{ color: 'var(--text-secondary)' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Two-panel body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Panel 1 — Event list ────────────────────────────────────────── */}
        <div
          className="w-full sm:w-80 lg:w-96 shrink-0 flex flex-col border-r overflow-hidden"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
        >
          {/* list header */}
          <div
            className="px-4 py-2.5 border-b flex items-center gap-2 shrink-0"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Inbox className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Incoming Events
            </span>
            {loading && <Loader2 className="w-3 h-3 animate-spin ml-auto" style={{ color: 'var(--text-muted)' }} />}
          </div>

          {/* error */}
          {error && (
            <div className="m-3 p-3 rounded-xl flex items-start gap-2 text-xs" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* empty state */}
          {!loading && !error && webhooks.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12 px-6 text-center">
              <GitBranch className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                No webhooks received yet
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Push a commit or open a PR in your GitHub repo and events will appear here in real-time.
              </p>
            </div>
          )}

          {/* list */}
          <div className="flex-1 overflow-y-auto">
            {webhooks.map((wh) => (
              <WebhookListItem
                key={wh.id}
                webhook={wh}
                isSelected={wh.id === selectedId}
                onClick={() => select(wh.id === selectedId ? null : wh.id)}
              />
            ))}
          </div>
        </div>

        {/* Panel 2 — Payload detail ────────────────────────────────────── */}
        <div
          className={`flex-1 hidden sm:flex flex-col overflow-hidden ${!selected ? 'items-center justify-center' : ''}`}
          style={{ backgroundColor: 'var(--bg-main)' }}
        >
          {!selected ? (
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <Code2 className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                Select an event to inspect its payload
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Detail header */}
              <div
                className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
              >
                <EventBadge type={selected.event_type} />
                {selected.action && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    {selected.action}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {selected.repository ?? 'N/A'}{selected.sender ? ` · @${selected.sender}` : ''}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Delivery: {selected.delivery_id} &middot;{' '}
                    {new Date(selected.received_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => select(null)}
                  className="p-1.5 rounded-lg hover:bg-(--bg-elevated) transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="Close detail"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* JSON viewer */}
              <div className="flex-1 overflow-hidden p-4">
                <JsonViewer data={selected.payload} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
