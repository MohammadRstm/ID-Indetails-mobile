import * as LocalAuthentication from "expo-local-authentication";

/*
 * The phone's own unlock (Face ID, fingerprint, or its passcode), used as a local lock on the app. It decides
 * whether this person may look at the app now; the session itself is the refresh token, never behind it.
 */

export type UnlockKind = "face" | "fingerprint" | "iris" | "passcode";

export type LockSupport = {
  /** Biometrics are set up on the phone: the lock is offered after signing in. */
  biometrics: boolean;
  /** What unlocks the app, for the words on the buttons; null when nothing can (no screen lock at all). */
  kind: UnlockKind | null;
};

export async function lockSupport(): Promise<LockSupport> {
  try {
    const [hardware, enrolled, types, level] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);
    const biometrics = hardware && enrolled;
    const { AuthenticationType, SecurityLevel } = LocalAuthentication;
    let kind: UnlockKind | null = level === SecurityLevel.NONE ? null : "passcode";
    if (biometrics) {
      if (types.includes(AuthenticationType.FACIAL_RECOGNITION)) kind = "face";
      else if (types.includes(AuthenticationType.FINGERPRINT)) kind = "fingerprint";
      else if (types.includes(AuthenticationType.IRIS)) kind = "iris";
    }
    return { biometrics, kind };
  } catch {
    return { biometrics: false, kind: null };
  }
}

export type UnlockResult = "unlocked" | "failed" | "unavailable";

/**
 * Asks the phone to confirm it is its owner. Biometrics fall back to the phone's passcode (the platform
 * default), so removed fingerprints still leave a way in. "unavailable": the phone has no screen lock at all.
 */
export async function confirmOwner(promptMessage: string): Promise<UnlockResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    if (result.success) return "unlocked";
    return result.error === "not_enrolled" || result.error === "passcode_not_set"
      ? "unavailable"
      : "failed";
  } catch {
    return "failed";
  }
}

/** "Face ID" on iPhones with it, "fingerprint" elsewhere: the name the buttons use. */
export function unlockName(kind: UnlockKind | null, platformOS: string): string {
  switch (kind) {
    case "face":
      return platformOS === "ios" ? "Face ID" : "face unlock";
    case "fingerprint":
      return platformOS === "ios" ? "Touch ID" : "fingerprint";
    case "iris":
      return "iris unlock";
    default:
      return "your phone's passcode";
  }
}
