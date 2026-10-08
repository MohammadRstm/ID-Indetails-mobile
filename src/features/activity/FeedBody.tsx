import { StyleSheet, View } from "react-native";
import { toApiError } from "@/api/errors";
import { spacing } from "@/theme/tokens";
import { Button, EmptyState, InlineError, LoadError, Skeleton } from "@/ui";
import type { useActivityFeed } from "./api";
import { FeedDays } from "./components/FeedDays";
import { useFeedDays } from "./useFeedRows";

type FeedBodyProps = {
  feed: ReturnType<typeof useActivityFeed>;
  hideProject?: boolean;
  emptyTitle: string;
  emptyText?: string;
};

/** A loaded feed's days, or its loading, failed or empty state, with "Load more" while there are older events. */
export function FeedBody({ feed, hideProject, emptyTitle, emptyText }: FeedBodyProps) {
  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const days = useFeedDays(items, { hideProject });

  if (!feed.data) {
    if (feed.error) {
      const error = toApiError(feed.error);
      return (
        <LoadError
          what="the activity"
          message={error.message}
          traceId={error.traceId}
          onRetry={() => void feed.refetch()}
        />
      );
    }
    return <Skeleton lines={8} height={18} />;
  }
  if (items.length === 0) return <EmptyState art="search" title={emptyTitle} text={emptyText} />;

  return (
    <View style={styles.body}>
      <FeedDays days={days} />
      {feed.error ? (
        <InlineError message={toApiError(feed.error).message} onRetry={() => void feed.refetch()} />
      ) : null}
      {feed.hasNextPage ? (
        <Button
          label="Load more"
          variant="quiet"
          fullWidth
          loading={feed.isFetchingNextPage}
          onPress={() => void feed.fetchNextPage()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.l } });
