import { create } from "axios";
import { toApiError } from "@/api/errors";
import type { MobileAuthResponse } from "@/api/mobileTypes";
import { env } from "@/config/env";

/*
 * The signed-out auth endpoints (docs/contracts.md section 2). They go around `http` and its 401 handling, so a
 * failed refresh can never start another one. Every failure rejects with an ApiError.
 */

const client = create({
  baseURL: `${env.apiUrl}/api`,
  timeout: 30_000,
  headers: { Accept: "application/json" },
});

/** Signing out never keeps the person waiting long: a sign-out the API didn't hear about still happens here. */
const LOGOUT_TIMEOUT_MS = 5_000;

async function post<T>(path: string, body: unknown, timeout?: number): Promise<T> {
  try {
    const { data } = await client.post<T>(path, body, timeout ? { timeout } : undefined);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    post<MobileAuthResponse>("/mobile/auth/login", { email, password }),

  refresh: (refreshToken: string) =>
    post<MobileAuthResponse>("/mobile/auth/refresh", { refreshToken }),

  logout: (refreshToken: string) =>
    post<void>("/mobile/auth/logout", { refreshToken }, LOGOUT_TIMEOUT_MS),

  /** Always answers 204, whether or not the address has an account. */
  forgotPassword: (email: string) => post<void>("/auth/forgot-password", { email }),
};
