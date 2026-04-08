const rawApiBaseUrl =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://chincoa-backend.onrender.com');

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '');
export const hasApiBaseUrl = API_BASE_URL.length > 0;

export interface BackendHealth {
  status: string;
  service: string;
  timestamp: string;
}

export async function getBackendHealth(): Promise<BackendHealth> {
  if (!hasApiBaseUrl) {
    throw new Error('VITE_API_URL is not configured');
  }

  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`);
  }

  const payload = (await response.json()) as
    | BackendHealth
    | { success?: boolean; data?: BackendHealth };

  if ("data" in payload && payload.data) {
    return payload.data;
  }

  return payload as BackendHealth;
}
