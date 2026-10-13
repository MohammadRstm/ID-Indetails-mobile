import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useCurrentUser } from "@/auth/session";
import { minutesOfDay } from "@/format/time";
import { usePermissions } from "@/permissions/usePermissions";
import { spacing } from "@/theme/tokens";
import {
  Button,
  Chip,
  ConfirmDialog,
  IconButton,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
} from "@/ui";
import { useProtonBriefing, useProtonUsage } from "../api";
import { briefingRows } from "../briefing";
import { isReplaced, newestCards } from "../cards";
import { Bubble } from "../components/Bubble";
import { ChatNote } from "../components/ChatNote";
import { LiveReply } from "../components/LiveReply";
import { LockedNote } from "../components/LockedNote";
import { ProtonComposer, type ReplyChip } from "../components/ProtonComposer";
import { ProtonToolbar } from "../components/ProtonToolbar";
import { ProtonMark } from "../components/ProtonMark";
import { ProtonWelcome } from "../components/ProtonWelcome";
import { greetingFor, startersFor } from "../greeting";
import { pageContextOf } from "../pageContext";
import { hrefOfRef } from "../refs";
import { useProtonChat } from "../useProtonChat";
import { useRememberMessage } from "../useRememberMessage";
import { ProtonActionCard } from "./ProtonActionCard";
import { ProtonBlocks } from "./ProtonBlocks";
import { ProtonChats } from "./ProtonChats";
import { ProtonMemories } from "./ProtonMemories";

const MAX_QUESTION = 2000;
const LOOKING = "Looking into it…";

const rememberMessage = (text: string | undefined) =>
  `${text ?? ""}\n\nI'll keep these words to shape how I answer you. You can make me forget them under "What I remember".`;

/**
 * Proton, the assistant (proton:use): questions in plain language, answered from what this person may see. The
 * answer arrives as it is written, with Stop while it does. A change it proposes happens only when the person
 * presses Confirm on its card; typing "yes" confirms nothing. Chats are saved by the API: "Chats" lists them, and
 * Proton opens on the one that was open last. Holding the person's own message offers "Remember this".
 */
export function ProtonScreen() {
  const perms = usePermissions();
  const me = useCurrentUser();
  const page = pageContextOf(useLocalSearchParams(), perms);
  const usage = useProtonUsage();
  const chat = useProtonChat(page);
  const remember = useRememberMessage(chat.conversationId);
  const [panel, setPanel] = useState<"chats" | "memories" | null>(null);
  const [text, setText] = useState("");
  const [minute] = useState(() => minutesOfDay(new Date()));
  const scroller = useRef<ScrollView>(null);

  const { turns, live } = chat;
  const answering = live != null;
  const left = usage.data;
  const blocked = left != null && !left.available;
  const briefing = useProtonBriefing(turns.length === 0 && !blocked && !chat.opening);

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
    if (!question || answering || chat.opening) return;
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
          leading={
            <ProtonMark turns={turns} actions={chat.actions} live={live} blocked={blocked} />
          }
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
        <ProtonToolbar onChats={() => setPanel("chats")} onMemories={() => setPanel("memories")} />
        <ScrollView
          ref={scroller}
          style={styles.fill}
          contentContainerStyle={styles.thread}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {chat.opening ? <Skeleton lines={5} height={18} /> : null}
          {turns.length === 0 && !chat.opening && !chat.locked ? (
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
            if (turn.from === "you") {
              const note = remember.noteFor(i);
              return (
                <View key={i} style={styles.turn}>
                  <Bubble
                    from="you"
                    text={turn.text}
                    onLongPress={remember.available ? () => remember.ask(i, turn.text) : undefined}
                    longPressLabel="remember this"
                  />
                  {note ? <ChatNote text={note} /> : null}
                </View>
              );
            }
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
                {turn.blocks.length > 0 ? <ProtonBlocks blocks={turn.blocks} /> : null}
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

        {chat.locked ? (
          <LockedNote reason={chat.locked} onNewChat={chat.startOver} />
        ) : (
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
        )}
      </KeyboardAvoidingView>

      <ProtonChats
        visible={panel === "chats"}
        onClose={() => setPanel(null)}
        currentId={chat.conversationId}
        onOpen={chat.open}
        onNew={() => {
          chat.startOver();
          setPanel(null);
        }}
        onDeleted={(id) => {
          if (id === chat.conversationId) chat.startOver();
        }}
      />
      <ProtonMemories visible={panel === "memories"} onClose={() => setPanel(null)} />
      <ConfirmDialog
        visible={remember.target != null}
        title="Remember this?"
        message={rememberMessage(remember.target?.text)}
        confirmLabel="Remember"
        busy={remember.busy}
        onConfirm={remember.confirm}
        onCancel={remember.cancel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  thread: { padding: spacing.l, gap: spacing.m },
  turn: { gap: spacing.s },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.s },
});
