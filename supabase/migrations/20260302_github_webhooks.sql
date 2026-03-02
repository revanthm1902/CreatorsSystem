-- ─── GitHub Webhooks table ────────────────────────────────────────────────────
-- Stores every inbound GitHub webhook payload.
-- INSERT is done by the Vercel serverless function using the service-role key
-- (which bypasses RLS entirely).
-- SELECT is restricted by RLS to a single super-admin email.

CREATE TABLE IF NOT EXISTS public.github_webhooks (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type   TEXT        NOT NULL,          -- X-GitHub-Event header value
  delivery_id  TEXT        NOT NULL UNIQUE,   -- X-GitHub-Delivery header (idempotency)
  repository   TEXT,                          -- payload.repository.full_name (nullable for org events)
  sender       TEXT,                          -- payload.sender.login
  action       TEXT,                          -- payload.action (may be null for some events)
  payload      JSONB       NOT NULL,          -- raw parsed body
  received_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for the viewer queries
CREATE INDEX IF NOT EXISTS github_webhooks_received_at_idx ON public.github_webhooks (received_at DESC);
CREATE INDEX IF NOT EXISTS github_webhooks_event_type_idx  ON public.github_webhooks (event_type);
CREATE INDEX IF NOT EXISTS github_webhooks_repository_idx  ON public.github_webhooks (repository);

-- RLS
ALTER TABLE public.github_webhooks ENABLE ROW LEVEL SECURITY;

-- Only the designated super-admin can read rows via the frontend client.
-- The service-role key (used by the Vercel function) bypasses RLS.
CREATE POLICY "superadmin_select_github_webhooks"
  ON public.github_webhooks
  FOR SELECT
  USING (
    (auth.jwt() ->> 'email') = 'frank@aryverse.com'
  );

-- No INSERT policy — the Vercel function writes via service_role which skips RLS.
-- No UPDATE / DELETE policies — intentionally read-only from the frontend.
