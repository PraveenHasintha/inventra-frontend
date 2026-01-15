/**
 * API helper:
 * - calls backend
 * - adds Authorization header if token exists
 */
import { getToken } from "./auth";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? getToken() : null;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `API error: ${res.status}`);
  }

  return res.json();
}
