const KEY = 'github_settings';

export interface GHRepo { owner: string; repo: string; label: string }
export interface GHSettings { token: string; repos: GHRepo[]; enabled: boolean }

const DEFAULTS: GHSettings = { token: '', repos: [], enabled: false };

export const loadGHSettings = (): GHSettings => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; }
  catch { return DEFAULTS; }
};

export const saveGHSettings = (s: GHSettings) =>
  localStorage.setItem(KEY, JSON.stringify(s));
