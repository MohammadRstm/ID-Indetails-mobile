import { Redirect, Stack, useSegments } from "expo-router";
import { useSession } from "@/auth/session";
import { BootScreen } from "@/features/shell/screens/BootScreen";

/*
 * The signed-out screens, and changing the password. Someone signed in goes on to the app, or first to choose
 * their own password while a temporary one is pending; nobody signed out can change a password here.
 */
export default function AuthLayout() {
  const { status, user } = useSession();
  const segments = useSegments();
  const changingPassword = segments[segments.length - 1] === "change-password";

  if (status === "loading") return <BootScreen />;
  if (status === "signedIn" && user && !changingPassword) {
    return <Redirect href={user.mustChangePassword ? "/change-password" : "/today"} />;
  }
  if (status === "signedOut" && changingPassword) return <Redirect href="/sign-in" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
