import { screens, type ScreenKey } from "@/permissions/screens";

const SCREEN_KEYS = Object.keys(screens) as ScreenKey[];

/**
 * The screen-table key of the route Expo Router is showing, from its segments: groups such as "(app)" and a
 * trailing "index" are left out. Null for a route outside the table (the signed-out screens).
 */
export function screenKeyForSegments(segments: readonly string[]): ScreenKey | null {
  const parts = segments.filter((s) => !(s.startsWith("(") && s.endsWith(")")));
  if (parts[parts.length - 1] === "index") parts.pop();
  const path = `/${parts.join("/")}`;
  return SCREEN_KEYS.find((key) => screens[key].pathname === path) ?? null;
}
