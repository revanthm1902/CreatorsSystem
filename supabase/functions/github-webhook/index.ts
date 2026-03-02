/**
 * Supabase Edge Function — GitHub Webhook Receiver
 *
 * Deploy:  supabase functions deploy github-webhook --no-verify-jwt
 * Secret:  supabase secrets set WEBHOOK_SECRET=super_secret_password
 *
 * GitHub webhook payload URL:
 *   https://ubqcafqsqgpzkkymvyjg.supabase.co/functions/v1/github-webhook
 *
 * Content-Type : application/json
 * Secret       : super_secret_password
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── HMAC-SHA256 verification ─────────────────────────────────────────────────

async function verifySignature(
  rawBody: string,
  secret: string,
  sigHeader: string | null,
): Promise<boolean> {
  if (!sigHeader?.startsWith('sha256=')) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const hex = 'sha256=' + Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Timing-safe compare
  if (hex.length !== sigHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) {
    diff |= hex.charCodeAt(i) ^ sigHeader.charCodeAt(i);
  }
  return diff === 0;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  const supabaseUrl   = Deno.env.get('SUPABASE_URL');
  const serviceKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!webhookSecret || !supabaseUrl || !serviceKey) {
    console.error('[github-webhook] Missing env vars');
    return new Response('Server misconfiguration', { status: 500 });
  }

  // Read raw body (needed for HMAC)
  const rawBody = await req.text();

  // Verify signature
  const sigHeader = req.headers.get('x-hub-signature-256');
  const valid = await verifySignature(rawBody, webhookSecret, sigHeader);
  if (!valid) {
    console.warn('[github-webhook] Invalid signature — rejected');
    return new Response('Invalid signature', { status: 401 });
  }

  // Parse JSON
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Extract GitHub headers
  const eventType  = req.headers.get('x-github-event')    ?? 'unknown';
  const deliveryId = req.headers.get('x-github-delivery') ?? `manual-${Date.now()}`;
  const repository = (payload.repository as Record<string, unknown>)?.full_name as string | undefined;
  const sender     = (payload.sender     as Record<string, unknown>)?.login     as string | undefined;
  const action     = payload.action as string | undefined;

  // Insert into Supabase (service_role bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from('github_webhooks').insert({
    event_type:  eventType,
    delivery_id: deliveryId,
    repository:  repository ?? null,
    sender:      sender     ?? null,
    action:      action     ?? null,
    payload,
  });

  if (error) {
    // Duplicate delivery → idempotent, still 200 to GitHub
    if (error.code === '23505') {
      console.info('[github-webhook] Duplicate delivery ignored:', deliveryId);
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('[github-webhook] DB insert failed:', error.message);
    return new Response('Failed to save webhook', { status: 500 });
  }

  console.info(`[github-webhook] Saved ${eventType} delivery=${deliveryId} repo=${repository ?? 'n/a'}`);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
