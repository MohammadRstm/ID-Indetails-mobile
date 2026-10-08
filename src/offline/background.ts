/** Slot: runs the outbox sync in the background. Phase 2 calls it when the sync engine starts; Phase 5 fills it in. */
export async function registerBackgroundSync(run: () => Promise<void>): Promise<void> {}
