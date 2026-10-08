import Constants from "expo-constants";

/*
 * The app's configuration. Everything in the app bundle is public, so nothing here is a secret.
 * The variant comes from app.config.ts (APP_VARIANT); the API address from EXPO_PUBLIC_API_URL, and the
 * website's from EXPO_PUBLIC_WEB_URL.
 */

export type AppVariant = "development" | "preview" | "production";

const VARIANTS: readonly AppVariant[] = ["development", "preview", "production"];

/** The laptop's API seen from the Android emulator (phase-0-plan.md section 20). */
const DEVELOPMENT_API_URL = "http://10.0.2.2:5164";

function readVariant(): AppVariant {
  const value: unknown = Constants.expoConfig?.extra?.variant;
  return VARIANTS.find((variant) => variant === value) ?? "development";
}

/** An origin from the configuration, without a trailing slash, checked for the variant. */
function readOrigin(name: string, configured: string, variant: AppVariant): string {
  const url = configured.replace(/\/+$/, "");
  if (!/^https?:\/\/[^/]+/.test(url)) {
    throw new Error(`${name} must be an address, such as https://example.com.`);
  }
  // Tokens travel in request bodies and headers: outside development they only go over HTTPS.
  if (variant !== "development" && !url.startsWith("https://")) {
    throw new Error(`Preview and production builds must use an https:// ${name}.`);
  }
  return url;
}

const variant = readVariant();

const apiUrl = readOrigin(
  "EXPO_PUBLIC_API_URL",
  process.env.EXPO_PUBLIC_API_URL || (variant === "development" ? DEVELOPMENT_API_URL : ""),
  variant,
);

export const env: { apiUrl: string; webUrl: string; variant: AppVariant } = {
  /** The API's origin, without "/api". */
  apiUrl,
  /**
   * The website, where invitations and password resets are completed (their emailed links open it). In
   * production the website and the API are served from one site, so it defaults to the API's address.
   */
  webUrl: readOrigin("EXPO_PUBLIC_WEB_URL", process.env.EXPO_PUBLIC_WEB_URL || apiUrl, variant),
  variant,
};
