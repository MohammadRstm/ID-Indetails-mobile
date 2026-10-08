import * as Application from "expo-application";
import Constants from "expo-constants";
import { env } from "@/config/env";

/** "1.0.0 (12)", with the variant outside production builds: what to quote when reporting a problem. */
export function appVersionText(): string {
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "?";
  const build = Application.nativeBuildVersion;
  const text = build ? `${version} (${build})` : version;
  return env.variant === "production" ? text : `${text} · ${env.variant}`;
}
