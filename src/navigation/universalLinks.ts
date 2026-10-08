import type { Href } from "expo-router";

/** Slot: the screen an https link to the company's domain opens, or null. Phase 1b calls it; Phase 5 fills it in. */
export function routeForUniversalLink(url: string): Href | null {
  return null;
}
