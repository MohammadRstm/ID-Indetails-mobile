import { create } from "axios";
import { toApiError } from "@/api/errors";
import type { MobileAuthResponse } from "@/api/mobileTypes";
import { env } from "@/config/env";

/*
 * The mobile sign-in endpoints (docs/contracts.md section 2). They go around `http` and its 401 handling, so a
 * failed refresh can never start another one. Every failure rejects with an ApiError.
 */

const client = create({
  baseURL: `${env.apiUrl}/api/mobile/auth`,
  timeout: 30_000,
  headers: { Accept: "application/json" },
});

async function post<T>(path: string, body: unknown): Promise<T> {
  try {
    const { data } = await client.post<T>(path, body);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    post<MobileAuthResponse>("/login", { email, password }),

  refresh: (refreshToken: string) => post<MobileAuthResponse>("/refresh", { refreshToken }),

  logout: (refreshToken: string) => post<void>("/logout", { refreshToken }),
};
