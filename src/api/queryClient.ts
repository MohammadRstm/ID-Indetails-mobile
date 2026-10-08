import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";
import { tokenManager } from "@/auth/tokenManager";
import { toApiError } from "./errors";

/** Coming back to the foreground with less than this left on the access token refreshes it before anything else. */
export const FOREGROUND_REFRESH_MARGIN_MS = 60_000;

/** React Query defaults for the whole app: the web's retry rules. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A 4xx won't change by asking again; network and server failures get two more tries.
        retry: (failures, error) => {
          const status = toApiError(error).status;
          if (status >= 400 && status < 500) return false;
          return failures < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export const queryClient = createQueryClient();

/**
 * Coming back to the foreground counts as focus: stale queries refetch, after the access token is refreshed if
 * it is about to run out, so they don't all start with a 401. In the background nothing new starts.
 */
export function handleAppStateForQueries(
  state: string,
  setFocused: (focused: boolean) => void,
): Promise<void> {
  if (state !== "active") {
    setFocused(false);
    return Promise.resolve();
  }
  return tokenManager.refreshIfExpiring(FOREGROUND_REFRESH_MARGIN_MS).then(() => {
    // Sent back to the background while refreshing: the refetches wait for the next return.
    if (AppState.currentState === "active") setFocused(true);
  });
}

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener("change", (state) => {
    void handleAppStateForQueries(state, setFocused);
  });
  return () => subscription.remove();
});

// Offline pauses queries; back online resumes them.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
);
