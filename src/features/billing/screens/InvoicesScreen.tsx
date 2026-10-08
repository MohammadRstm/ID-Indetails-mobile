import { router } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { toApiError } from "@/api/errors";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import {
  Chip,
  EmptyState,
  IconButton,
  InlineError,
  LoadError,
  Screen,
  ScreenHeader,
  Skeleton,
} from "@/ui";
import { useInvoiceList, type InvoiceFilter } from "../api";
import { InvoiceRow } from "../components/InvoiceRow";

const FILTERS: { value: InvoiceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "sent", label: "Sent" },
  { value: "draft", label: "Drafts" },
];

const EMPTY: Record<InvoiceFilter, string> = {
  all: "No invoices yet. They are drafted on the web.",
  overdue: "Nothing is overdue.",
  sent: "No invoices are waiting to be paid.",
  draft: "No drafts are waiting.",
};

/** Every invoice the person can see, newest first, narrowed to overdue, sent or drafts. */
export function InvoicesScreen() {
  const perms = usePermissions();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<InvoiceFilter>("all");
  const query = useInvoiceList(filter);
  const invoices = query.data?.pages.flatMap((page) => page.items) ?? [];
  const error = query.isError ? toApiError(query.error) : null;

  const header = (
    <ScreenHeader
      title="Invoices"
      onBack={router.canGoBack() ? () => router.back() : undefined}
      actions={
        perms.has(P.PAYMENT_RECORD) ? (
          <IconButton
            icon="card"
            accessibilityLabel="Record a payment"
            onPress={() => router.push("/billing/payments/new")}
          />
        ) : undefined
      }
    />
  );

  return (
    <Screen header={header} scroll={false} padded={false}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersBar}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </ScrollView>

      {query.isPending ? (
        <View style={styles.padded}>
          <Skeleton height={64} radius={radii.r2} />
          <Skeleton height={64} radius={radii.r2} />
          <Skeleton height={64} radius={radii.r2} />
        </View>
      ) : error && invoices.length === 0 ? (
        <LoadError
          what="the invoices"
          message={error.message}
          traceId={error.traceId}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(invoice) => String(invoice.id)}
          renderItem={({ item, index }) => (
            <InvoiceRow
              invoice={item}
              divider={index < invoices.length - 1}
              onPress={() =>
                router.push({ pathname: "/billing/invoices/[id]", params: { id: String(item.id) } })
              }
            />
          )}
          style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.line }]}
          contentContainerStyle={invoices.length === 0 && styles.emptyList}
          ListEmptyComponent={<EmptyState art="search" title={EMPTY[filter]} />}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            query.isFetchNextPageError ? (
              <View style={styles.padded}>
                <InlineError
                  what="more invoices"
                  message={toApiError(query.error).message}
                  onRetry={() => void query.fetchNextPage()}
                />
              </View>
            ) : query.isFetchingNextPage ? (
              <View style={styles.padded}>
                <Skeleton height={48} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => void query.refetch()}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filtersBar: { flexGrow: 0 },
  filters: { gap: spacing.m, paddingHorizontal: spacing.l, paddingVertical: spacing.row },
  padded: { padding: spacing.l, gap: spacing.m },
  list: { flex: 1, borderTopWidth: 1 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
});
