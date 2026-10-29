import NetInfo from "@react-native-community/netinfo";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { AppState } from "react-native";
import { toApiError, type ApiError } from "@/api/errors";
import { authApi } from "./authApi";
import { TOKEN_STORE_OPTIONS } from "./secureStoreOptions";

/*
 * A sign-out the API didn't hear about (offline, or past the 5-second limit) leaves its session live on the
 * server for up to 30 days, still sending that person's pushes to this phone. Its refresh token is kept in the
 * secure store only to finish the sign-out, and sent again at the next start, on return to the foreground and
 * when the phone is back online, until the API answers (decision 18). It is never used for anything else.
 * Logging out with a token the session has since replaced is safe: the API ends that one session.
 */

const UNFINISHED_SIGN_OUTS_KEY = "idi.unfinishedSignOuts";

/** No answer, or the API couldn't deal with it now: worth sending again. Any other answer is final. */
const worthRetrying = (error: ApiError) =>
  error.isNetwork || error.status === 429 || error.status >= 500;

async function read(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(UNFINISHED_SIGN_OUTS_KEY, TOKEN_STORE_OPTIONS);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

async function write(tokens: string[]): Promise<void> {
  if (tokens.length > 0) {
    await SecureStore.setItemAsync(
      UNFINISHED_SIGN_OUTS_KEY,
      JSON.stringify(tokens),
      TOKEN_STORE_OPTIONS,
    );
  } else {
    await SecureStore.deleteItemAsync(UNFINISHED_SIGN_OUTS_KEY, TOKEN_STORE_OPTIONS);
  }
}

/** Ends a session on the API now or, when it can't be reached, at the next chance. Never rejects. */
export async function signOutOnServer(refreshToken: string): Promise<void> {
  try {
    await authApi.logout(refreshToken);
  } catch (error) {
    if (!worthRetrying(toApiError(error))) return;
    try {
      const kept = await read();
      if (!kept.includes(refreshToken)) await write([...kept, refreshToken]);
    } catch {
      // the secure store is unavailable: the session ends on its own after 30 days
    }
  }
}

let finishing: Promise<void> | null = null;

/** Sends the kept sign-outs again; each one the API answered is done. Runs never overlap. */
export function finishSignOuts(): Promise<void> {
  finishing ??= (async () => {
    const done: string[] = [];
    for (const token of await read()) {
      try {
        await authApi.logout(token);
        done.push(token);
      } catch (error) {
        if (!worthRetrying(toApiError(error))) done.push(token);
      }
    }
    if (done.length > 0) await write((await read()).filter((t) => !done.includes(t)));
  })()
    .catch(() => undefined)
    .finally(() => {
      finishing = null;
    });
  return finishing;
}

/** Finishes kept sign-outs at start, on return to the foreground and whenever the phone is back online. */
export function useFinishSignOuts(): void {
  useEffect(() => {
    void finishSignOuts();
    const stopNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) void finishSignOuts();
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void finishSignOuts();
    });
    return () => {
      stopNetInfo();
      appState.remove();
    };
  }, []);
}
