import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { fmtTime } from "@/format/time";
import { OfflineBanner } from "@/ui";

/** Whether the phone has a connection, as React Query sees it (NetInfo, src/api/queryClient.ts). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
  );
}

/**
 * "You're offline. Showing what was loaded at 10:42" while there is no connection, for a screen showing data
 * loaded earlier (the time it was last updated, from React Query's `dataUpdatedAt`). Null while online.
 */
export function useOfflineBanner(updatedAt?: number) {
  const online = useIsOnline();
  if (online) return null;
  return <OfflineBanner loadedAt={updatedAt ? fmtTime(updatedAt) : undefined} />;
}
