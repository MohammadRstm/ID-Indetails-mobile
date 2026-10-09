import { Redirect, Stack, useSegments } from "expo-router";
import { useMemo } from "react";
import { useSession } from "@/auth/session";
import { useCompanySettings } from "@/features/settings/api";
import { BootScreen } from "@/features/shell/screens/BootScreen";
import { SignedInServices } from "@/live/SignedInServices";
import { screenKeyForSegments } from "@/navigation/routeKey";
import { permissionsOf } from "@/permissions/permissions";
import { canOpen } from "@/permissions/screens";

/*
 * Everything signed in. The guards: signed out → sign-in; a temporary password → change it first; a screen this
 * person can't open → "Not available". The biometric lock covers this from the root layout.
 */
export default function AppLayout() {
  const { status, user } = useSession();
  const segments = useSegments();
  const perms = useMemo(() => (user ? permissionsOf(user) : null), [user]);
  const signedIn = status === "signedIn" && perms !== null;
  // Formatting needs the company's time zone, so the settings load before any screen. Offline or failing, the
  // defaults stay rather than holding the app on the boot screen.
  const settings = useCompanySettings({ enabled: signedIn && !user?.mustChangePassword });

  if (status === "loading") return <BootScreen />;
  if (!signedIn || !user) return <Redirect href="/sign-in" />;
  if (user.mustChangePassword) return <Redirect href="/change-password" />;
  if (settings.isPending && settings.fetchStatus === "fetching") return <BootScreen />;

  const key = screenKeyForSegments(segments);
  if (key && !canOpen(perms, key)) return <Redirect href="/not-available" />;

  return (
    <>
      <SignedInServices />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
