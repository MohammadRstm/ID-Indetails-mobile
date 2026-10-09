import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { toApiError } from "@/api/errors";
import type { EmployeeSummary } from "@/api/types";
import { relTime } from "@/format/time";
import { spacing } from "@/theme/tokens";
import {
  Avatar,
  Card,
  EmptyState,
  ListRow,
  LoadError,
  Screen,
  ScreenHeader,
  Skeleton,
  TextField,
} from "@/ui";
import { personName, useEmployees } from "../api";

export const presenceOf = (p: Pick<EmployeeSummary, "online" | "lastSeenAt">) =>
  p.online ? "Online" : p.lastSeenAt ? `Seen ${relTime(p.lastSeenAt)}` : "Not seen yet";

/** Design's people, with who is online (employee:view). */
export function PeopleScreen() {
  const [search, setSearch] = useState("");
  const people = useEmployees({ domain: "design", search: search.trim() });
  const error = people.error ? toApiError(people.error) : null;

  return (
    <Screen
      header={
        <ScreenHeader
          title="People"
          subtitle="Design"
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }
      refreshing={people.isRefetching}
      onRefresh={() => void people.refetch()}
    >
      <View style={styles.body}>
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Search people"
          accessibilityLabel="Search people"
          autoCorrect={false}
        />
        {!people.data ? (
          error ? (
            <LoadError
              what="the people"
              message={error.message}
              traceId={error.traceId}
              onRetry={() => void people.refetch()}
            />
          ) : (
            <Skeleton lines={6} height={18} />
          )
        ) : people.data.length === 0 ? (
          <EmptyState art="search" title={search ? "No one matches" : "No people yet"} />
        ) : (
          <Card padded={false}>
            {people.data.map((p, i) => (
              <ListRow
                key={p.id}
                title={personName(p)}
                subtitle={[p.position, presenceOf(p)].filter(Boolean).join(" · ")}
                leading={
                  <Avatar
                    name={personName(p)}
                    size={36}
                    presence={p.online ? "online" : "offline"}
                  />
                }
                chevron
                divider={i < people.data.length - 1}
                onPress={() =>
                  router.push({ pathname: "/people/[id]", params: { id: String(p.id) } })
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
