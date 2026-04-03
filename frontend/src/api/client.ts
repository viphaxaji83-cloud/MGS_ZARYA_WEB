const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (res.status === 401) {
      // Try refresh
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.token}`;
        const retry = await fetch(`${API_BASE}/api${path}`, { ...options, headers, credentials: 'include' });
        if (!retry.ok) throw new ApiError(retry.status, await retry.text());
        return retry.json();
      }
      window.location.href = '/login';
      throw new ApiError(401, 'Unauthorized');
    }

    if (!res.ok) {
      const body = await res.text();
      throw new ApiError(res.status, body);
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  private async tryRefresh(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: '' }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.token = data.access_token;
      localStorage.setItem('zarya_token', data.access_token);
      return true;
    } catch {
      return false;
    }
  }

  get<T>(path: string) { return this.request<T>(path); }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
  }

  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }
}

export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API Error ${status}: ${body}`);
  }
}

export const api = new ApiClient();
