import type { MobileAuthResponse } from "@/api/mobileTypes";
import type { CurrentUser } from "@/api/types";
import { personas } from "./personas";

/** Where the token manager keeps the refresh token in the secure store. */
export const REFRESH_TOKEN_KEY = "idi.refreshToken";

/** The refresh tokens of sign-outs the API hasn't heard about yet, as a JSON list. */
export const UNFINISHED_SIGN_OUTS_KEY = "idi.unfinishedSignOuts";

/** A mobile sign-in or refresh answer, as the API sends it. */
export function authResponse(
  change: Partial<Omit<MobileAuthResponse, "user">> & { user?: CurrentUser } = {},
): MobileAuthResponse {
  return {
    accessToken: "access-1",
    accessTokenExpiresAt: "2026-10-08T12:15:00Z",
    refreshToken: "refresh-1",
    refreshTokenExpiresAt: "2026-11-07T12:00:00Z",
    user: personas.designEmployee,
    ...change,
  };
}
