/** The red counts on the Alerts and Messages tabs. */
export type TabBadges = { alerts?: number; messages?: number };

/**
 * Slot: the tab bar (Phase 1a/1b) reads the counts here; Phase 2 fills it with the unread notifications and
 * messages. Until then, no badges.
 */
export function useTabBadges(): TabBadges {
  return {};
}
