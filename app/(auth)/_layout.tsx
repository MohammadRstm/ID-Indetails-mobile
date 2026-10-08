import { Redirect, Stack, useSegments } from "expo-router";
import { useSession } from "@/auth/session";
import { BootScreen } from "@/features/shell/screens/BootScreen";

/** The signed-out screens. Someone signed in goes on to the app, or to change a temporary password first. */
export default function AuthLayout() {
  const { status, user } = useSession();
  const segments = useSegments();
  const changingPassword = segments[segments.length - 1] === "change-password";

  if (status === "loading") return <BootScreen />;
  if (status === "signedIn" && user && !user.mustChangePassword) return <Redirect href="/today" />;
  if (status === "signedIn" && !changingPassword) return <Redirect href="/change-password" />;
  if (status === "signedOut" && changingPassword) return <Redirect href="/sign-in" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
