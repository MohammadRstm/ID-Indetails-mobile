import { router } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";
import { unlockName } from "@/auth/lock/biometrics";
import { useLock } from "@/auth/lock/LockProvider";
import { useSession } from "@/auth/session";
import { canOpen } from "@/permissions/screens";
import { usePermissions } from "@/permissions/usePermissions";
import { useTheme } from "@/theme/ThemeProvider";
import { Screen, ScreenHeader } from "@/ui";
import { appVersionText } from "../appVersion";
import { SettingsView, type LockSetting } from "../components/SettingsView";

/** This phone's settings: the theme, the lock, links to the account's other settings, and signing out. */
export function SettingsScreen() {
  const { preference, setPreference } = useTheme();
  const { signOut } = useSession();
  const lock = useLock();
  const perms = usePermissions();
  const [lockBusy, setLockBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const kind = lock.support?.kind;
  const lockSetting: LockSetting =
    lock.support === null
      ? { kind: "checking" }
      : kind == null
        ? { kind: "unavailable" }
        : {
            kind: "available",
            name: unlockName(kind, Platform.OS),
            enabled: lock.enabled,
            busy: lockBusy,
          };

  const changeLock = async (enabled: boolean) => {
    setLockBusy(true);
    await lock.setEnabled(enabled);
    setLockBusy(false);
  };

  return (
    <Screen
      header={
        <ScreenHeader
          title="Settings"
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }
    >
      <SettingsView
        theme={preference}
        onThemeChange={setPreference}
        lock={lockSetting}
        onLockChange={(enabled) => void changeLock(enabled)}
        onOpenNotifications={
          canOpen(perms, "notificationSettings")
            ? () => router.push("/notifications/settings")
            : undefined
        }
        onOpenDevices={
          canOpen(perms, "devices") ? () => router.push("/settings/devices") : undefined
        }
        onChangePassword={() => router.push("/change-password")}
        version={appVersionText()}
        onSignOut={async () => {
          setSigningOut(true);
          await signOut();
        }}
        signingOut={signingOut}
      />
    </Screen>
  );
}
