import { toApiError } from "@/api/errors";
import { InlineError, Sheet, Skeleton, Text } from "@/ui";
import { useForgetMemory, useProtonMemories } from "../api";
import { MemoryList } from "../components/MemoryList";

type ProtonMemoriesProps = {
  visible: boolean;
  onClose: () => void;
};

/** What Proton remembers for the person between chats, in their own words, each with Forget. */
export function ProtonMemories({ visible, onClose }: ProtonMemoriesProps) {
  const memories = useProtonMemories(visible);
  const forget = useForgetMemory();

  return (
    <Sheet visible={visible} onClose={onClose} title="What I remember">
      <Text tone="secondary">
        Things you asked me to remember, in your words. I use them only for how I answer you.
      </Text>
      {memories.data ? (
        <MemoryList
          memories={memories.data}
          forgettingId={forget.isPending ? (forget.variables ?? null) : null}
          onForget={(id) => forget.mutate(id)}
        />
      ) : memories.isError ? (
        <InlineError
          message={toApiError(memories.error).message}
          what="what I remember"
          onRetry={() => void memories.refetch()}
        />
      ) : (
        <Skeleton lines={3} height={18} />
      )}
      {forget.isError ? <InlineError message={toApiError(forget.error).message} /> : null}
    </Sheet>
  );
}
