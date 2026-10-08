import { router } from "expo-router";
import { useTheme, type ThemePreference } from "@/theme/ThemeProvider";
import { Card, Screen, ScreenHeader, Section, Segmented, Text } from "@/ui";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** This phone's settings. Phase 1b adds biometrics. */
export function SettingsScreen() {
  const { preference, setPreference } = useTheme();
  return (
    <Screen header={<ScreenHeader title="Settings" onBack={() => router.back()} />}>
      <Section title="Appearance">
        <Card>
          <Text variant="label" tone="secondary">
            Theme
          </Text>
          <Text variant="small" tone="muted">
            System follows the phone&apos;s light or dark setting.
          </Text>
          <Segmented
            options={THEMES}
            value={preference}
            onChange={setPreference}
            accessibilityLabel="Theme"
          />
        </Card>
      </Section>
    </Screen>
  );
}
