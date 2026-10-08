import type { PushData } from "@/api/mobileTypes";

/**
 * Slot: handles a notification's action button. Phase 2 calls it from the response handler before opening the
 * target; Phase 5 fills it in. Resolves true when the action was handled and nothing should open.
 */
export async function handleNotificationAction(actionId: string, data: PushData): Promise<boolean> {
  return false;
}
