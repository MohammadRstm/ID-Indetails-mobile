import { router, type Href } from "expo-router";
import { useState } from "react";
import { useSession } from "@/auth/session";
import { useUnsentRecordsGuard } from "@/offline/signOutGuard";
import { usePermissions } from "@/permissions/usePermissions";
import {
  canOpen,
  screens,
  tabsFor,
  type Screen as ScreenEntry,
  type ScreenKey,
} from "@/permissions/screens";
import { Card, ConfirmDialog, Icon, ListRow, Screen, ScreenHeader, Section } from "@/ui";

const KEYS = Object.keys(screens) as ScreenKey[];

/** Everything that isn't a tab: the person's other screens, settings, and signing out. */
export function MoreScreen() {
  const perms = usePermissions();
  const { user } = useSession();
  const { signOut, dialog } = useUnsentRecordsGuard();
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const tabs = new Set<ScreenKey>(tabsFor(perms).map((tab) => tab.key));
  const entries = KEYS.filter((key) => {
    const entry: ScreenEntry = screens[key];
    return entry.moreIcon && !tabs.has(key) && canOpen(perms, key);
  });

  return (
    <Screen
      header={
        <ScreenHeader
          title="More"
          subtitle={user ? `${user.firstName} ${user.lastName}` : undefined}
        />
      }
    >
      <Section>
        <Card padded={false}>
          {entries.map((key, i) => {
            const entry: ScreenEntry = screens[key];
            return (
              <ListRow
                key={key}
                title={entry.title}
                leading={entry.moreIcon && <Icon name={entry.moreIcon} />}
                chevron
                divider={i < entries.length - 1}
                onPress={() => router.push(entry.pathname as Href)}
              />
            );
          })}
        </Card>
      </Section>
      <Section>
        <Card padded={false}>
          <ListRow
            title="Sign out"
            leading={<Icon name="logout" />}
            onPress={() => setConfirming(true)}
          />
        </Card>
      </Section>
      <ConfirmDialog
        visible={confirming}
        title="Sign out?"
        message="You'll need your password to sign in again."
        confirmLabel="Sign out"
        destructive
        busy={signingOut}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setSigningOut(true);
          await signOut();
        }}
      />
      {dialog}
    </Screen>
  );
}
