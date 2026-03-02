import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Loader2, GitPullRequest, RefreshCw, Check } from 'lucide-react';
import { Markdown } from '../ui/Markdown';
import { loadGHSettings } from '../../lib/githubSettings';

interface IssueData { number: number; title: string; body: string | null; state: string; assignees?: { login: string; avatar_url: string }[]; labels?: { name: string; color: string }[]; created_at: string; html_url: string }
interface GHIssueShort { number: number; title: string; state: string; pull_request?: unknown }

const GH_RE = /github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/;

/** Compact badge showing GH issue open/closed state. Click → full modal. Refresh button re-fetches state. */
export function GHIssueBadge({ url, onRefresh }: { url: string; onRefresh?: () => void }) {
  const gh = useMemo(() => loadGHSettings(), []);
  const match = url.match(GH_RE);
  const [issue, setIssue] = useState<IssueData | null>(null);
  const [showModal, setShowModal] = useState(false);

  const owner = match?.[1] ?? '';
  const repo = match?.[2] ?? '';
  const num = match?.[3] ?? '';
  const active = gh.enabled && !!gh.token && !!match;

  const fetchIssue = useCallback(() => {
    if (!active) return;
    fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${num}`, {
      headers: { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json' },
    }).then(r => r.ok ? r.json() : null).then(d => { if (d) setIssue(d); onRefresh?.(); }).catch(() => {});
  }, [active, owner, repo, num, gh.token, onRefresh]);

  useEffect(() => { fetchIssue(); }, [fetchIssue]);

  if (!match) return null;
  if (!active || !issue) return (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-gray-500/15 text-gray-400 border-gray-500/30 hover:bg-gray-500/25 transition-all">
      <GitPullRequest className="w-3 h-3" />#{num}
    </a>
  );

  const isOpen = issue.state === 'open';

  return (
    <>
      <button type="button" onClick={e => { e.stopPropagation(); setShowModal(true); }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer ${isOpen ? 'bg-green-500/15 text-green-500 border-green-500/30' : 'bg-purple-500/15 text-purple-400 border-purple-500/30'}`}>
        <GitPullRequest className="w-3 h-3" />#{issue.number} {issue.state}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowModal(false)}>
          <div className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg lg:max-w-3xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-pull-indicator sm:hidden" />
            <div className="flex items-start justify-between p-4 sm:p-6 gap-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isOpen ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>{issue.state}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>#{issue.number}</span>
                  <button onClick={fetchIssue} className="p-1 rounded hover:bg-primary/10 transition-all" style={{ color: 'var(--text-muted)' }} title="Refresh">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{issue.title}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-primary/10 shrink-0" style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {issue.labels && issue.labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {issue.labels.map(l => (
                    <span key={l.name} className="px-2 py-0.5 rounded-full text-[11px] font-medium border" style={{ backgroundColor: `#${l.color}20`, color: `#${l.color}`, borderColor: `#${l.color}40` }}>{l.name}</span>
                  ))}
                </div>
              )}
              {issue.assignees && issue.assignees.length > 0 && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-medium">Assignees:</span>
                  {issue.assignees.map(a => (
                    <span key={a.login} className="inline-flex items-center gap-1">
                      <img src={a.avatar_url} className="w-5 h-5 rounded-full" alt="" />@{a.login}
                    </span>
                  ))}
                </div>
              )}
              {issue.body ? <Markdown>{issue.body}</Markdown> : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No description.</p>}
              <a href={issue.html_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium underline" style={{ color: 'var(--color-primary)' }}>
                View on GitHub ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Smart issue picker: repo selector → issue list → pick. Also supports edit/unlink. */
export function LinkIssueButton({ currentUrl, onSave, onUnlink }: { currentUrl?: string | null; onSave: (url: string) => void; onUnlink?: () => void }) {
  const gh = useMemo(() => loadGHSettings(), []);
  const [open, setOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(gh.repos.length ? `${gh.repos[0].owner}/${gh.repos[0].repo}` : '');
  const [issues, setIssues] = useState<GHIssueShort[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);

  const fetchIssues = useCallback(() => {
    if (!open || !selectedRepo || !gh.token) return;
    const [owner, repo] = selectedRepo.split('/');
    fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=50&sort=updated`, {
      headers: { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json' },
    }).then(r => r.ok ? r.json() : [])
      .then((d: GHIssueShort[]) => setIssues(d.filter(i => !i.pull_request).sort((a, b) => a.state === b.state ? 0 : a.state === 'open' ? -1 : 1)))
      .catch(() => setIssues([]))
      .finally(() => setIssuesLoading(false));
  }, [open, selectedRepo, gh.token]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  const pick = (issue: GHIssueShort) => {
    const [owner, repo] = selectedRepo.split('/');
    onSave(`https://github.com/${owner}/${repo}/issues/${issue.number}`);
    setOpen(false);
  };

  const isLinked = !!currentUrl;
  const btnLabel = isLinked ? 'Edit Issue' : 'Link Issue';

  if (!open) return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => { setIssuesLoading(true); setOpen(true); }}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all hover:border-primary/50"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}>
        <GitPullRequest className="w-3 h-3" />{btnLabel}
      </button>
      {isLinked && onUnlink && (
        <button type="button" onClick={onUnlink}
          className="px-2 py-1 rounded-lg text-xs font-medium text-danger hover:bg-danger/10 transition-all" title="Unlink issue">✕</button>
      )}
    </div>
  );

  return (
    <div className="w-full rounded-xl p-3 space-y-2" onClick={e => e.stopPropagation()}
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Pick an issue</span>
        <button type="button" onClick={() => setOpen(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>
      {gh.repos.length > 1 && (
        <select value={selectedRepo} onChange={e => { setIssuesLoading(true); setSelectedRepo(e.target.value); }}
          className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
          {gh.repos.map(r => <option key={`${r.owner}/${r.repo}`} value={`${r.owner}/${r.repo}`}>{r.label || `${r.owner}/${r.repo}`}</option>)}
        </select>
      )}
      {issuesLoading && <div className="flex items-center gap-1.5 text-xs py-1" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-3 h-3 animate-spin" />Loading…</div>}
      {!issuesLoading && issues.length > 0 && (
        <div className="max-h-40 overflow-y-auto space-y-0.5">
          {issues.map(i => (
            <button key={i.number} type="button" onClick={() => pick(i)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors hover:bg-primary/10"
              style={{ color: 'var(--text-primary)' }}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${i.state === 'open' ? 'bg-green-500' : 'bg-purple-500'}`} />
              <span className="font-mono opacity-50 shrink-0">#{i.number}</span>
              <span className="truncate flex-1">{i.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${i.state === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>{i.state}</span>
              {currentUrl?.includes(`/issues/${i.number}`) && <Check className="w-3 h-3 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
      {!issuesLoading && issues.length === 0 && <p className="text-xs py-1" style={{ color: 'var(--text-muted)' }}>No issues found.</p>}
    </div>
  );
}
