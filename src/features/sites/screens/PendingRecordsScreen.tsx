import { router } from "expo-router";
import { useCurrentUser } from "@/auth/session";
import { useOutbox } from "@/offline/outbox";
import { EmptyState, Screen, ScreenHeader, Section, Text } from "@/ui";
import { PendingRecordsList } from "./PendingRecordsList";

/** Records saved on the phone: waiting, sending, sent (kept a week) or needing attention. */
export function PendingRecordsScreen() {
  const me = useCurrentUser();
  const records = useOutbox(me.id);
  return (
    <Screen
      header={
        <ScreenHeader
          title="Pending records"
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/today"))}
        />
      }
    >
      {records.length === 0 ? (
        <EmptyState
          art="done"
          title="Nothing waiting"
          text="Materials and labour weeks you record without signal show here until they are sent."
        />
      ) : (
        <Section>
          <Text variant="small" tone="muted">
            Saved on this phone. Sent records are kept here for a week.
          </Text>
          <PendingRecordsList />
        </Section>
      )}
    </Screen>
  );
}
