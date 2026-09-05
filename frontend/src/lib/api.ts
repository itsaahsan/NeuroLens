const BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

export function getToken() { return localStorage.getItem('nl_token') || ''; }
export function setToken(t: string) { localStorage.setItem('nl_token', t); }
export function clearToken() { localStorage.removeItem('nl_token'); }

async function req(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((opts.headers as any) || {}) };
  const tok = getToken();
  if (tok) headers.Authorization = `Bearer ${tok}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Request failed: ${path}`);
  }
  return res.json();
}

export const api = {
  register: (email: string, password: string, display_name = 'Alex') =>
    req('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, display_name }) }),
  login: (email: string, password: string) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  dashboard: () => req('/dashboard'),
  observations: () => req('/observations'),
  addObservation: (b: any) => req('/observations', { method: 'POST', body: JSON.stringify(b) }),
  checkins: () => req('/check-ins'),
  addCheckin: (b: any) => req('/check-ins', { method: 'POST', body: JSON.stringify(b) }),
  exercises: () => req('/exercises'),
  addExercise: (b: any) => req('/exercises', { method: 'POST', body: JSON.stringify(b) }),
  runAnalysis: () => req('/analysis', { method: 'POST' }),
  insights: () => req('/insights'),
  learn: () => req('/learn'),
  safetyCheck: (text: string) => req(`/safety-check?text=${encodeURIComponent(text)}`),
  createReport: () => req('/reports', { method: 'POST' }),
  reports: () => req('/reports'),
  exportData: () => req('/user/export'),
  deleteData: () => req('/user/data', { method: 'DELETE' }),
};
