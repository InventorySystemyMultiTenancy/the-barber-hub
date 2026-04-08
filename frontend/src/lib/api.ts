const rawApiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '');

export interface BackendHealth {
  status: string;
  service: string;
  timestamp: string;
}

export async function getBackendHealth(): Promise<BackendHealth> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`);
  }

  return (await response.json()) as BackendHealth;
}
