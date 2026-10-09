import { create, type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { tokenManager } from "@/auth/tokenManager";
import { env } from "@/config/env";
import { toApiError } from "./errors";

/*
 * Every call to the API goes through `http`. It sends the access token; on a 401 it refreshes the session once,
 * through the token manager's single refresh, and repeats the request. Failures always reject with an ApiError.
 */

export const http = create({
  baseURL: `${env.apiUrl}/api`,
  timeout: 30_000,
  headers: { Accept: "application/json" },
  // Arrays go as repeated keys (sections=a&sections=b), the way ASP.NET binds them.
  paramsSerializer: { indexes: null },
});

const bearer = (token: string) => `Bearer ${token}`;

http.interceptors.request.use((config) => {
  const token = tokenManager.getAccessToken();
  if (token) config.headers.Authorization = bearer(token);
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { retriedAfterRefresh?: boolean };

/** The access token to repeat a refused request with, or null when the session has ended. */
async function freshToken(sentWith: unknown): Promise<string | null> {
  // A refresh finished while this request was out: its token is already new, no need for another refresh.
  const current = tokenManager.getAccessToken();
  if (current && sentWith !== bearer(current)) return current;
  return tokenManager.refresh();
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    if (error.response?.status === 401 && config && !config.retriedAfterRefresh) {
      config.retriedAfterRefresh = true;
      let token: string | null;
      try {
        token = await freshToken(config.headers.Authorization);
      } catch (refreshError) {
        // The refresh couldn't reach the API: this request fails, the session is kept.
        return Promise.reject(toApiError(refreshError));
      }
      if (token) {
        config.headers.Authorization = bearer(token);
        return http(config);
      }
    }
    return Promise.reject(toApiError(error));
  },
);
