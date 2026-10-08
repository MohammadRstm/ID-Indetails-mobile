import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { toApiError } from "@/api/errors";
import { routeForTarget } from "@/navigation/targets";
import { usePermissions } from "@/permissions/usePermissions";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { typography } from "@/theme/typography";
import { Button, Chip, IconButton, Screen, ScreenHeader, Text } from "@/ui";
import {
  useAskProton,
  useDecideAction,
  useEndConversation,
  useProtonUsage,
  type AskBody,
  type ProtonChoice,
  type ProtonRef,
} from "../api";
import type { ActionState, ProtonTurn } from "../chat";
import { ActionCard } from "../components/ActionCard";
import { Bubble } from "../components/Bubble";
import { pageContextOf } from "../pageContext";
import { describePlan, planCommands, type CommandPlan } from "../runCommands";

const MAX_QUESTION = 2000;
const THINKING = "Proton is thinking. This can take up to a minute.";

type Question = Omit<AskBody, "conversationId" | "page">;
type ProtonAnswer = Extract<ProtonTurn, { from: "proton" }>;

/**
 * Proton, the assistant (proton:use): questions in plain language, answered from what this person may see. The
 * answer arrives whole. A change it proposes happens only when the person presses Confirm on its card; typing
 * "yes" confirms nothing. The chat lives as long as the screen does.
 */
