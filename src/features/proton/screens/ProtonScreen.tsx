import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useCurrentUser } from "@/auth/session";
import { minutesOfDay } from "@/format/time";
import { usePermissions } from "@/permissions/usePermissions";
import { spacing } from "@/theme/tokens";
import { Button, Chip, IconButton, Screen, ScreenHeader, Text } from "@/ui";
import { useProtonBriefing, useProtonUsage } from "../api";
import { briefingRows } from "../briefing";
import { isReplaced, newestCards } from "../cards";
import { Bubble } from "../components/Bubble";
import { ChatNote } from "../components/ChatNote";
import { LiveReply } from "../components/LiveReply";
import { ProtonComposer, type ReplyChip } from "../components/ProtonComposer";
import { ProtonWelcome } from "../components/ProtonWelcome";
import { greetingFor, startersFor } from "../greeting";
import { pageContextOf } from "../pageContext";
import { hrefOfRef } from "../refs";
import { useProtonChat } from "../useProtonChat";
import { ProtonActionCard } from "./ProtonActionCard";

const MAX_QUESTION = 2000;
const LOOKING = "Looking into it…";

/**
 * Proton, the assistant (proton:use): questions in plain language, answered from what this person may see. The
 * answer arrives as it is written, with Stop while it does. A change it proposes happens only when the person
 * presses Confirm on its card; typing "yes" confirms nothing. The chat lives as long as the screen does.
 */
export function ProtonScreen() {
  const perms = usePermissions();
  const me = useCurrentUser();
  const page = pageContextOf(useLocalSearchParams(), perms);
  const usage = useProtonUsage();
  const chat = useProtonChat(page);
  const [text, setText] = useState("");
  const [minute] = useState(() => minutesOfDay(new Date()));
  const scroller = useRef<ScrollView>(null);

  const { turns, live } = chat;
  const answering = live != null;
  const left = usage.data;
  const blocked = left != null && !left.available;
  const briefing = useProtonBriefing(turns.length === 0 && !blocked);

  const welcomeRows = briefingRows(briefing.data, perms).map(({ href, ...row }) => ({
    ...row,
    onPress: href ? () => router.push(href) : undefined,
  }));

  // A newer card for the same change replaces only its own. Only the newest reply's buttons can be pressed.
  const newest = newestCards(turns);
  const lastTurn = turns.length - 1;
  const newestReply = turns[lastTurn];
  const chips: ReplyChip[] =
    newestReply?.from === "proton" && !answering
      ? [
          ...newestReply.quickReplies.map((option) => ({
            key: `reply-${option.reply}`,
            label: option.label,
            onPress: () => chat.quickReply(option),
          })),
          ...newestReply.suggestions.map((suggestion, index) => ({
            key: `suggestion-${index}`,
            label: suggestion,
            onPress: () => chat.suggest(suggestion, index),
          })),
        ]
      : [];

  function typed() {
    const question = text.trim();
    if (!question || answering) return;
    setText("");
    chat.ask(question);
  }

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
              <IconButton
                icon="plus"
                onPress={chat.startOver}
                accessibilityLabel="New conversation"
              />
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
            <ProtonWelcome
              greeting={greetingFor(me.firstName, minute)}
              rows={welcomeRows}
              more={briefing.data?.more ?? 0}
              starters={startersFor(page, perms)}
              onStarter={blocked || answering ? () => undefined : chat.ask}
            />
          ) : null}
          {turns.map((turn, i) => {
            if (turn.from === "note") return <ChatNote key={i} text={turn.text} />;
            if (turn.from !== "proton") return <Bubble key={i} from={turn.from} text={turn.text} />;
            return (
              <View key={i} style={styles.turn}>
                <Bubble from="proton" text={turn.text}>
                  {turn.refs.length > 0 ? (
                    <View style={styles.chips}>
                      {turn.refs.map((ref) => {
                        const href = hrefOfRef(ref, perms);
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
                          disabled={i !== lastTurn || answering}
                          onPress={() => chat.pick(choice)}
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
                {chat.conversationId
                  ? turn.cards.map((card) => (
                      <ProtonActionCard
                        key={card.id}
                        action={card}
                        conversationId={chat.conversationId!}
                        state={chat.actions[card.id] ?? { kind: "open" }}
                        replaced={isReplaced(card, newest)}
                        onDecided={(state) => chat.setAction(card.id, state)}
                      />
                    ))
                  : null}
              </View>
            );
          })}
          {live ? (
            <LiveReply text={live.text?.text ?? null} status={live.status ?? LOOKING} />
          ) : null}
        </ScrollView>

        <ProtonComposer
          text={text}
          onTextChange={setText}
          maxLength={MAX_QUESTION}
          blocked={blocked}
          answering={answering}
          onSend={typed}
          onStop={chat.stop}
          chips={chips}
          usageLine={usageLine}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  thread: { padding: spacing.l, gap: spacing.m },
  turn: { gap: spacing.s },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.s },
});
