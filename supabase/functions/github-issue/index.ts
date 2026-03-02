// @ts-nocheck — Deno runtime; Node/tsc errors here are false positives.
/**
 * Supabase Edge Function — GitHub Issue Autofill
 *
 * Accepts a GitHub issue URL + optional PAT (passed from browser localStorage),
 * fetches the issue via GitHub REST API, and returns structured data.
 *
 * Deploy:
 *   npx supabase functions deploy github-issue
 *
 * No secrets required — token is supplied by the browser.
 *
 * Request:
 *   POST  body: { "url": "https://github.com/owner/repo/issues/123" }
 *
 * Response:
 *   { number, title, body, url, state, labels: string[] }
 */

import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, token: bodyToken } = await req.json() as { url?: string; token?: string };

    if (!url) {
      return json({ error: 'Missing url field' }, 400);
    }

    // Parse GitHub issue URL
    // Supported formats:
    //   https://github.com/owner/repo/issues/123
    //   https://github.com/owner/repo/issues/123#issuecomment-xxx
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    if (!match) {
      return json({ error: 'Invalid GitHub issue URL. Expected: https://github.com/owner/repo/issues/123' }, 400);
    }

    const [, owner, repo, issueNumber] = match;
    const githubToken = bodyToken; // provided by browser — stored in localStorage

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'CreatorsSystem/1.0',
    };
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;
    const res = await fetch(apiUrl, { headers });

    if (!res.ok) {
      const errText = await res.text();
      const msg = res.status === 404
        ? `Issue not found: ${owner}/${repo}#${issueNumber}`
        : res.status === 401
        ? 'GitHub token invalid or missing — cannot access private repo'
        : `GitHub API error ${res.status}: ${errText}`;
      return json({ error: msg }, res.status === 404 ? 404 : 502);
    }

    const data = await res.json();

    return json({
      number:  data.number,
      title:   data.title,
      body:    data.body ?? '',
      url:     data.html_url,
      state:   data.state,
      labels:  (data.labels ?? []).map((l: { name: string }) => l.name),
    }, 200);

  } catch (err) {
    console.error('[github-issue]', err);
    return json({ error: 'Internal server error' }, 500);
  }
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
