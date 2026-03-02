/**
 * Vercel Serverless Function — GitHub Webhook Receiver
 *
 * Exposed at:  POST /webhooks/github
 * (vercel.json rewrites  /webhooks/github  →  /api/webhooks/github)
 *
 * Responsibilities:
 *  1. Verify the HMAC-SHA256 signature GitHub sends in X-Hub-Signature-256
 *  2. Parse the JSON body
 *  3. Insert the payload into the `github_webhooks` Supabase table
 *     using the service-role key (bypasses RLS)
 *
 * Environment variables required (server-only, never VITE_ prefixed):
 *   WEBHOOK_SECRET          — shared secret configured in the GitHub webhook
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key from Supabase dashboard
 *   VITE_SUPABASE_URL         — re-used from the frontend env (safe server-side too)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ─── helpers ────────────────────────────────────────────────────────────────

function verifySignature(rawBody: Buffer, secret: string, sigHeader: string | string[] | undefined): boolean {
  if (!sigHeader || Array.isArray(sigHeader)) return false;

  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader as string));
  } catch {
    return false;
  }
}

// ─── handler ────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ── 1. Read env vars ──────────────────────────────────────────────────────
  const webhookSecret  = process.env.WEBHOOK_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl    = process.env.VITE_SUPABASE_URL;

  if (!webhookSecret || !serviceRoleKey || !supabaseUrl) {
    console.error('[webhook] Missing required environment variables');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  // ── 2. Read raw body (Vercel keeps it as string/buffer via bodyParser) ────
  // Vercel parses JSON automatically; we need the raw bytes for HMAC.
  // We disable body parsing via the config export below and read it manually.
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const rawBody = Buffer.concat(chunks);

  // ── 3. Verify signature ───────────────────────────────────────────────────
  const sigHeader = req.headers['x-hub-signature-256'];
  if (!verifySignature(rawBody, webhookSecret, sigHeader)) {
    console.warn('[webhook] Invalid signature — rejected');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // ── 4. Parse body ─────────────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString('utf-8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // ── 5. Extract headers ────────────────────────────────────────────────────
  const eventType  = (req.headers['x-github-event']    as string) || 'unknown';
  const deliveryId = (req.headers['x-github-delivery'] as string) || `manual-${Date.now()}`;
  const repository = (payload.repository as Record<string, unknown>)?.full_name as string | undefined;
  const sender     = (payload.sender     as Record<string, unknown>)?.login     as string | undefined;
  const action     = payload.action as string | undefined;

  // ── 6. Insert into Supabase ───────────────────────────────────────────────
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from('github_webhooks')
    .insert({
      event_type:  eventType,
      delivery_id: deliveryId,
      repository,
      sender,
      action,
      payload,
    });

  if (error) {
    // Duplicate delivery_id → idempotent — still return 200 to GitHub
    if (error.code === '23505') {
      console.info('[webhook] Duplicate delivery ignored:', deliveryId);
      return res.status(200).json({ ok: true, duplicate: true });
    }
    console.error('[webhook] DB insert failed:', error.message);
    return res.status(500).json({ error: 'Failed to save webhook' });
  }

  console.info(`[webhook] Saved ${eventType} delivery=${deliveryId} repo=${repository ?? 'n/a'}`);
  return res.status(200).json({ ok: true });
}

// Tell Vercel NOT to parse the body — we need the raw bytes for HMAC verification
export const config = {
  api: { bodyParser: false },
};
