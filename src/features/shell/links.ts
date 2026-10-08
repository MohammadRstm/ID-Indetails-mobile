import type { Href } from "expo-router";
import { routeForUniversalLink } from "@/navigation/universalLinks";

/*
 * Links that open the app (phase-0-plan.md section 9). `idindetails://` links name a route and Expo Router
 * opens it; the guards still check the session, the lock and the person's permissions. https links to the
 * company's domain (universal links) are mapped by routeForUniversalLink; one it doesn't know opens the start.
 * Links only ever open screens.
 */

/** An href as the path Expo Router takes from a link: "/projects/12?section=meetings". */
export function pathOfHref(href: Href): string {
  if (typeof href === "string") return href;
  const params = { ...(href.params as Record<string, string | number | undefined>) };
  const path = href.pathname.replace(/\[([^\]]+)\]/g, (_, name: string) => {
    const value = params[name];
    delete params[name];
    return encodeURIComponent(String(value ?? ""));
  });
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return query ? `${path}?${query}` : path;
}

/** Where an incoming link goes. */
export function pathForIncomingLink(url: string): string {
  if (!/^https?:\/\//i.test(url)) return url;
  try {
    const href = routeForUniversalLink(url);
    return href ? pathOfHref(href) : "/";
  } catch {
    return "/";
  }
}
