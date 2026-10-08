import { router } from "expo-router";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { Screen, ScreenHeader } from "@/ui";
import { Gallery } from "../components/Gallery";

/** Development only: the UI kit in light, then in dark, to compare with the web. */
export function GalleryScreen() {
  return (
    <Screen
      padded={false}
      header={<ScreenHeader title="UI gallery" onBack={() => router.back()} />}
    >
      <ThemeProvider forceScheme="light">
        <Gallery />
      </ThemeProvider>
      <ThemeProvider forceScheme="dark">
        <Gallery />
      </ThemeProvider>
    </Screen>
  );
}
