import { router } from "expo-router";
import { Button, EmptyState, Screen, ScreenHeader } from "@/ui";

/** A screen the person can't open (their permissions, or a link to something outside their domain). */
export function NotAvailableScreen() {
  return (
    <Screen header={<ScreenHeader title="Not available" />}>
      <EmptyState
        art="search"
        title="Not available to you"
        text="This isn't part of what your account can open. If you think it should be, ask an admin."
        action={
          <Button label="Go to Today" variant="primary" onPress={() => router.replace("/today")} />
        }
      />
    </Screen>
  );
}