export function ProtonScreen() {
  const { colors } = useTheme();
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const page = pageContextOf(useLocalSearchParams());
  const usage = useProtonUsage();
  const ask = useAskProton();
  const decide = useDecideAction();
  const end = useEndConversation();
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ProtonTurn[]>([]);
  const [actions, setActions] = useState<Record<string, ActionState>>({});
  const [deciding, setDeciding] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const scroller = useRef<ScrollView>(null);

  // Only the newest proposal can still be confirmed and only the newest reply's choices picked: the API replaced the rest.
  const answers = turns.filter((t): t is ProtonAnswer => t.from === "proton");
  const newestActionId = answers.filter((t) => t.action).at(-1)?.action?.id;
  const lastTurn = turns.length - 1;

  // A proposal that runs out of time closes its own card.
  useEffect(() => {
    const expiries = turns.flatMap((t) =>
      t.from === "proton" && t.action ? [new Date(t.action.expiresAt).getTime()] : [],
    );
    const next = expiries.filter((at) => at > now).sort((a, b) => a - b)[0];
    if (next === undefined) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(next - now + 50, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [turns, now]);

  function carryOut(plan: CommandPlan | null): string | null {
    if (!plan) return null;
    if (plan.kind === "go") router.push(plan.href);
    if (plan.kind === "refresh") {
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "proton" });
    }
    return describePlan(plan);
  }

  function send(question: Question, id: string | null, retried = false) {
    ask.mutate(
      { conversationId: id, page, ...question },
      {
        onSuccess: (reply) => {
          const did = carryOut(planCommands(reply.uiCommands, perms));
          setConversationId(reply.conversationId);
          setTurns((t) => [
            ...t,
            {
              from: "proton",
              text: reply.reply,
              refs: reply.refs,
              sources: reply.sources,
              action: reply.pendingAction,
              choices: reply.choices,
              did,
            },
          ]);
        },
        onError: (error) => {
          const failure = toApiError(error);
          if (failure.code === "proton_conversation_ended" && id != null) {
            // The server no longer has the chat: a typed question is asked again in a new one, a button is not.
            setConversationId(null);
            if (question.text && !retried) return send({ text: question.text }, null, true);
            setTurns((t) => [
              ...t,
              { from: "error", text: `${failure.message} Could you ask that again?` },
            ]);
            return;
          }
          setTurns((t) => [...t, { from: "error", text: failure.message }]);
        },
      },
    );
  }

  function submit(shown: string, question: Question) {
    if (ask.isPending) return;
    setTurns((t) => [...t, { from: "you", text: shown }]);
    send(question, conversationId);
  }

  function typed() {
    const question = text.trim();
    if (!question) return;
    setText("");
    submit(question, { text: question });
  }

  const pick = (choice: ProtonChoice) =>
    submit(choice.label, { choice: { type: choice.type, id: choice.id } });

  function decideAction(turn: ProtonAnswer, decision: "confirm" | "cancel") {
    const action = turn.action;
    if (!action || !conversationId) return;
    const settle = (state: ActionState) => {
      setDeciding(null);
      setActions((a) => ({ ...a, [action.id]: state }));
    };
    setDeciding(action.id);
    decide.mutate(
      { action, conversationId, decision },
      {
        onSuccess: (outcome) => {
          if (decision === "cancel") return settle({ kind: "cancelled" });
          // The API sends where to go only after a change that succeeded and whose card said so.
          const did = carryOut(planCommands(outcome.uiCommands, perms));
          settle({ kind: "done", message: did ? `${outcome.message} ${did}` : outcome.message });
        },
        onError: (error) => settle({ kind: "failed", message: toApiError(error).message }),
      },
    );
  }

  function startOver() {
    if (conversationId) end.mutate(conversationId);
    setConversationId(null);
    setTurns([]);
    setActions({});
  }

  const linkOf = (ref: ProtonRef) =>
    routeForTarget(
      ref.type === "project"
        ? { type: "project", id: ref.id, domain: (ref.domain ?? "") as "design" | "execution" }
        : { type: ref.type, id: ref.id },
      perms,
    );

  const left = usage.data;
  const blocked = left != null && !left.available;
  const usageLine = !left
    ? " "
    : left.companyLimitReached
      ? "Proton has used this month's budget."
      : `${left.questionsRemaining} of ${left.questionsAllowed} questions left this month`;

  return (
    <Screen
      scroll={false}
      padded={false}
      edges={["top", "left", "right", "bottom"]}
      header={
        <ScreenHeader
          title="Proton"
          subtitle="AI assistant"
          onBack={router.canGoBack() ? () => router.back() : undefined}
          actions={
            turns.length > 0 ? (
              <IconButton icon="plus" onPress={startOver} accessibilityLabel="New conversation" />
            ) : undefined
          }
        />
      }
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scroller}
          style={styles.fill}
          contentContainerStyle={styles.thread}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {turns.length === 0 ? (
            <Text tone="secondary">
              Ask me about your projects, clients, people or deadlines. I only use what you are
              allowed to see.
            </Text>
          ) : null}
          {turns.map((turn, i) => {
            if (turn.from !== "proton") return <Bubble key={i} from={turn.from} text={turn.text} />;
            const action = turn.action;
            return (
              <View key={i} style={styles.turn}>
                <Bubble from="proton" text={turn.text}>
                  {turn.refs.length > 0 ? (
                    <View style={styles.chips}>
                      {turn.refs.map((ref) => {
                        const href = linkOf(ref);
                        return (
                          <Chip
                            key={`${ref.type}-${ref.id}`}
                            label={ref.name}
                            onPress={() => {
                              if (href) router.push(href);
                            }}
                          />
                        );
                      })}
                    </View>
                  ) : null}
                  {turn.choices.length > 0 ? (
                    <View style={styles.chips}>
                      {turn.choices.map((choice) => (
                        <Button
                          key={`${choice.type}-${choice.id}`}
                          label={
                            choice.detail ? `${choice.label} · ${choice.detail}` : choice.label
                          }
                          disabled={i !== lastTurn || ask.isPending}
                          onPress={() => pick(choice)}
                        />
                      ))}
                    </View>
                  ) : null}
                  {turn.did ? (
                    <Text variant="small" tone="muted">
                      {turn.did}
                    </Text>
                  ) : null}
                </Bubble>
                {action && conversationId ? (
                  <ActionCard
                    action={action}
                    state={actions[action.id] ?? { kind: "open" }}
                    replaced={action.id !== newestActionId}
                    expired={new Date(action.expiresAt).getTime() <= now}
                    busy={deciding === action.id}
                    onConfirm={() => decideAction(turn, "confirm")}
                    onCancel={() => decideAction(turn, "cancel")}
                  />
                ) : null}
              </View>
            );
          })}
          {ask.isPending ? <Bubble from="proton" text={THINKING} /> : null}
        </ScrollView>

        <View
          style={[
            styles.composer,
            { borderTopColor: colors.line, backgroundColor: colors.surface },
          ]}
        >
          <View style={styles.row}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Ask me anything about the company"
              placeholderTextColor={colors.ink3}
              accessibilityLabel="Ask Proton"
              multiline
              maxLength={MAX_QUESTION}
              editable={!blocked}
              style={[
                typography.body,
                styles.input,
                { color: colors.ink, backgroundColor: colors.surface2, borderColor: colors.line },
              ]}
            />
            <IconButton
              icon="send"
              onPress={typed}
              disabled={!text.trim() || ask.isPending || blocked}
              accessibilityLabel="Send"
            />
          </View>
          <Text variant="small" tone="muted">
            {usageLine}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  thread: { padding: spacing.l, gap: spacing.m },
  turn: { gap: spacing.s },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.s },
  composer: { gap: spacing.xs, padding: spacing.m, borderTopWidth: 1 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.s },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: spacing.touch,
    paddingHorizontal: spacing.row,
    paddingVertical: spacing.s,
    borderWidth: 1,
    borderRadius: radii.input,
  },
});
