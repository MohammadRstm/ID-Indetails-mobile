import * as Notifications from "expo-notifications";
import type { PushData } from "@/api/mobileTypes";

/*
 * The notification categories and their action buttons. A push shows the buttons of the category the server
 * names in its `categoryId`; the server picks it with the same rule as `categoryForPush` below. Ids use no ":"
 * or "-" (expo-notifications) and stay clear of the app's own `timer` category (Phase 2).
 *
 * Every action opens the app to the foreground and, on iOS, needs the phone unlocked: the app then passes its
 * own lock and calls the API with the signed-in session (phase-0-plan.md section 9). An action that stayed in
 * the background would never reach the app when it isn't running.
 */

export const PUSH_CATEGORY = {
  /** A requirement assigned to the person, due soon or overdue: "Mark done". */
  requirement: "requirement",
  /** A team or direct message: "Reply". */
  message: "message",
} as const;

export type PushCategoryId = (typeof PUSH_CATEGORY)[keyof typeof PUSH_CATEGORY];

export const PUSH_ACTION = {
  markDone: "mark_done",
  reply: "reply",
} as const;

const FOREGROUND_AFTER_UNLOCK = { opensAppToForeground: true, isAuthenticationRequired: true };

/** The requirement kinds sent about one open requirement, which can be ticked from the push. */
const REQUIREMENT_KINDS = new Set([
  "requirement_assigned",
  "requirement_due_soon",
  "requirement_overdue",
]);

/** The category a push belongs to, or null for a push without buttons. The server mirrors this rule. */
export function categoryForPush(data: Pick<PushData, "kind" | "target">): PushCategoryId | null {
  if (REQUIREMENT_KINDS.has(data.kind) && data.target?.type === "requirement") {
    return PUSH_CATEGORY.requirement;
  }
  if (data.kind === "message" && data.target?.type === "conversation") return PUSH_CATEGORY.message;
  return null;
}

/** Registers the categories with the phone. Safe to call more than once; never throws. */
export async function registerNotificationCategories(): Promise<void> {
  try {
    await Promise.all([
      Notifications.setNotificationCategoryAsync(PUSH_CATEGORY.requirement, [
        {
          identifier: PUSH_ACTION.markDone,
          buttonTitle: "Mark done",
          options: FOREGROUND_AFTER_UNLOCK,
        },
      ]),
      Notifications.setNotificationCategoryAsync(PUSH_CATEGORY.message, [
        {
          identifier: PUSH_ACTION.reply,
          buttonTitle: "Reply",
          textInput: { submitButtonTitle: "Send", placeholder: "Write a reply" },
          options: FOREGROUND_AFTER_UNLOCK,
        },
      ]),
    ]);
  } catch {
    // Without categories the pushes still arrive and open their screen; they just have no buttons.
  }
}
