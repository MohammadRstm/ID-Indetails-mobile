import * as SecureStore from "expo-secure-store";
import { toApiError } from "@/api/errors";
import type { MobileAuthResponse } from "@/api/mobileTypes";
import { authApi } from "./authApi";

/*
 * The session's tokens (phase-0-plan.md section 6).
 *
 * - The access token lives in memory only.
 * - The refresh token lives only in the secure store, on this device, never in backups.
 * - One refresh at a time, app-wide: presenting a replaced refresh token again can end every session of the
 *   person, so every caller shares the one refresh in flight.
 * - The new refresh token is stored before the new access token is used. If it can't be stored, the session
 *   is treated as ended rather than carrying on with a token the phone couldn't keep.
 */

const REFRESH_TOKEN_KEY = "idi.refreshToken";
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** Why the session ended without the person signing out: the API refused the refresh, or the token couldn't be kept. */
export type SessionEndReason = "expired" | "storage_failed";
type SessionEndedListener = (reason: SessionEndReason) => void;

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;
const listeners = new Set<SessionEndedListener>();

async function forget(): Promise<void> {
  accessToken = null;
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, STORE_OPTIONS);
  } catch {
    // nothing left to protect if it can't even be read back
  }
}

async function end(reason: SessionEndReason): Promise<null> {
  await forget();
  listeners.forEach((listener) => listener(reason));
  return null;
}

async function runRefresh(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY, STORE_OPTIONS);
  if (!stored) return end("expired");

  let auth: MobileAuthResponse;
  try {
    auth = await authApi.refresh(stored);
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 401) return end("expired");
    // Network, rate limit or server trouble says nothing about the session: it is kept, the caller fails.
    throw apiError;
  }

  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, auth.refreshToken, STORE_OPTIONS);
  } catch {
    return end("storage_failed");
  }
  accessToken = auth.accessToken;
  return accessToken;
}

export const tokenManager = {
  getAccessToken(): string | null {
    return accessToken;
  },

  /**
   * Exchanges the stored refresh token for new tokens. Resolves with the new access token, or null when the
   * session has ended (its listeners are told). Rejects with an ApiError when the API couldn't answer.
   */
  refresh(): Promise<string | null> {
    refreshing ??= runRefresh().finally(() => {
      refreshing = null;
    });
    return refreshing;
  },

  /** Called when the session ends without the person signing out. Returns the unsubscribe. */
  onSessionEnded(listener: SessionEndedListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Keeps a new session from sign-in: the refresh token is stored first, then the access token is used. */
  async setSession(auth: MobileAuthResponse): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, auth.refreshToken, STORE_OPTIONS);
    accessToken = auth.accessToken;
  },

  getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY, STORE_OPTIONS);
  },

  /** Forgets both tokens (sign-out). Listeners aren't told: the person chose to leave. */
  clearSession(): Promise<void> {
    return forget();
  },
};
