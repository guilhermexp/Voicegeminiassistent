export interface ApiBaseInfo { base: string; withApi: boolean }

export async function detectApiBase(): Promise<ApiBaseInfo> {
  // 1) Try env-provided base
  const envBase = (import.meta as any).env?.REACT_APP_BACKEND_URL || '';
  if (envBase) {
    const hasApi = envBase.endsWith('/api');
    const healthUrl = hasApi ? `${envBase}/health` : `${envBase}/api/health`;
    try {
      const res = await fetch(healthUrl, { method: 'GET' });
      if (res.ok) return { base: envBase, withApi: hasApi };
    } catch (_) {}
  }

  // 2) Try same-origin '/api'
  try {
    const res2 = await fetch(`/api/health`, { method: 'GET' });
    if (res2.ok) return { base: '', withApi: false };
  } catch (_) {}

  // 3) Preview/dev fallback to local backend port (supervisor)
  try {
    const local = `http://localhost:8001`;
    const res3 = await fetch(`${local}/api/health`, { method: 'GET' });
    if (res3.ok) return { base: local, withApi: false };
  } catch (_) {}

  // Default to same-origin '/api'
  return { base: '', withApi: false };
}

export function httpUrl(base: string, withApi: boolean, path: string): string {
  if (!base) return `/api${path}`;
  return withApi ? `${base}${path}` : `${base}/api${path}`;
}

export function wsRootFromHttp(base: string): string {
  if (base) return base.replace('https://', 'wss://').replace('http://', 'ws://');
  const { protocol, host } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${host}`;
}