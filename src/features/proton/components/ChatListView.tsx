import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Button, InlineError, Skeleton, Text, TextField } from "@/ui";
import { emptyChatsText, type ChatRowData } from "../chatList";
import { ChatRow } from "./ChatRow";

type ChatListViewProps = {
  search: string;
  onSearchChange: (text: string) => void;
  rows: ChatRowData[];
  /** The chat that is open now. */
  currentId: string | null;
  status: "loading" | "error" | "ready";
  errorMessage: string;
  onRetry: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  /** Why the last thing tried (opening a chat) didn't work. */
  problem: string | null;
  onPick: (id: string) => void;
  onRename: (row: ChatRowData) => void;
  onDelete: (row: ChatRowData) => void;
};

/** The person's saved chats with a search box, newest first. */
export function ChatListView({
  search,
  onSearchChange,
  rows,
  currentId,
  status,
  errorMessage,
  onRetry,
  hasMore,
  loadingMore,
  onLoadMore,
  problem,
  onPick,
  onRename,
  onDelete,
}: ChatListViewProps) {
  return (
    <View style={styles.wrap}>
      <TextField
        value={search}
        onChangeText={onSearchChange}
        placeholder="Search your chats"
        accessibilityLabel="Search chats"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {problem ? <InlineError message={problem} /> : null}
      {status === "loading" ? <Skeleton lines={4} height={18} /> : null}
      {status === "error" ? (
        <InlineError message={errorMessage} what="your chats" onRetry={onRetry} />
      ) : null}
      {status === "ready" && rows.length === 0 ? (
        <Text tone="muted">{emptyChatsText(search.trim().length > 0)}</Text>
      ) : null}
      {rows.length > 0 ? (
        <View>
          {rows.map((row) => (
            <ChatRow
              key={row.id}
              title={row.title}
              subtitle={row.subtitle}
              current={row.id === currentId}
              onPress={() => onPick(row.id)}
              onRename={() => onRename(row)}
              onDelete={() => onDelete(row)}
            />
          ))}
        </View>
      ) : null}
      {hasMore ? (
        <Button label="Show more" variant="quiet" onPress={onLoadMore} loading={loadingMore} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.l },
});
