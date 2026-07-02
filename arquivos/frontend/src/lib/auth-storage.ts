const ACCESS_TOKEN_KEY = "espiagro.access_token";
const REFRESH_TOKEN_KEY = "espiagro.refresh_token";

export type AuthTokens = {
  access: string;
  refresh: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!isBrowser()) {
    return null;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) {
    return null;
  }

  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getAuthTokens(): AuthTokens | null {
  const access = getAccessToken();
  const refresh = getRefreshToken();

  if (!access || !refresh) {
    return null;
  }

  return {
    access,
    refresh,
  };
}

export function setAccessToken(accessToken: string): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function setRefreshToken(refreshToken: string): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function setAuthTokens(tokens: AuthTokens): void {
  setAccessToken(tokens.access);
  setRefreshToken(tokens.refresh);
}

export function updateStoredAccessToken(accessToken: string): void {
  setAccessToken(accessToken);
}

export function clearAuthTokens(): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasAuthSession(): boolean {
  return Boolean(getAccessToken());
}