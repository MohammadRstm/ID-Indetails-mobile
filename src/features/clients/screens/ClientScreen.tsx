import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { isApiError, toApiError } from "@/api/errors";
import type { Client } from "@/api/types";
import { ContactActions } from "@/features/people/components/ContactActions";
import { openLink } from "@/features/people/useOpenLink";
import { useProjectList } from "@/features/projects/slots/projectAdminApi";
import { routeForTarget } from "@/navigation/targets";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import { spacing } from "@/theme/tokens";
import { protonHrefFor } from "@/features/proton/pageContext";
import {
  Badge,
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
  StatusBadge,
  Text,
} from "@/ui";
import { useClient } from "../api";

export type ClientScreenProps = {
  clientId: number;
};

/** One client: their contacts one tap away, and their projects (client:view). Money only with financial:view. */
export function ClientScreen({ clientId }: ClientScreenProps) {
  const client = useClient(clientId);
  const back = router.canGoBack() ? () => router.back() : undefined;

  if (!client.data) {
    const error = client.error ? toApiError(client.error) : null;
    return (
      <Screen header={<ScreenHeader title="Client" onBack={back} />}>
        {error ? (
          <LoadError
            what="this client"
            message={
              isApiError(client.error) && client.error.status === 404
                ? "This client doesn't exist or isn't visible to you."
                : error.message
            }
            traceId={error.traceId}
            onRetry={() => void client.refetch()}
          />
        ) : (
          <Skeleton lines={5} height={18} />
        )}
      </Screen>
    );
  }
  return (
    <ClientView
      client={client.data}
      onBack={back}
      onRefresh={() => void client.refetch()}
      refreshing={client.isRefetching}
    />
  );
}

type ClientViewProps = {
  client: Client;
  onBack?: () => void;
  onRefresh: () => void;
  refreshing: boolean;
};

function ClientView({ client, onBack, onRefresh, refreshing }: ClientViewProps) {
  const perms = usePermissions();
  const projects = useProjectList(
    { clientId: client.id, domain: client.domain, sort: "start", pageSize: 100 },
    perms.has(P.PROJECT_VIEW),
  );
  const money = perms.has(P.FINANCIAL_VIEW) ? client.money : null;

  return (
    <Screen
      header={
        <ScreenHeader
          title={client.displayName}
          subtitle={client.organisation ? client.name : undefined}
          onBack={onBack}
          actions={
            perms.has(P.PROTON_USE) ? (
              <IconButton
                icon="compass"
                accessibilityLabel="Ask Proton about this client"
                onPress={() => router.push(protonHrefFor("client", client.id, client.domain))}
              />
            ) : undefined
          }
        />
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.body}>
        {client.label || client.isArchived || client.note ? (
          <View style={styles.tags}>
            {client.label ? <Badge label={client.label} /> : null}
            {client.isArchived ? <Badge label="Archived" tone="arch" /> : null}
            {client.note ? <Text tone="secondary">{client.note}</Text> : null}
          </View>
        ) : null}

        <Section title="Contact">
          {client.contacts.length === 0 ? (
            <Text tone="muted">No contact details on file.</Text>
          ) : (
            <Card>
              <View style={styles.contacts}>
                {client.contacts.map((c) => (
                  <View key={c.id} style={styles.contact}>
                    <Text variant="bodyStrong">
                      {c.value}
                      {c.isPrimary ? " (main)" : ""}
                    </Text>
                    {c.label ? (
                      <Text variant="small" tone="muted">
                        {c.label}
                      </Text>
                    ) : null}
                    <ContactActions
                      phone={c.kind === "phone" ? c.value : null}
                      email={c.kind === "email" ? c.value : null}
                      whatsapp={c.isWhatsapp}
                      onOpen={openLink}
                    />
                  </View>
                ))}
              </View>
            </Card>
          )}
        </Section>

        {money ? (
          <Section title="Money">
            <Card padded={false}>
              <ListRow title="Revenue" trailing={<Money amount={money.revenue} />} divider />
              <ListRow
                title="Outstanding"
                trailing={<Money amount={money.billing.outstanding} />}
                divider
              />
              <ListRow title="Profit" trailing={<Money amount={money.profit} signed />} />
            </Card>
          </Section>
        ) : null}

        <Section title="Projects">
          {!perms.has(P.PROJECT_VIEW) ? (
            <Text tone="muted">{client.projectCount} projects</Text>
          ) : !projects.data ? (
            projects.error ? (
              <Text tone="muted">Couldn&apos;t load the projects.</Text>
            ) : (
              <Skeleton lines={3} height={18} />
            )
          ) : projects.data.items.length === 0 ? (
            <EmptyState art="projects" title="No projects yet" />
          ) : (
            <Card padded={false}>
              {projects.data.items.map((p, i) => {
                const href = routeForTarget(
                  { type: "project", id: p.id, domain: p.domain as "design" | "execution" },
                  perms,
                );
                return (
                  <ListRow
                    key={p.id}
                    title={p.title}
                    subtitle={`${p.progressPct}% done`}
                    trailing={<StatusBadge status={p.status} />}
                    chevron={href != null}
                    divider={i < projects.data.items.length - 1}
                    onPress={href ? () => router.push(href) : undefined}
                  />
                );
              })}
            </Card>
          )}
        </Section>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.l },
  tags: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.s },
  contacts: { gap: spacing.l },
  contact: { gap: spacing.s },
});
