import { router } from "expo-router";
import { EmptyState, Screen, ScreenHeader } from "@/ui";

type PlaceholderScreenProps = {
  title: string;
  /** The phase that builds this screen. */
  phase: string;
};

/** Stands in for a screen its owner hasn't built yet; each owner replaces the screen that renders it. */
export function PlaceholderScreen({ title, phase }: PlaceholderScreenProps) {
  return (
    <Screen
      header={
        <ScreenHeader title={title} onBack={router.canGoBack() ? () => router.back() : undefined} />
      }
    >
      <EmptyState
        art="time"
        title={`Coming in phase ${phase}`}
        text="This screen is being built. Everything else keeps working."
      />
    </Screen>
  );
}
