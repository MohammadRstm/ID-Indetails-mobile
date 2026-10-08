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

http.interceptors.request.use((config) => {
  const token = tokenManager.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { retriedAfterRefresh?: boolean };

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    if (error.response?.status === 401 && config && !config.retriedAfterRefresh) {
      config.retriedAfterRefresh = true;
      let token: string | null;
      try {
        token = await tokenManager.refresh();
      } catch (refreshError) {
        // The refresh couldn't reach the API: this request fails, the session is kept.
        return Promise.reject(toApiError(refreshError));
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return http(config);
      }
    }
    return Promise.reject(toApiError(error));
  },
);
