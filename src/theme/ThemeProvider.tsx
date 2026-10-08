import Storage from "expo-sqlite/kv-store";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { dark, light, type Colors } from "./tokens";

export type Scheme = "light" | "dark";
export type ThemePreference = "system" | Scheme;

type ThemeValue = {
  colors: Colors;
  scheme: Scheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

// Per device, like the web's theme (decision 12: follow the phone unless the person picks one).
const PREFERENCE_KEY = "theme.preference";

function readPreference(): ThemePreference {
  try {
    const stored = Storage.getItemSync(PREFERENCE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

const ThemeContext = createContext<ThemeValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  /** Draws everything inside in one scheme whatever the preference (the UI gallery shows both). */
  forceScheme?: Scheme;
};

export function ThemeProvider({ children, forceScheme }: ThemeProviderProps) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    Storage.setItem(PREFERENCE_KEY, next).catch(() => {
      // the choice still applies until the app closes
    });
  }, []);

  const scheme: Scheme =
    forceScheme ?? (preference === "system" ? (system === "dark" ? "dark" : "light") : preference);

  const value = useMemo<ThemeValue>(
    () => ({ colors: scheme === "dark" ? dark : light, scheme, preference, setPreference }),
    [scheme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme is used outside ThemeProvider.");
  return value;
}
