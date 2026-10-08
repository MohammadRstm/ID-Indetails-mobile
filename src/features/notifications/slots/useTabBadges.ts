import { useMessagesBadge } from "@/features/messages/api";
import { useUnreadCount } from "../api";

/** The red counts on the Alerts and Messages tabs. */
export type TabBadges = { alerts?: number; messages?: number };

/**
 * The tab bar's counts: unread notifications and unread messages. The live connection and pushes reload them;
 * coming back to the app does too.
 */
export function useTabBadges(): TabBadges {
  const alerts = useUnreadCount();
  const messages = useMessagesBadge();
  return { alerts: alerts.data, messages: messages.data?.unread };
}
