import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";
import { http } from "@/api/http";
import type { RegisterDeviceRequest } from "@/api/mobileTypes";
import { ensureAndroidChannels } from "./channels";

/*
 * This phone's push registration (phase-0-plan.md section 8): after sign-in, once the OS permission is granted,
 * the Expo push token is registered for the session with `PUT /api/me/devices`, and again whenever Expo issues a
 * new one. Signing out ends the session, which removes the device on the server; a sign-out the API didn't hear
 * about is finished later (src/auth/unfinishedSignOuts.ts).
 */

export type PushState = "registered" | "denied" | "undetermined" | "unavailable";

const ASKED_KEY = "idi.push.asked";

function projectId(): string | null {
  const fromConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
    ?.eas?.projectId;
  return fromConfig ?? Constants.easConfig?.projectId ?? null;
}

/** Sends this phone's token to the API. */
export async function registerToken(pushToken: string): Promise<void> {
  const body: RegisterDeviceRequest = {
    pushToken,
    platform: Platform.OS === "ios" ? "ios" : "android",
    appVersion: Constants.expoConfig?.version,
  };
  await http.put("/me/devices", body);
}

/** Registers when the permission is already granted; never asks. */
export async function registerIfAllowed(): Promise<PushState> {
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return permission.canAskAgain ? "undetermined" : "denied";
  const id = projectId();
  // Without an EAS project (a local build not linked yet) Expo can't issue a token.
  if (!id) return "unavailable";
  await ensureAndroidChannels();
  const token = await Notifications.getExpoPushTokenAsync({ projectId: id });
  await registerToken(token.data);
  return "registered";
}

/** Asks for the permission (when the phone still may), then registers. */
export async function askAndRegister(): Promise<PushState> {
  await ensureAndroidChannels();
  const permission = await Notifications.requestPermissionsAsync();
  try {
    Storage.setItemSync(ASKED_KEY, "1");
  } catch {
    // only means we may ask again next time
  }
  if (!permission.granted) return "denied";
  return registerIfAllowed();
}

/** Whether the app has already asked once on this phone; it asks by itself only the first time. */
export function askedBefore(): boolean {
  try {
    return Storage.getItemSync(ASKED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Stops pushes to this phone while staying signed in. */
export async function unregisterDevice(): Promise<void> {
  await http.delete("/me/devices/current");
}
