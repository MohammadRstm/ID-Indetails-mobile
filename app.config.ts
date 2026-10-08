import type { ConfigContext, ExpoConfig } from "expo/config";

/*
 * One config, three apps that install side by side (phase-0-plan.md section 3), chosen by APP_VARIANT.
 * The API address comes from EXPO_PUBLIC_API_URL (.env locally, EAS environment variables for builds).
 * Nothing here is secret: everything in the config ends up in the app.
 */

type Variant = "development" | "preview" | "production";

// The theme's ground and accent (src/theme/tokens.ts). The config loader can't import TypeScript files.
const GROUND_LIGHT = "#F2F5F4";
const GROUND_DARK = "#0B1011";
const ACCENT = "#0C6B69";

const BASE_ID = "com.indetails.app";

const VARIANTS: Record<Variant, { name: string; id: string }> = {
  development: { name: "ID InDetails (Dev)", id: `${BASE_ID}.dev` },
  preview: { name: "ID InDetails (Preview)", id: `${BASE_ID}.preview` },
  production: { name: "ID InDetails", id: BASE_ID },
};

function variantOf(value: string | undefined): Variant {
  return value === "preview" || value === "production" ? value : "development";
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = variantOf(process.env.APP_VARIANT);
  const { name, id } = VARIANTS[variant];
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  // Tokens travel to the API in request bodies and headers: release builds only talk to it over HTTPS.
  if (variant !== "development" && !apiUrl?.startsWith("https://")) {
    throw new Error(`EXPO_PUBLIC_API_URL must be an https:// address for ${variant} builds.`);
  }

  return {
    ...config,
    name,
    slug: "id-indetails",
    scheme: "idindetails",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "automatic",
    // An over-the-air update only reaches builds with the same native code.
    runtimeVersion: { policy: "fingerprint" },
    ios: {
      bundleIdentifier: id,
      supportsTablet: false,
    },
    android: {
      package: id,
      adaptiveIcon: {
        backgroundColor: GROUND_LIGHT,
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 76,
          backgroundColor: GROUND_LIGHT,
          dark: { backgroundColor: GROUND_DARK },
        },
      ],
      // The refresh token stays out of Android backups.
      ["expo-secure-store", { configureAndroidBackup: true, faceIDPermission: false }],
      [
        "expo-local-authentication",
        { faceIDPermission: "Allow ID InDetails to use Face ID to unlock the app." },
      ],
      ["expo-notifications", { color: ACCENT }],
      [
        "expo-image-picker",
        {
          cameraPermission:
            "Allow ID InDetails to use the camera for photos of your work, sites and messages.",
          photosPermission:
            "Allow ID InDetails to use photos you choose for your work, sites and messages.",
          microphonePermission:
            "Allow ID InDetails to record sound with videos you send in messages.",
        },
      ],
      "expo-sqlite",
      "expo-font",
      // iOS 17+ asks only to add events; older iOS and Android ask for calendar access.
      [
        "expo-calendar",
        {
          writeOnlyAccess: true,
          writeOnlyCalendarPermission:
            "Allow ID InDetails to add meetings and deadlines to your calendar.",
          calendarPermission: "Allow ID InDetails to add meetings and deadlines to your calendar.",
          remindersPermission: false,
        },
      ],
      // iOS background processing for the outbox sync (src/offline/background.ts).
      "expo-background-task",
    ],
    experiments: {
      reactCompiler: true,
    },
    extra: {
      variant,
    },
  };
};
