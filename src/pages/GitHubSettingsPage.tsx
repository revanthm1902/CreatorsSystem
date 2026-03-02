import { useState, useRef } from 'react';
import { Github, Trash2, Save, Eye, EyeOff, ChevronDown, ChevronUp, Loader2, RefreshCw, Check, ExternalLink } from 'lucide-react';
import { loadGHSettings, saveGHSettings, type GHRepo } from '../lib/githubSettings';

const S = { backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' };
const CARD = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' };
const IC = 'px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full';

interface Repo { full_name: string; private: boolean; open_issues_count: number }

async function ghFetch(path: string, token: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(res.status === 401 ? 'Invalid token.' : `GitHub ${res.status}`);
  return res.json();
}

export function GitHubSettingsPage() {
  const saved = loadGHSettings();
  const [token, setToken] = useState(saved.token);
  const [repos, setRepos] = useState<GHRepo[]>(saved.repos);
  const [showToken, setShowToken] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [guideOpen, setGuideOpen] = useState(!saved.token);
  const [discovered, setDiscovered] = useState<Repo[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const discover = async (t: string) => {
    if (!t.trim()) { setDiscovered([]); return; }
    setDiscovering(true); setDiscoverError('');
    try { setDiscovered(await ghFetch('/user/repos?per_page=100&visibility=all&affiliation=owner,organization_member&sort=full_name', t)); }
    catch (e) { setDiscoverError(e instanceof Error ? e.message : 'Failed'); }
    finally { setDiscovering(false); }
  };

  const onTokenChange = (t: string) => {
    setToken(t); setDiscoverError('');
    if (timer.current) clearTimeout(timer.current);
    if (t.length > 10) timer.current = setTimeout(() => discover(t), 700);
    else setDiscovered([]);
  };

  const isAdded = (full_name: string) => repos.some(r => `${r.owner}/${r.repo}` === full_name);
  const toggleRepo = (full_name: string) => {
    if (isAdded(full_name)) return setRepos(r => r.filter(x => `${x.owner}/${x.repo}` !== full_name));
    const [owner, repo] = full_name.split('/');
    setRepos(r => [...r, { owner, repo, label: full_name }]);
  };

  const save = () => { saveGHSettings({ token, repos, enabled: loadGHSettings().enabled }); setSavedOk(true); setTimeout(() => setSavedOk(false), 2500); };

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Github className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>GitHub Settings</h1>
      </div>

      {/* PAT guide */}
      <section className="rounded-xl overflow-hidden" style={CARD}>
        <button onClick={() => setGuideOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          <span className="flex items-center gap-2"><ExternalLink className="w-4 h-4 text-primary" />How to create a Fine-Grained PAT</span>
          {guideOpen ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
        </button>
        {guideOpen && (
          <ol className="px-4 pb-4 space-y-2 text-xs" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
            <li className="pt-3">1. Go to <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer" className="text-primary underline">github.com/settings/personal-access-tokens/new</a></li>
            <li>2. Set <b style={{ color: 'var(--text-primary)' }}>Token name</b> and a long <b style={{ color: 'var(--text-primary)' }}>Expiration</b></li>
            <li>3. <b style={{ color: 'var(--text-primary)' }}>Resource owner</b>  select your <em>organisation</em> (not personal account)</li>
            <li>4. <b style={{ color: 'var(--text-primary)' }}>Repository access</b>  All repositories (or specific ones)</li>
            <li>5. <b style={{ color: 'var(--text-primary)' }}>Permissions  Repository  Contents</b>  Read-only</li>
            <li>6. Generate &amp; paste below. as Org tokens may need admin approval at <em>github.com/organizations/[org]/settings/personal-access-tokens</em></li>
          </ol>
        )}
      </section>

      {/* Token */}
      <section className="rounded-xl p-4 space-y-3" style={CARD}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Personal Access Token</h2>
        <div className="flex items-center gap-2">
          <input className={IC} style={S} type={showToken ? 'text' : 'password'} value={token}
            onChange={e => onTokenChange(e.target.value)} placeholder="github_pat_ or ghp_" />
          <button onClick={() => setShowToken(v => !v)} className="p-2 rounded-lg shrink-0" style={{ color: 'var(--text-muted)' }}>
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button onClick={() => discover(token)} disabled={discovering || !token.trim()}
            className="p-2 rounded-lg shrink-0 disabled:opacity-40" style={{ color: 'var(--text-muted)' }} title="Refresh">
            {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
        {discoverError && <p className="text-xs text-danger">{discoverError}</p>}
        {discovering && <p className="text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>Fetching repos</p>}
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Stored in localStorage only. Never sent anywhere except GitHub.</p>
      </section>

      {/* Discovered picker */}
      {discovered.length > 0 && (
        <section className="rounded-xl p-4 space-y-2" style={CARD}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Select Repositories <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>({discovered.length} found)</span>
          </h2>
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {discovered.map(d => (
              <button key={d.full_name} onClick={() => toggleRepo(d.full_name)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors"
                style={isAdded(d.full_name) ? { backgroundColor: 'var(--color-primary)', color: '#fff' } : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                {isAdded(d.full_name) ? <Check className="w-4 h-4 shrink-0" /> : <Github className="w-4 h-4 shrink-0 opacity-40" />}
                <span className="flex-1 font-mono truncate">{d.full_name}</span>
                <span className="text-[11px] opacity-60">{d.open_issues_count} open</span>
                {d.private && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>private</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Active repos */}
      {repos.length > 0 && (
        <section className="rounded-xl p-4 space-y-2" style={CARD}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Active Repositories</h2>
          {repos.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <Github className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <span className="flex-1 font-mono truncate" style={{ color: 'var(--text-primary)' }}>{r.owner}/{r.repo}</span>
              <button onClick={() => setRepos(rs => rs.filter((_, j) => j !== i))} className="p-1 rounded hover:text-danger" style={{ color: 'var(--text-muted)' }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Enable / Disable toggle */}
      <section className="rounded-xl p-4 flex items-center justify-between" style={CARD}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>GitHub Integration</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Show GitHub autofill when creating tasks</p>
        </div>
        <button onClick={() => { const s = loadGHSettings(); s.enabled = !s.enabled; saveGHSettings(s); setRepos([...s.repos]); /* force re-render */ }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${loadGHSettings().enabled ? 'bg-green-600 text-white' : 'bg-surface-600 text-white'}`}>
          {loadGHSettings().enabled ? 'Enabled' : 'Disabled'}
        </button>
      </section>

      <button onClick={save} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm">
        <Save className="w-4 h-4" />{savedOk ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
