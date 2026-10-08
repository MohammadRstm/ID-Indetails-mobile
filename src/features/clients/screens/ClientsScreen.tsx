import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { toApiError } from "@/api/errors";
import { usePermissions } from "@/permissions/usePermissions";
import { spacing } from "@/theme/tokens";
import {
  Badge,
  Card,
  EmptyState,
  ListRow,
  LoadError,
  Screen,
  ScreenHeader,
  Segmented,
  Skeleton,
  TextField,
} from "@/ui";
import { useClients } from "../api";

const DOMAIN_LABEL: Record<string, string> = { design: "Design", execution: "Execution" };

/** The clients of a domain; a person who sees both picks one (client:view). */
export function ClientsScreen() {
  const perms = usePermissions();
  const [domain, setDomain] = useState<string>(
    perms.homeDomain ?? perms.visibleDomains[0] ?? "design",
  );
  const [search, setSearch] = useState("");
  const clients = useClients({ domain, search: search.trim() });
  const error = clients.error ? toApiError(clients.error) : null;

  return (
    <Screen
      header={
        <ScreenHeader
          title="Clients"
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }
      refreshing={clients.isRefetching}
      onRefresh={() => void clients.refetch()}
    >
      <View style={styles.body}>
        {perms.visibleDomains.length > 1 ? (
          <Segmented
            options={perms.visibleDomains.map((d) => ({ value: d, label: DOMAIN_LABEL[d] ?? d }))}
            value={domain}
            onChange={setDomain}
            accessibilityLabel="Domain"
          />
        ) : null}
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Search clients"
          accessibilityLabel="Search clients"
          autoCorrect={false}
        />
        {!clients.data ? (
          error ? (
            <LoadError
              what="the clients"
              message={error.message}
              traceId={error.traceId}
              onRetry={() => void clients.refetch()}
            />
          ) : (
            <Skeleton lines={6} height={18} />
          )
        ) : clients.data.length === 0 ? (
          <EmptyState art="search" title={search ? "No client matches" : "No clients yet"} />
        ) : (
          <Card padded={false}>
            {clients.data.map((c, i) => (
              <ListRow
                key={c.id}
                title={c.displayName}
                subtitle={`${c.projectCount} ${c.projectCount === 1 ? "project" : "projects"}`}
                trailing={c.label ? <Badge label={c.label} /> : undefined}
                chevron
                divider={i < clients.data.length - 1}
                onPress={() =>
                  router.push({ pathname: "/clients/[id]", params: { id: String(c.id) } })
                }
              />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.l } });
