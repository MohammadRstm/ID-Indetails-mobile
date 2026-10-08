import Constants from "expo-constants";

/*
 * The app's configuration. Everything in the app bundle is public, so nothing here is a secret.
 * The variant comes from app.config.ts (APP_VARIANT); the API address from EXPO_PUBLIC_API_URL.
 */

export type AppVariant = "development" | "preview" | "production";

const VARIANTS: readonly AppVariant[] = ["development", "preview", "production"];

/** The laptop's API seen from the Android emulator (phase-0-plan.md section 20). */
const DEVELOPMENT_API_URL = "http://10.0.2.2:5164";

function readVariant(): AppVariant {
  const value: unknown = Constants.expoConfig?.extra?.variant;
  return VARIANTS.find((variant) => variant === value) ?? "development";
}

function readApiUrl(variant: AppVariant): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  const url = (configured || (variant === "development" ? DEVELOPMENT_API_URL : "")).replace(
    /\/+$/,
    "",
  );
  if (!/^https?:\/\/[^/]+/.test(url)) {
    throw new Error("EXPO_PUBLIC_API_URL must be the API's address, such as https://example.com.");
  }
  // Tokens travel in request bodies and headers: outside development they only go over HTTPS.
  if (variant !== "development" && !url.startsWith("https://")) {
    throw new Error("Preview and production builds must use an https:// API address.");
  }
  return url;
}

const variant = readVariant();

export const env: { apiUrl: string; variant: AppVariant } = {
  /** The API's origin, without "/api". */
  apiUrl: readApiUrl(variant),
  variant,
};
