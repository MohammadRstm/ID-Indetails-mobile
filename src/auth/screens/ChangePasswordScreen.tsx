import { Button, EmptyState, Screen, ScreenHeader } from "@/ui";
import { useSession } from "../session";

/**
 * Changing a temporary password before anything else. Placeholder until Phase 1b builds it; signing out is the
 * way out meanwhile.
 */
export function ChangePasswordScreen() {
  const { signOut } = useSession();
  return (
    <Screen header={<ScreenHeader title="Change your password" />}>
      <EmptyState
        art="time"
        title="Coming in phase 1b"
        text="Your account has a temporary password. Change it on the website for now, then sign in again."
        action={<Button label="Sign out" onPress={() => void signOut()} />}
      />
    </Screen>
  );
}
