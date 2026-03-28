// ============================================================
// API Client — Centralized HTTP client for the Express backend
// ============================================================

import { useAuthStore } from "@/stores/authStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = "GET", body, headers = {}, token } = options;

    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      // Handle 401 Unauthorized — clear auth state so AuthGuard redirects.
      // We avoid a hard window.location redirect because it can race with
      // a fresh login (onAuthStateChange hasn't fired yet, so a stale request
      // from a previous render gets a 401 and nukes the new session).
      if (response.status === 401) {
        // Clear auth store — AuthGuard will detect isAuthenticated=false
        // and redirect to /login.
        useAuthStore.getState().logout();
        throw new ApiError("Session expired. Please sign in again.", 401);
      }

      // Handle 429 Too Many Requests — rate limit
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const message = retryAfter
          ? `Rate limited. Try again in ${retryAfter} seconds.`
          : "Too many requests. Please slow down.";
        throw new ApiError(message, 429);
      }

      const error = await response.json().catch(() => ({
        message: "An unexpected error occurred",
      }));
      // Sanitize server error messages — don't expose raw details for 5xx errors
      const safeMessage = response.status >= 500
        ? "Something went wrong. Please try again."
        : (error.message || "An unexpected error occurred");
      throw new ApiError(
        safeMessage,
        response.status
      );
    }

    return response.json();
  }

  get<T>(endpoint: string, token?: string) {
    return this.request<T>(endpoint, { token });
  }

  post<T>(endpoint: string, body: unknown, token?: string) {
    return this.request<T>(endpoint, { method: "POST", body, token });
  }

  patch<T>(endpoint: string, body: unknown, token?: string) {
    return this.request<T>(endpoint, { method: "PATCH", body, token });
  }

  delete<T>(endpoint: string, token?: string) {
    return this.request<T>(endpoint, { method: "DELETE", token });
  }
}

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
