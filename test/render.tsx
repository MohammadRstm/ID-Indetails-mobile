import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createQueryClient } from "@/api/queryClient";
import type { CurrentUser } from "@/api/types";
import { SessionProvider } from "@/auth/session";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { personas, type PersonaName } from "./personas";

type RenderOptions = {
  /** Who is signed in: a persona, a custom user, or null for nobody. Defaults to a Design employee. */
  persona?: PersonaName | CurrentUser | null;
};

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * Renders inside the app's providers (theme, a fresh query cache, a signed-in session), as a screen would be.
 * `rerender` keeps the providers.
 */
export async function renderWithProviders(
  ui: ReactElement,
  { persona = "designEmployee" }: RenderOptions = {},
) {
  const user =
    persona === null ? undefined : typeof persona === "string" ? personas[persona] : persona;
  const queryClient = createQueryClient();
  // Failures show at once instead of after the app's retries.
  queryClient.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false },
  });

  function Providers({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <SessionProvider initialUser={user}>{children}</SessionProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  const result = await render(ui, { wrapper: Providers });
  return { ...result, queryClient, user: user ?? null };
}
