import * as SecureStore from "expo-secure-store";
import { toApiError } from "@/api/errors";
import type { MobileAuthResponse } from "@/api/mobileTypes";
import { authApi } from "./authApi";

/*
 * The session's tokens (phase-0-plan.md section 6).
 *
 * - The access token lives in memory only.
 * - The refresh token lives only in the secure store, on this device, never in backups, and not behind
 *   biometrics: background work must be able to refresh without the person present.
 * - One refresh at a time, app-wide: presenting a replaced refresh token again can end every session of the
 *   person, so every caller shares the one refresh in flight.
 * - The new refresh token is stored before the new access token is used. If it can't be stored, the session
 *   is treated as ended rather than carrying on with a token the phone couldn't keep.
 * - A refresh that got no answer is tried again with the same token: the API accepts it again for 5 minutes,
 *   in case it rotated the token and the answer was lost.
 */

const REFRESH_TOKEN_KEY = "idi.refreshToken";
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/**
 * The waits before each new try of a refresh that got no answer. With the 30-second request timeout, the last
 * try still starts well inside the API's 5-minute replay window.
 */
export const REFRESH_RETRY_DELAYS_MS = [1_000, 3_000, 9_000];

/** Why the session ended without the person signing out: the API refused the refresh, or the token couldn't be kept. */
export type SessionEndReason = "expired" | "storage_failed";
type SessionEndedListener = (reason: SessionEndReason) => void;
type RefreshedListener = (auth: MobileAuthResponse) => void;

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
/** A session was started or found in the store, and hasn't been cleared or ended since. */
let sessionKnown = false;
/** Changes whenever the session is replaced or cleared, so a refresh that finishes afterwards is dropped. */
let generation = 0;
let refreshing: Promise<string | null> | null = null;
const endedListeners = new Set<SessionEndedListener>();
const refreshedListeners = new Set<RefreshedListener>();

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function subscribe<T>(set: Set<T>, listener: T): () => void {
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

function adoptTokens(auth: MobileAuthResponse) {
  accessToken = auth.accessToken;
  const expires = Date.parse(auth.accessTokenExpiresAt);
  accessTokenExpiresAt = Number.isNaN(expires) ? 0 : expires;
  sessionKnown = true;
}

async function forget(): Promise<void> {
  generation++;
  accessToken = null;
  accessTokenExpiresAt = 0;
  sessionKnown = false;
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, STORE_OPTIONS);
  } catch {
    // nothing left to protect if it can't even be read back
  }
}

async function end(reason: SessionEndReason): Promise<null> {
  await forget();
  endedListeners.forEach((listener) => listener(reason));
  return null;
}

/** One exchange of the stored token, tried again while the API can't be reached. */
async function exchange(refreshToken: string): Promise<MobileAuthResponse> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await authApi.refresh(refreshToken);
    } catch (error) {
      const apiError = toApiError(error);
      // Only a missing answer is worth repeating; a 429 or 5xx is an answer, and the caller fails at once.
      if (!apiError.isNetwork || attempt >= REFRESH_RETRY_DELAYS_MS.length) throw apiError;
      await wait(REFRESH_RETRY_DELAYS_MS[attempt]);
    }
  }
}

async function runRefresh(): Promise<string | null> {
  const started = generation;
  const stored = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY, STORE_OPTIONS);
  // Nothing stored: a session this phone knew of has ended; with none known there is nothing to end.
  if (!stored) return sessionKnown ? end("expired") : null;
  sessionKnown = true;

  let auth: MobileAuthResponse;
  try {
    auth = await exchange(stored);
  } catch (error) {
    // Signed out or replaced meanwhile: this answer belongs to no one.
    if (generation !== started) return null;
    const apiError = toApiError(error);
    if (apiError.status === 401) return end("expired");
    // Network, rate limit or server trouble says nothing about the session: it is kept, the caller fails.
    throw apiError;
  }
  if (generation !== started) return null;

  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, auth.refreshToken, STORE_OPTIONS);
  } catch {
    return end("storage_failed");
  }
  if (generation !== started) return null;
  adoptTokens(auth);
  refreshedListeners.forEach((listener) => listener(auth));
  return accessToken;
}

export const tokenManager = {
  getAccessToken(): string | null {
    return accessToken;
  },

  /** Whether the access token is missing or runs out within `ms`. */
  expiresWithin(ms: number): boolean {
    return accessToken === null || accessTokenExpiresAt - Date.now() <= ms;
  },

  /** Whether a session was started or restored on this phone and hasn't ended. */
  hasSession(): boolean {
    return sessionKnown;
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

  /**
   * Refreshes first when there is a session whose access token runs out within `ms` (coming back to the
   * foreground). Not reaching the API is fine here: the requests that follow refresh on their own 401.
   */
  async refreshIfExpiring(ms: number): Promise<void> {
    if (!sessionKnown || !tokenManager.expiresWithin(ms)) return;
    try {
      await tokenManager.refresh();
    } catch {
      // the session is kept; the next request tries again
    }
  },

  /** Called when the session ends without the person signing out. Returns the unsubscribe. */
  onSessionEnded(listener: SessionEndedListener): () => void {
    return subscribe(endedListeners, listener);
  },

  /** Called after every successful refresh with the API's answer, which carries the person as /auth/me does. */
  onRefreshed(listener: RefreshedListener): () => void {
    return subscribe(refreshedListeners, listener);
  },

  /**
   * Keeps a new session (sign-in, a password change): the refresh token is stored first, then the access token
   * is used. Rejects when the secure store can't keep it, leaving the tokens as they were.
   */
  async setSession(auth: MobileAuthResponse): Promise<void> {
    await refreshing?.catch(() => null);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, auth.refreshToken, STORE_OPTIONS);
    generation++;
    adoptTokens(auth);
  },

  /** The stored refresh token, once any refresh in flight has finished replacing it. */
  async getRefreshToken(): Promise<string | null> {
    await refreshing?.catch(() => null);
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY, STORE_OPTIONS);
  },

  /** Forgets both tokens (sign-out). Listeners aren't told: the person chose to leave. */
  clearSession(): Promise<void> {
    return forget();
  },
};
