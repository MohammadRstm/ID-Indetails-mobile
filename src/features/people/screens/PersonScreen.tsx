import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { isApiError, toApiError } from "@/api/errors";
import type { Employee } from "@/api/types";
import { fmtDateY, fmtDur, relDay } from "@/format/time";
import { routeForTarget } from "@/navigation/targets";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import { useCurrentUser } from "@/auth/session";
import { spacing } from "@/theme/tokens";
import { protonHrefFor } from "@/features/proton/pageContext";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  IconButton,
  ListRow,
  LoadError,
  Money,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  Text,
} from "@/ui";
import { personName, useEmployee, useRecentEntries, useSiteRecords } from "../api";
import { ContactActions } from "../components/ContactActions";
import { PersonSecurityActions } from "../slots/PersonSecurityActions";
import { openLink } from "../useOpenLink";
import { presenceOf } from "./PeopleScreen";

export type PersonScreenProps = {
  personId: number;
};

const ROLES: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  employee: "Employee",
};

/** One person: who they are, how to reach them, and what they have done recently (employee:view). */
export function PersonScreen({ personId }: PersonScreenProps) {
  const person = useEmployee(personId);
  const back = router.canGoBack() ? () => router.back() : undefined;

  if (!person.data) {
    const error = person.error ? toApiError(person.error) : null;
    return (
      <Screen header={<ScreenHeader title="Person" onBack={back} />}>
        {error ? (
          <LoadError
            what="this person"
            message={
              isApiError(person.error) && person.error.status === 404
                ? "This person doesn't exist or isn't visible to you."
                : error.message
            }
            traceId={error.traceId}
            onRetry={() => void person.refetch()}
          />
        ) : (
          <Skeleton lines={5} height={18} />
        )}
      </Screen>
    );
  }
  return (
    <PersonView
      person={person.data}
      onBack={back}
      onRefresh={() => void person.refetch()}
      refreshing={person.isRefetching}
    />
  );
}

type PersonViewProps = {
  person: Employee;
  onBack?: () => void;
  onRefresh: () => void;
  refreshing: boolean;
};

function PersonView({ person, onBack, onRefresh, refreshing }: PersonViewProps) {
  const perms = usePermissions();
  const me = useCurrentUser();
  const name = personName(person);
  const isMe = me?.id === person.id;
  const message = isMe ? null : routeForTarget({ type: "conversation", userId: person.id }, perms);
  // Hours are Design's; site records are Execution's (the web's person page).
  const hours = perms.has(P.WORK_ENTRY_VIEW_ALL) && person.domain === "design";
  const sites = perms.canSeeDomain("execution") && person.domain === "execution";

  return (
    <Screen
      header={
        <ScreenHeader
          title={name}
          subtitle={person.position ?? undefined}
          onBack={onBack}
          actions={
            perms.has(P.PROTON_USE) ? (
              <IconButton
                icon="compass"
                accessibilityLabel="Ask Proton about this person"
                onPress={() =>
                  router.push(protonHrefFor("person", person.id, person.domain ?? perms.homeDomain))
                }
              />
            ) : undefined
          }
        />
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.body}>
        <Card>
          <View style={styles.head}>
            <Avatar name={name} size={56} presence={person.online ? "online" : "offline"} />
            <View style={styles.headText}>
              <Text variant="heading">{name}</Text>
              <Text tone="muted">{presenceOf(person)}</Text>
              <Text variant="small" tone="muted">
                {[
                  ROLES[person.role] ?? person.role,
                  person.team?.name,
                  person.status === "active" ? null : "Deactivated",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {person.joinedOn ? (
                <Text variant="small" tone="muted">
                  Joined {fmtDateY(person.joinedOn)}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
        <ContactActions phone={person.phone} email={person.email} onOpen={openLink} />
        {message ? (
          <Button
            label="Send message"
            icon="chat"
            variant="primary"
            fullWidth
            onPress={() => router.push(message)}
          />
        ) : null}
        {hours ? <RecentWork personId={person.id} /> : null}
        {sites ? <SiteRecords personId={person.id} /> : null}
        <PersonSecurityActions person={person} />
      </View>
    </Screen>
  );
}

function RecentWork({ personId }: { personId: number }) {
  const entries = useRecentEntries(personId, true);
  return (
    <Section title="Recent work">
      {!entries.data ? (
        entries.error ? (
          <Text tone="muted">Couldn&apos;t load their work.</Text>
        ) : (
          <Skeleton lines={3} height={18} />
        )
      ) : entries.data.length === 0 ? (
        <EmptyState art="search" title="No work logged yet" />
      ) : (
        <Card padded={false}>
          {entries.data.map((e, i) => (
            <ListRow
              key={e.id}
              title={e.project.title}
              subtitle={`${relDay(e.startedAt)} · ${e.description}`}
              trailing={<Text variant="bodyStrong">{fmtDur(e.minutes)}</Text>}
              divider={i < entries.data.length - 1}
            />
          ))}
        </Card>
      )}
    </Section>
  );
}

function SiteRecords({ personId }: { personId: number }) {
  const perms = usePermissions();
  const records = useSiteRecords(personId, true);
  const seesMoney = perms.has(P.FINANCIAL_VIEW);
  return (
    <Section title="Site records">
      {!records.data ? (
        records.error ? (
          <Text tone="muted">Couldn&apos;t load their site records.</Text>
        ) : (
          <Skeleton lines={3} height={18} />
        )
      ) : records.data.projects.length === 0 ? (
        <EmptyState art="search" title="Nothing recorded on sites yet" />
      ) : (
        <Card padded={false}>
          <ListRow
            title="Recorded"
            subtitle={`${records.data.materialCount} materials · ${records.data.labourWeeks} labour weeks · ${records.data.activeDays} active days`}
            trailing={
              seesMoney ? (
                <Money amount={records.data.total} currency={records.data.currency} />
              ) : undefined
            }
            divider
          />
          {records.data.projects.map((p, i) => (
            <ListRow
              key={p.projectId}
              title={p.title}
              subtitle={`${p.materialCount} materials · ${p.labourWeeks} labour weeks`}
              divider={i < records.data.projects.length - 1}
            />
          ))}
        </Card>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.l },
  head: { flexDirection: "row", gap: spacing.l, alignItems: "center" },
  headText: { flex: 1, gap: 2 },
});
