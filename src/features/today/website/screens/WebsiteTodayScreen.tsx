import * as WebBrowser from "expo-web-browser";
import { useCurrentUser } from "@/auth/session";
import { env } from "@/config/env";
import { WebsiteTodayView } from "../components/WebsiteTodayView";

/** The Website area's first page on the web (its Projects tab). */
const WEBSITE_HOME_PATH = "/website/projects";

/** Website staff's Today: a pointer to the web, where the website is managed. */
export function WebsiteTodayScreen() {
  const me = useCurrentUser();
  return (
    <WebsiteTodayView
      name={me.firstName ?? "there"}
      onOpenWebsite={() =>
        WebBrowser.openBrowserAsync(`${env.webUrl}${WEBSITE_HOME_PATH}`).catch(() => {})
      }
    />
  );
}
