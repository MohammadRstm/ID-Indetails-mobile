import { useState } from "react";
import type { ThemePreference } from "@/theme/ThemeProvider";
import {
  Card,
  ConfirmDialog,
  Icon,
  ListRow,
  Section,
  Segmented,
  Switch,
  Text,
  type SegmentOption,
} from "@/ui";

const THEMES: SegmentOption<ThemePreference>[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export type LockSetting =
  /** The phone has a screen lock: the app can be locked with it. */
  | { kind: "available"; name: string; enabled: boolean; busy: boolean }
  /** No screen lock at all on the phone. */
  | { kind: "unavailable" }
  | { kind: "checking" };

type SettingsViewProps = {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  lock: LockSetting;
  onLockChange: (enabled: boolean) => void;
  /** Each link is left out when the person can't open its screen. */
  onOpenNotifications?: () => void;
  onOpenDevices?: () => void;
  onChangePassword: () => void;
  version: string;
  onSignOut: () => void;
  signingOut: boolean;
};

/** This phone's settings: appearance, the lock, the account, and the app's version. */
export function SettingsView({
  theme,
  onThemeChange,
  lock,
  onLockChange,
  onOpenNotifications,
  onOpenDevices,
  onChangePassword,
  version,
  onSignOut,
  signingOut,
}: SettingsViewProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
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
            value={theme}
            onChange={onThemeChange}
            accessibilityLabel="Theme"
          />
        </Card>
      </Section>

      <Section title="Security">
        <Card padded={false}>
          {lock.kind === "available" ? (
            <ListRow
              title={`Lock with ${lock.name}`}
              subtitle="Asks for it when the app opens and after 5 minutes away."
              leading={<Icon name="lock" />}
              trailing={
                <Switch
                  value={lock.enabled}
                  onValueChange={onLockChange}
                  disabled={lock.busy}
                  accessibilityLabel={`Lock with ${lock.name}`}
                />
              }
              divider
            />
          ) : (
            <ListRow
              title="Lock the app"
              subtitle={
                lock.kind === "unavailable"
                  ? "Set a screen lock on this phone first, in its own settings."
                  : "Checking what this phone can unlock with…"
              }
              leading={<Icon name="lock" />}
              divider
            />
          )}
          <ListRow
            title="Change password"
            subtitle="Signs you out on your other devices."
            leading={<Icon name="shield" />}
            chevron
            divider={!!onOpenDevices}
            onPress={onChangePassword}
          />
          {onOpenDevices ? (
            <ListRow
              title="My devices"
              leading={<Icon name="phone" />}
              chevron
              onPress={onOpenDevices}
            />
          ) : null}
        </Card>
      </Section>

      {onOpenNotifications ? (
        <Section title="Notifications">
          <Card padded={false}>
            <ListRow
              title="Notification settings"
              subtitle="Quiet hours and what you hear about."
              leading={<Icon name="bell" />}
              chevron
              onPress={onOpenNotifications}
            />
          </Card>
        </Section>
      ) : null}

      <Section>
        <Card padded={false}>
          <ListRow
            title="Sign out"
            leading={<Icon name="logout" />}
            onPress={() => setConfirming(true)}
          />
        </Card>
      </Section>

      <Text variant="small" tone="muted" align="center">
        {`ID InDetails ${version}`}
      </Text>

      <ConfirmDialog
        visible={confirming}
        title="Sign out?"
        message="You'll need your password to sign in again."
        confirmLabel="Sign out"
        destructive
        busy={signingOut}
        onCancel={() => setConfirming(false)}
        onConfirm={onSignOut}
      />
    </>
  );
}
