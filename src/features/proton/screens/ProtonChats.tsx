import { useState } from "react";
import { toApiError } from "@/api/errors";
import { Button, ConfirmDialog, Sheet } from "@/ui";
import { useDeleteChat, useProtonChats, useRenameChat } from "../api";
import { chatRows, type ChatRowData } from "../chatList";
import { ChatListView } from "../components/ChatListView";
import { RenameChatSheet } from "../components/RenameChatSheet";
import { useDebounced } from "../useDebounced";

const SEARCH_DELAY_MS = 300;

type ProtonChatsProps = {
  visible: boolean;
  onClose: () => void;
  /** The chat that is open now. */
  currentId: string | null;
  /** Opens a saved chat; gives the reason when it can't be opened, or null. */
  onOpen: (id: string) => Promise<string | null>;
  /** Leaves the open chat for a fresh one. */
  onNew: () => void;
  /** A chat was deleted. */
  onDeleted: (id: string) => void;
};

/**
 * The person's saved chats: search, open, rename (hold a chat) and delete (with a question first). Deleting is the
 * only thing here that removes a chat; "New chat" only leaves the open one.
 */
export function ProtonChats({
  visible,
  onClose,
  currentId,
  onOpen,
  onNew,
  onDeleted,
}: ProtonChatsProps) {
  const [search, setSearch] = useState("");
  const settledSearch = useDebounced(search.trim(), SEARCH_DELAY_MS);
  const chats = useProtonChats(settledSearch, visible);
  const rename = useRenameChat();
  const remove = useDeleteChat();
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [renameError, setRenameError] = useState<string | undefined>();
  const [deleting, setDeleting] = useState<ChatRowData | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const rows = chatRows(chats.data?.pages.flatMap((page) => page.items) ?? []);
  const status = chats.data ? "ready" : chats.isError ? "error" : "loading";

  async function pick(id: string) {
    setProblem(null);
    if (id === currentId) return onClose();
    const failure = await onOpen(id);
    if (failure) setProblem(failure);
    else onClose();
  }

  function saveName() {
    if (!renaming || !renaming.title.trim()) return;
    setRenameError(undefined);
    rename.mutate(
      { id: renaming.id, title: renaming.title.trim() },
      {
        onSuccess: () => setRenaming(null),
        onError: (error) => setRenameError(toApiError(error).message),
      },
    );
  }

  function deleteChat() {
    if (!deleting) return;
    const { id } = deleting;
    remove.mutate(id, {
      onSuccess: () => {
        setDeleting(null);
        onDeleted(id);
      },
      onError: (error) => {
        setDeleting(null);
        setProblem(toApiError(error).message);
      },
    });
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Your chats"
      footer={<Button label="New chat" icon="plus" variant="primary" onPress={onNew} />}
    >
      <ChatListView
        search={search}
        onSearchChange={setSearch}
        rows={rows}
        currentId={currentId}
        status={status}
        errorMessage={chats.error ? toApiError(chats.error).message : ""}
        onRetry={() => void chats.refetch()}
        hasMore={chats.hasNextPage}
        loadingMore={chats.isFetchingNextPage}
        onLoadMore={() => void chats.fetchNextPage()}
        problem={problem}
        onPick={(id) => void pick(id)}
        onRename={(row) => {
          setRenameError(undefined);
          setRenaming({ id: row.id, title: row.title });
        }}
        onDelete={setDeleting}
      />
      <RenameChatSheet
        visible={renaming != null}
        value={renaming?.title ?? ""}
        onChangeText={(title) => setRenaming((r) => r && { ...r, title })}
        onSave={saveName}
        onClose={() => setRenaming(null)}
        busy={rename.isPending}
        error={renameError}
      />
      <ConfirmDialog
        visible={deleting != null}
        title="Delete this chat?"
        message={`"${deleting?.title ?? ""}" and everything in it will be deleted. This can't be undone.`}
        confirmLabel="Delete"
        destructive
        busy={remove.isPending}
        onConfirm={deleteChat}
        onCancel={() => setDeleting(null)}
      />
    </Sheet>
  );
}
