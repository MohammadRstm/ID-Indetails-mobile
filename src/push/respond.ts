import type { Href } from "expo-router";
import * as Notifications from "expo-notifications";
import { isTimerNotification, TIMER_STOP_ACTION } from "@/features/timer/notifications";
import { routeForTarget } from "@/navigation/targets";
import type { Permissions } from "@/permissions/permissions";
import { handleNotificationAction } from "./actions";
import { isForMe, parsePushData } from "./model";

/*
 * What a tap on a notification does (phase-0-plan.md section 9). It only ever opens a screen: the action-button
 * slot (Phase 5) goes first and may handle it instead; a push for someone else is ignored; a target the person
 * can't open sends them to Alerts.
 */

export type ResponseContext = {
  userId: number;
  perms: Permissions;
  navigate: (href: Href) => void;
  /** The timer's Stop: stops it and opens the filled-in log sheet. */
  stopTimer: () => void;
};

export async function respondToNotification(
  response: Pick<
    Notifications.NotificationResponse,
    "actionIdentifier" | "notification" | "userText"
  >,
  ctx: ResponseContext,
): Promise<void> {
  const raw: unknown = response.notification.request.content.data;

  if (isTimerNotification(raw)) {
    if (raw.userId !== ctx.userId) return;
    if (response.actionIdentifier === TIMER_STOP_ACTION) ctx.stopTimer();
    else ctx.navigate("/today");
    return;
  }

  const data = parsePushData(raw);
  if (!data || !isForMe(data, ctx.userId)) return;
  if (await handleNotificationAction(response.actionIdentifier, data, response.userText)) return;
  ctx.navigate(routeForTarget(data.target, ctx.perms) ?? "/alerts");
}
