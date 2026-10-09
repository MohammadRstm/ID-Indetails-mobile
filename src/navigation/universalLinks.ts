import type { Href } from "expo-router";

/*
 * Opens the app for https links to the company's website (apple-app-site-association and assetlinks.json on
 * that domain make the phone hand them over; docs/native-features.md). The domain comes from
 * EXPO_PUBLIC_WEB_DOMAIN; when it is unset the feature is off. Links only open screens, and the screen
 * checks permissions itself. Invitation and password-reset links stay on the website, so they give null.
 */

const ID = /^[1-9]\d{0,9}$/;
const SECTIONS = ["requirements", "materials", "labour"] as const;

function webDomain(): string | null {
  const value = process.env.EXPO_PUBLIC_WEB_DOMAIN?.trim().toLowerCase();
  return value ? value : null;
}

export function routeForUniversalLink(url: string): Href | null {
  const domain = webDomain();
  if (!domain) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== domain) return null;

  const [first, second, third] = parsed.pathname.split("/").filter(Boolean);
  const rest = parsed.pathname.split("/").filter(Boolean).length;

  switch (first) {
    case "projects":
      if (rest === 2 && ID.test(second)) {
        return { pathname: "/projects/[id]", params: { id: second } };
      }
      if (rest === 3 && ID.test(second) && SECTIONS.some((s) => s === third)) {
        return { pathname: `/projects/[id]/${third}`, params: { id: second } } as Href;
      }
      return null;
    case "meetings":
      if (rest === 1) return "/meetings";
      return rest === 2 && ID.test(second)
        ? { pathname: "/meetings/[id]", params: { id: second } }
        : null;
    case "notifications":
      return rest === 1 ? "/alerts" : null;
    case "today":
      return rest === 1 ? "/today" : null;
    default:
      return null;
  }
}
