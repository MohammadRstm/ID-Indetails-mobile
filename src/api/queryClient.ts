import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";
import { toApiError } from "./errors";

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

// Coming back to the foreground counts as focus: stale queries refetch.
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener("change", (state) =>
    handleFocus(state === "active"),
  );
  return () => subscription.remove();
});

// Offline pauses queries; back online resumes them.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
);
