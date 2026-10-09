import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import Storage from "expo-sqlite/kv-store";

/*
 * Reading offline (phase-0-plan.md section 10): what site staff need without signal is kept on the phone between
 * starts: their sites, each site's latest materials with its types and suppliers, labour weeks and defaults, their
 * requirements and the company settings. Each person has their own copy, removed when they sign out.
 */

const keyOf = (userId: number) => `idi.queryCache.${userId}`;
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;
/** Changed when the kept shapes change, so an old copy is dropped instead of read. */
const BUSTER = "phase-2-1";

const KEPT_ROOTS = new Set(["projects", "materials", "labour", "company", "domainSettings"]);

/** Whether a query is one of those kept for reading offline. */
export function isKeptOffline(queryKey: QueryKey): boolean {
  const [root, second] = queryKey;
  if (root === "requirements") return second === "mine";
  return typeof root === "string" && KEPT_ROOTS.has(root);
}

/** Restores the person's kept queries and keeps saving them; the returned function stops saving. */
export function startQueryPersistence(queryClient: QueryClient, userId: number): () => void {
  const [unsubscribe] = persistQueryClient({
    queryClient,
    persister: createAsyncStoragePersister({
      storage: Storage,
      key: keyOf(userId),
      throttleTime: 2000,
    }),
    maxAge: MAX_AGE_MS,
    buster: BUSTER,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" && isKeptOffline(query.queryKey),
    },
  });
  return unsubscribe;
}

/** Removes the person's kept copy (signing out). */
export async function clearPersistedQueries(userId: number): Promise<void> {
  await Storage.removeItem(keyOf(userId));
}
