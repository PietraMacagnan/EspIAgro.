import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

import { getAccessToken } from "@/lib/auth-storage";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && Boolean(window.location);
}

function isLocalHost(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname);
}

function isLoopbackUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return isLocalHost(parsedUrl.hostname);
  } catch {
    return false;
  }
}

function getBrowserApiBaseUrl(): string {
  if (!isBrowserEnvironment()) {
    return "http://127.0.0.1:8000/api";
  }

  const { protocol, hostname } = window.location;

  return `${protocol}//${hostname}:8000/api`;
}

function resolveApiBaseUrl(): string {
  const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const browserApiBaseUrl = getBrowserApiBaseUrl();

  if (!rawApiBaseUrl) {
    return browserApiBaseUrl;
  }

  if (
    isBrowserEnvironment() &&
    !isLocalHost(window.location.hostname) &&
    isLoopbackUrl(rawApiBaseUrl)
  ) {
    return browserApiBaseUrl;
  }

  return rawApiBaseUrl;
}

const apiBaseUrl = normalizeBaseUrl(resolveApiBaseUrl());

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

export default http;