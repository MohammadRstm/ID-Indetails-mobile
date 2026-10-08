import { useCurrentUser } from "@/auth/session";
import { useOutbox } from "@/offline/outbox";

/** How many of the person's records wait to be sent and how many need attention (optionally on one site). */
export function usePendingCounts(projectId?: number) {
  const me = useCurrentUser();
  const records = useOutbox(me.id).filter((r) => projectId == null || r.projectId === projectId);
  return {
    waiting: records.filter((r) => r.status === "pending" || r.status === "sending").length,
    needsAttention: records.filter((r) => r.status === "needs_attention").length,
  };
}
