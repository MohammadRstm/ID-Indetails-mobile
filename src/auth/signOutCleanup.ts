/*
 * What has to go when the person leaves. The session clears the query cache, toasts and image caches itself;
 * anything else kept per person (stored data, the timer, local notifications) registers here.
 */

/** "signedOut": the person chose to leave. "sessionEnded": the API ended the session (expired, revoked). */
export type SignOutCause = "signedOut" | "sessionEnded";

type Cleanup = (cause: SignOutCause) => void | Promise<void>;

const cleanups = new Set<Cleanup>();

/**
 * Runs `cleanup` every time the person signs out or their session ends. Returns the unsubscribe. A cleanup that
 * fails doesn't stop the others or the sign-out.
 */
export function onSignOut(cleanup: Cleanup): () => void {
  cleanups.add(cleanup);
  return () => {
    cleanups.delete(cleanup);
  };
}

export async function runSignOutCleanups(cause: SignOutCause): Promise<void> {
  await Promise.allSettled([...cleanups].map(async (cleanup) => cleanup(cause)));
}
