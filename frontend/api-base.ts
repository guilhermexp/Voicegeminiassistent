export async function getApiBase(): Promise<{ base: string; withApi: boolean }> {
  const envBase = (import.meta as any).env?.REACT_APP_BACKEND_URL || '';
  // If not provided, fall back to same-origin routing via ingress
  if (!envBase) return { base: '', withApi: false };

  // Probe the provided base to validate it's reachable
  const hasApi = envBase.endsWith('/api');
  const healthUrl = hasApi ? `${envBase}/health` : `${envBase}/api/health`;

  try {
    const res = await fetch(healthUrl, { method: 'GET' });
    if (res.ok) return { base: envBase, withApi: hasApi };
  } catch (_) {
    // ignore; we'll fallback
  }
  // Fallback to same-origin '/api'
  return { base: '', withApi: false };
}

export function toWsUrl(httpBase: string): string {
  if (httpBase) {
    return httpBase.replace('https://', 'wss://').replace('http://', 'ws://');
  }
  const { protocol, host } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${host}`;
}