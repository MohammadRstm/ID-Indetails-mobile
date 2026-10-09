import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking } from "react-native";
import { toApiError } from "@/api/errors";
import type { NotificationCategory } from "@/api/mobileTypes";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import { askAndRegister } from "@/push/register";
import {
  Button,
  Card,
  InlineError,
  ListRow,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  Switch,
  Text,
  TimeField,
  toast,
} from "@/ui";
import { useNotificationSettings, useSaveNotificationSettings } from "../api";

const CATEGORIES: { key: NotificationCategory; label: string; about: string }[] = [
  { key: "messages", label: "Messages", about: "Team and direct messages, and mentions" },
  { key: "requirements", label: "Requirements", about: "Assigned, due, overdue and completed" },
  { key: "work", label: "Work", about: "Comments on your entries, weekly summaries, schedules" },
  { key: "projects", label: "Projects", about: "New projects and status changes" },
  { key: "meetings", label: "Meetings", about: "Meetings scheduled on projects" },
  { key: "sites", label: "Sites", about: "Materials, labour weeks and the Saturday reminder" },
  { key: "people", label: "People", about: "Your role, team and permissions" },
  { key: "money", label: "Money", about: "Invoices, payments and project money" },
];

const DEFAULT_FROM = 22 * 60;
const DEFAULT_TO = 7 * 60;

/** Push settings: quiet hours (delivered silently) and the kinds of push to stop on every phone. */
export function NotificationSettingsScreen() {
  const perms = usePermissions();
  const settings = useNotificationSettings();
  const save = useSaveNotificationSettings();
  const [quiet, setQuiet] = useState<{ from: number; to: number } | null>(null);
  const [muted, setMuted] = useState<NotificationCategory[]>([]);
  const [loadedAt, setLoadedAt] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [permission, setPermission] = useState<"granted" | "denied" | "ask" | null>(null);

  // The form starts from what was loaded, once per load.
  if (settings.data && settings.dataUpdatedAt !== loadedAt) {
    setLoadedAt(settings.dataUpdatedAt);
    const { quietFromMinute: from, quietToMinute: to } = settings.data;
    setQuiet(from != null && to != null ? { from, to } : null);
    setMuted(settings.data.mutedCategories);
  }

  useEffect(() => {
    void Notifications.getPermissionsAsync()
      .then((p) => setPermission(p.granted ? "granted" : p.canAskAgain ? "ask" : "denied"))
      .catch(() => setPermission(null));
  }, []);

  const categories = CATEGORIES.filter((c) => c.key !== "money" || perms.has(P.FINANCIAL_VIEW));

  async function submit() {
    setProblem(null);
    if (quiet && quiet.from === quiet.to) {
      setProblem("Quiet hours need to start and end at different times.");
      return;
    }
    try {
      await save.mutateAsync({
        quietFromMinute: quiet?.from ?? null,
        quietToMinute: quiet?.to ?? null,
        mutedCategories: muted,
      });
      toast({ text: "Notification settings saved", icon: "checkCircle" });
    } catch (error) {
      setProblem(toApiError(error).message);
    }
  }

  return (
    <Screen
      header={
        <ScreenHeader
          title="Notifications"
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/alerts"))}
        />
      }
    >
      {permission && permission !== "granted" ? (
        <Section>
          <Card>
            <Text variant="subheading">Notifications are off on this phone</Text>
            <Text variant="small" tone="secondary">
              Turn them on to hear about messages, requirements and your sites.
            </Text>
            <Button
              label={permission === "ask" ? "Turn on" : "Open the phone's settings"}
              variant="primary"
              onPress={async () => {
                if (permission === "ask") {
                  const state = await askAndRegister().catch(() => "denied" as const);
                  setPermission(
                    state === "registered" || state === "unavailable" ? "granted" : "denied",
                  );
                } else {
                  void Linking.openSettings();
                }
              }}
            />
          </Card>
        </Section>
      ) : null}
      {settings.isError && !settings.data ? (
        <LoadError
          what="your settings"
          message={toApiError(settings.error).message}
          onRetry={() => void settings.refetch()}
        />
      ) : !settings.data ? (
        <Skeleton lines={8} height={20} />
      ) : (
        <>
          <Section title="Quiet hours">
            <Card>
              <ListRow
                title="Deliver silently at night"
                subtitle="Pushes still arrive, without sound, and wait for you."
                trailing={
                  <Switch
                    value={quiet !== null}
                    onValueChange={(on) =>
                      setQuiet(on ? { from: DEFAULT_FROM, to: DEFAULT_TO } : null)
                    }
                    accessibilityLabel="Quiet hours"
                  />
                }
              />
              {quiet ? (
                <>
                  <TimeField
                    label="From"
                    value={quiet.from}
                    onChange={(from) => setQuiet({ ...quiet, from })}
                  />
                  <TimeField
                    label="Until"
                    value={quiet.to}
                    onChange={(to) => setQuiet({ ...quiet, to })}
                  />
                </>
              ) : null}
            </Card>
          </Section>
          <Section title="Send pushes for">
            <Card padded={false}>
              {categories.map((c, i) => (
                <ListRow
                  key={c.key}
                  title={c.label}
                  subtitle={c.about}
                  divider={i < categories.length - 1}
                  trailing={
                    <Switch
                      value={!muted.includes(c.key)}
                      onValueChange={(on) =>
                        setMuted(on ? muted.filter((m) => m !== c.key) : [...muted, c.key])
                      }
                      accessibilityLabel={`Pushes for ${c.label}`}
                    />
                  }
                />
              ))}
            </Card>
            <Text variant="small" tone="muted">
              The list in Alerts always shows everything. Reminders to log your hours can’t be
              muted.
            </Text>
          </Section>
          {problem ? <InlineError message={problem} /> : null}
          <Button
            label="Save"
            variant="primary"
            size="large"
            fullWidth
            loading={save.isPending}
            onPress={() => void submit()}
          />
        </>
      )}
    </Screen>
  );
}
