import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { ProtonReply, Schemas } from "@/api/types";

/* Proton, the assistant (proton:use). Every key starts with "proton", so a confirmed change can refresh everything else. */

export type ProtonPendingAction = Schemas["ProtonPendingAction"];
export type ProtonPreview = Schemas["ProtonPreview"];
export type ProtonOutcome = Schemas["ProtonActionOutcomeResponse"];
export type ProtonActionSummary = Schemas["ProtonActionSummaryResponse"];
export type ProtonRef = Schemas["ProtonRef"];
export type ProtonChoice = Schemas["ProtonChoice"];
export type ProtonSource = Schemas["ProtonSourceResponse"];

/** A typed question, or one of the last reply's choices. A choice sends only what it is: the API checks it was offered. */
export type AskBody = {
  conversationId: string | null;
  text?: string;
  page?: Schemas["ProtonPageContext"] | null;
  choice?: { type: Schemas["ProtonRefType"]; id: number };
};

const usageKey = ["proton", "usage"] as const;
const actionsKey = ["proton", "actions"] as const;

/** The answer is written whole, not streamed, and can take a while: it gets its own, longer, timeout. */
export const ASK_TIMEOUT_MS = 55_000;

/** The person's question allowance this month, and whether Proton can answer now. */
export function useProtonUsage() {
  return useQuery({
    queryKey: usageKey,
    queryFn: async () => (await http.get<Schemas["ProtonUsageResponse"]>("/proton/usage")).data,
  });
}

/** One question. The answer may carry proposed changes, which only the person's Confirm carries out. */
export function useAskProton() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: AskBody) =>
      (await http.post<ProtonReply>("/proton/messages", body, { timeout: ASK_TIMEOUT_MS })).data,
    onSuccess: (reply) => queryClient.setQueryData(usageKey, reply.usage),
  });
}

/**
 * Confirms or cancels a proposed change: only its id and conversation go to the API (and, for a card that asks
 * for it, the phrase the person typed), which runs the stored change (or refuses it) itself. A confirmed change
 * can touch anything Proton shows, so every other cached screen refreshes.
 */
export function useDecideAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      action: ProtonPendingAction;
      conversationId: string;
      decision: "confirm" | "cancel";
      typed?: string;
    }) => {
      const body: Schemas["DecideProtonActionRequest"] = {
        conversationId: v.conversationId,
        ...(v.typed != null && { typed: v.typed }),
      };
      return (await http.post<ProtonOutcome>(`/proton/actions/${v.action.id}/${v.decision}`, body))
        .data;
    },
    onSettled: (_outcome, _error, v) => {
      if (v.decision === "confirm") {
        void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "proton" });
      }
      void queryClient.invalidateQueries({ queryKey: actionsKey });
    },
  });
}

/** The person's own proposals and what became of them: a card that lost track of its status reads it here. */
export function useMyProtonActions(enabled: boolean) {
  return useQuery({
    queryKey: actionsKey,
    queryFn: async () => (await http.get<ProtonActionSummary[]>("/proton/actions")).data,
    enabled,
  });
}

/** Ends a conversation on the server; the next question starts a new one. */
export function useEndConversation() {
  return useMutation({
    mutationFn: async (conversationId: string) => {
      await http.delete(`/proton/conversations/${conversationId}`);
    },
  });
}
