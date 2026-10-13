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
export type ProtonQuickReplyOption = Schemas["ProtonQuickReplyOption"];
export type ProtonBriefing = Schemas["ProtonBriefingResponse"];

/**
 * A typed question, or what a button of the last reply stands for: a choice, a quick reply or a suggestion (its
 * place in the list). A button sends only what it is, never text: the API checks it was offered.
 */
export type AskBody = {
  conversationId: string | null;
  text?: string;
  page?: Schemas["ProtonPageContext"] | null;
  choice?: { type: Schemas["ProtonRefType"]; id: number };
  reply?: Schemas["ProtonQuickReply"];
  suggestion?: number;
};

export const usageKey = ["proton", "usage"] as const;
const actionsKey = ["proton", "actions"] as const;
const briefingKey = ["proton", "briefing"] as const;

/** The JSON endpoint writes the answer whole and can take a while: it gets its own, longer, timeout. */
export const ASK_TIMEOUT_MS = 55_000;

/** The person's question allowance this month, and whether Proton can answer now. */
export function useProtonUsage() {
  return useQuery({
    queryKey: usageKey,
    queryFn: async () => (await http.get<Schemas["ProtonUsageResponse"]>("/proton/usage")).data,
  });
}

/**
 * One question on the JSON endpoint, answered whole: the way to ask when the live stream isn't available. The
 * answer may carry proposed changes, which only the person's Confirm carries out.
 */
export async function askProtonJson(body: AskBody, signal?: AbortSignal): Promise<ProtonReply> {
  const config = { timeout: ASK_TIMEOUT_MS, signal };
  return (await http.post<ProtonReply>("/proton/messages", body, config)).data;
}

/** What may need the person's attention, for Proton's greeting: no model call, no question used. */
export function useProtonBriefing(enabled: boolean) {
  return useQuery({
    queryKey: briefingKey,
    queryFn: async () => (await http.get<ProtonBriefing>("/proton/briefing")).data,
    enabled,
    retry: false,
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
