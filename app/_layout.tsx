import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "@/api/queryClient";
import { LockOverlay } from "@/auth/lock/LockOverlay";
import { LockProvider } from "@/auth/lock/LockProvider";
import { SessionProvider } from "@/auth/session";
import { registerWidgets } from "@/features/widgets";
import { fontAssets } from "@/theme/fonts";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { ToastHost } from "@/ui";

// The splash stays up until the fonts are in, so no text is ever drawn in the wrong face.
SplashScreen.preventAutoHideAsync().catch(() => {
  // already hidden (a reload in development)
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // A font that fails to load leaves the system font in its place; the app still opens.
  const ready = fontsLoaded || fontError != null;

  useEffect(() => {
    void registerWidgets();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <LockProvider>
                <ThemedStack />
                <ToastHost />
                <LockOverlay />
              </LockProvider>
            </SessionProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStack() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}
      />
    </>
  );
}
