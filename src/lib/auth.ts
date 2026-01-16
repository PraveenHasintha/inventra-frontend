// inventra-frontend/src/lib/auth.ts
const TOKEN_KEY = "inventra_token";

function isBrowser() {
  return typeof window !== "undefined";
}

export function setToken(token: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore (storage might be blocked)
  }
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearToken() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}
