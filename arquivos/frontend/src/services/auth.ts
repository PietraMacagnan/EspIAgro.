import type { AuthTokens } from "@/lib/auth-storage";
import {
  clearAuthTokens,
  getAuthTokens,
  getRefreshToken,
  hasAuthSession,
  setAuthTokens,
  updateStoredAccessToken,
} from "@/lib/auth-storage";
import http from "@/services/http";

export type LoginPayload = {
  username: string;
  password: string;
};

export type RefreshPayload = {
  refresh: string;
};

export type RefreshResponse = {
  access: string;
};

export type DeleteAccountPayload = {
  password: string;
  confirmation_text: string;
};

export type DeleteAccountResponse = {
  detail: string;
};

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const normalizedPayload: LoginPayload = {
    username: payload.username.trim(),
    password: payload.password,
  };

  const { data } = await http.post<AuthTokens>("/auth/login/", normalizedPayload);
  setAuthTokens(data);
  return data;
}

export async function refreshAccessToken(
  payload: RefreshPayload,
): Promise<RefreshResponse> {
  const { data } = await http.post<RefreshResponse>("/auth/refresh/", payload);
  updateStoredAccessToken(data.access);
  return data;
}

export async function refreshCurrentSession(): Promise<string | null> {
  const refresh = getRefreshToken();

  if (!refresh) {
    return null;
  }

  const response = await refreshAccessToken({ refresh });
  return response.access;
}

export async function deleteAccount(
  payload: DeleteAccountPayload,
): Promise<DeleteAccountResponse> {
  const normalizedPayload: DeleteAccountPayload = {
    password: payload.password,
    confirmation_text: payload.confirmation_text.trim().toUpperCase(),
  };

  const { data } = await http.delete<DeleteAccountResponse>(
    "/auth/delete-account/",
    {
      data: normalizedPayload,
    },
  );

  clearAuthTokens();
  return data;
}

export function getStoredSession(): AuthTokens | null {
  return getAuthTokens();
}

export function isAuthenticated(): boolean {
  return hasAuthSession();
}

export function logout(): void {
  clearAuthTokens();
}