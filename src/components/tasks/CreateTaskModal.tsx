import { useState, useEffect, useMemo } from 'react';
import { X, Save, Calendar, Zap, Github, Loader2, Check, Link } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import { getMinDateTimeLocal } from '../../lib/dateUtils';
import { supabase } from '../../lib/supabase';
import { loadGHSettings } from '../../lib/githubSettings';

interface CreateTaskModalProps { onClose: () => void }
interface GHIssue { number: number; title: string; body: string | null; state: string; assignees?: { login: string }[]; milestone?: { due_on: string | null } | null }

// Auto-calc tokens: (deadline - today) in days * 2, clamped 1–1000
const calcTokens = (dl: string) => {
  const days = Math.max(1, Math.ceil((new Date(dl).getTime() - Date.now()) / 86400000));
  return Math.min(1000, days * 2);
};

export function CreateTaskModal({ onClose }: CreateTaskModalProps) {
  const gh = useMemo(() => loadGHSettings(), []);
  const ghEnabled = gh.enabled && !!gh.token;
  const hasRepos = gh.repos.length > 0;

  const [selectedRepo, setSelectedRepo] = useState(hasRepos ? `${gh.repos[0].owner}/${gh.repos[0].repo}` : '');
  const [issues, setIssues] = useState<GHIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofillError, setAutofillError] = useState('');
  const [filledIssue, setFilledIssue] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [powUrl, setPowUrl] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [tokens, setTokens] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { createTask } = useTaskStore();
  const { users, fetchUsers, loading: usersLoading } = useUserStore();
  const { profile } = useAuthStore();

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Fetch issues when repo selected
  useEffect(() => {
    if (!ghEnabled || !selectedRepo) { setIssues([]); return; }
    const [owner, repo] = selectedRepo.split('/');
    setIssuesLoading(true); setAutofillError('');
    fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=50&sort=updated`, {
      headers: { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json' },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: GHIssue[]) => {
        const filtered = data.filter(i => !('pull_request' in i));
        // Sort: open first, then closed
        filtered.sort((a: GHIssue, b: GHIssue) => a.state === b.state ? 0 : a.state === 'open' ? -1 : 1);
        setIssues(filtered);
      })
      .catch(() => setIssues([]))
      .finally(() => setIssuesLoading(false));
  }, [selectedRepo, ghEnabled, gh.token]);

  const fillFromIssue = (issue: GHIssue) => {
    setTitle(issue.title);
    setDescription((issue.body ?? '').slice(0, 1000));
    setFilledIssue(issue.number);
    setAutofillError('');
    // Auto-select assignee by matching GitHub username → profile.github_url
    if (issue.assignees?.length) {
      const login = issue.assignees[0].login.toLowerCase();
      const match = userOptions.find(u => u.github_url?.toLowerCase().includes(login));
      if (match) setAssignedTo(match.id);
    }
    // Auto-fill deadline from milestone due_on
    if (issue.milestone?.due_on) {
      const dl = new Date(issue.milestone.due_on).toISOString().slice(0, 16);
      setDeadline(dl);
      setTokens(calcTokens(dl));
    }
  };

  // Fallback: fetch via edge function when no repos configured (URL paste path)
  const handleUrlAutofill = async () => {
    if (!githubUrl.trim()) return;
    setAutofillLoading(true); setAutofillError('');
    const { data, error: e } = await supabase.functions.invoke<GHIssue & { error?: string }>(
      'github-issue',
      { body: { url: githubUrl.trim(), ...(gh.token ? { token: gh.token } : {}) } },
    );
    setAutofillLoading(false);
    if (e || !data) return setAutofillError((e as { message?: string })?.message ?? 'Failed');
    if (data.error) return setAutofillError(data.error);
    fillFromIssue(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!profile) return;
    if (new Date(deadline) <= new Date()) return setError('Deadline must be in the future');
    setLoading(true);
    try {
      const result = await createTask({
        title, description, assigned_to: assignedTo, created_by: profile.id,
        deadline: new Date(deadline).toISOString(), tokens, status: 'Pending', director_approved: false,
        pow_url: powUrl.trim() || null, issue_state: null,
      }, profile.role);
      if (result.error) setError(result.error);
      else onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally { setLoading(false); }
  };

  const userOptions = users.filter(u => u.role === 'User');
  const minDateTime = getMinDateTimeLocal();
  const F = 'w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all';
  const FS = { backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg lg:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="modal-pull-indicator sm:hidden" />
        <div className="flex items-center justify-between p-4 sm:p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Create New Task</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-primary/10" style={{ color: 'var(--text-secondary)' }}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">

          {/* GitHub autofill — only when enabled */}
          {ghEnabled && <div className="rounded-xl p-3.5 space-y-2.5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Autofill from GitHub Issue</span>
            </div>

            {hasRepos ? (
              <>
                <select value={selectedRepo} onChange={e => { setSelectedRepo(e.target.value); setFilledIssue(null); }}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" style={FS}>
                  {gh.repos.map(r => (
                    <option key={`${r.owner}/${r.repo}`} value={`${r.owner}/${r.repo}`}>{r.label || `${r.owner}/${r.repo}`}</option>
                  ))}
                </select>

                {issuesLoading && (
                  <div className="flex items-center gap-2 text-xs py-1" style={{ color: 'var(--text-muted)' }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading issues
                  </div>
                )}

                {!issuesLoading && issues.length > 0 && (
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
                    {issues.map(issue => (
                      <button key={issue.number} type="button" onClick={() => fillFromIssue(issue)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors"
                        style={filledIssue === issue.number
                          ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
                          : { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }
                        }
                      >
                        {filledIssue === issue.number
                          ? <Check className="w-3.5 h-3.5 shrink-0" />
                          : <>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${issue.state === 'open' ? 'bg-green-500' : 'bg-purple-500'}`} />
                              <span className="text-[11px] font-mono shrink-0 opacity-50">#{issue.number}</span>
                            </>
                        }
                        <span className="truncate">{issue.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${issue.state === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>{issue.state}</span>
                      </button>
                    ))}
                  </div>
                )}

                {!issuesLoading && issues.length === 0 && gh.token && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No issues found.</p>
                )}
                {!gh.token && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add a token in GitHub Settings to load issues.</p>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <input type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleUrlAutofill())}
                  placeholder="https://github.com/owner/repo/issues/123"
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" style={FS} />
                <button type="button" onClick={handleUrlAutofill} disabled={autofillLoading || !githubUrl.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white disabled:opacity-50 shrink-0">
                  {autofillLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Autofill'}
                </button>
              </div>
            )}

            {autofillError && <p className="text-xs text-danger">{autofillError}</p>}
            {filledIssue && !autofillError && (
              <p className="text-xs" style={{ color: 'var(--color-primary)' }}>Filled from issue #{filledIssue}</p>
            )}
          </div>}

          {error && <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Task Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
              className={F} style={FS} placeholder="Enter task title" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className={`${F} resize-none`} style={FS} placeholder="Describe the task" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              <Link className="w-4 h-4 inline mr-1" />Reference <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <input type="url" value={powUrl} onChange={e => setPowUrl(e.target.value)}
              className={F} style={FS} placeholder="https://link-to-proof.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Assign To</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} required
              disabled={usersLoading && userOptions.length === 0} className={F} style={FS}>
              <option value="">{usersLoading && !userOptions.length ? 'Loading' : 'Select a user'}</option>
              {userOptions.map(u => {
                const ghName = u.github_url?.replace(/.*github\.com\//, '').replace(/\/.*/, '') || '';
                return <option key={u.id} value={u.id}>{u.full_name} ({u.employee_id}){ghName ? ` — @${ghName}` : ''}</option>;
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Calendar className="w-4 h-4 inline mr-1" />Deadline
              </label>
              <input type="datetime-local" value={deadline} onChange={e => { setDeadline(e.target.value); setTokens(calcTokens(e.target.value)); }}
                required min={minDateTime} className={F} style={FS} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Zap className="w-4 h-4 inline mr-1" />Token Value
              </label>
              <input type="number" value={tokens} onChange={e => setTokens(parseInt(e.target.value) || 0)}
                min={0} max={1000} required className={F} style={FS} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-lg"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg disabled:opacity-50">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Save className="w-5 h-5" />Create Task</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
