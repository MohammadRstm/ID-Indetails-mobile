import NetInfo from "@react-native-community/netinfo";
import { randomUUID } from "expo-crypto";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { toApiError } from "@/api/errors";
import type { Message } from "@/api/types";
import { useCurrentUser } from "@/auth/session";
import { takeProtonDraft } from "@/features/proton/drafts";
import { photoOf, pickMedia, thumbSource, uploadMedia } from "@/features/work/photos";
import { spacing } from "@/theme/tokens";
import { EmptyState, InlineError, Screen, ScreenHeader, Skeleton } from "@/ui";
import { useMarkChatRead, useSendMessage, useTeamMembers, useThread, type Chat } from "../api";
import { Composer, type PickedFile } from "../components/Composer";
import { MessageBubble, OutgoingBubble, type Outgoing } from "../components/MessageBubble";
import {
  insertMention,
  LARGE_VIDEO_BYTES,
  MAX_ATTACHMENTS,
  mentionIds,
  mentionQuery,
  startsRun,
} from "../model";
import { setOpenChat } from "../openChat";

type ChatThreadProps = {
  chat: Chat;
  title: string;
  subtitle?: string;
};

type Row = { key: string; message?: Message; showSender?: boolean; outgoing?: Outgoing };

const back = () => (router.canGoBack() ? router.back() : router.replace("/messages"));

/**
 * A chat: its history newest at the bottom (an inverted list paged backwards), read marking while it is open,
 * and sending with the message shown at once.
 */
export function ChatThread({ chat, title, subtitle }: ChatThreadProps) {
  const me = useCurrentUser();
  const thread = useThread(chat);
  const members = useTeamMembers(chat.kind === "team" ? chat.teamId : null);
  const markRead = useMarkChatRead(chat);
  const send = useSendMessage(chat);
  const [draft] = useState(() => takeProtonDraft(chat));
  const [text, setText] = useState(draft ?? "");
  const [fromProton, setFromProton] = useState(draft != null);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [uploading, setUploading] = useState(0);
  const [mentioned, setMentioned] = useState<{ id: number; name: string }[]>([]);
  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chatKey = chat.kind === "team" ? `t${chat.teamId}` : `d${chat.userId}`;
  useEffect(() => {
    setOpenChat(chat);
    return () => setOpenChat(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the chat is the same while the key is
  }, [chatKey]);

  const pages = thread.data?.pages ?? [];
  const latestId = pages[0]?.items[pages[0].items.length - 1]?.id ?? null;
  const { mutate: markChatRead } = markRead;
  useEffect(() => {
    if (latestId != null) markChatRead();
  }, [latestId, markChatRead]);

  // Oldest first across pages, then turned round for the inverted list.
  const messages = [...pages].reverse().flatMap((page) => page.items);
  const rows: Row[] = [
    ...[...outgoing].reverse().map((o) => ({ key: o.tempId, outgoing: o })),
    ...messages
      .map((m, i) => ({ key: String(m.id), message: m, showSender: startsRun(m, messages[i - 1]) }))
      .reverse(),
  ];

  const memberList = members.data ?? [];
  const query = chat.kind === "team" ? mentionQuery(text) : null;
  const candidates =
    query == null
      ? []
      : memberList
          .filter((p) => p.id !== me.id && p.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6);
  const mentionNames = memberList.map((p) => p.name);
  const canSend = (text.trim().length > 0 || files.length > 0) && uploading === 0;

  async function deliver(item: Outgoing) {
    setOutgoing((list) =>
      list.map((o) => (o.tempId === item.tempId ? { ...o, status: "sending" } : o)),
    );
    try {
      await send.mutateAsync({
        body: item.body,
        mentionIds: item.mentionIds,
        attachmentIds: item.attachmentIds,
      });
      setOutgoing((list) => list.filter((o) => o.tempId !== item.tempId));
    } catch {
      setOutgoing((list) =>
        list.map((o) => (o.tempId === item.tempId ? { ...o, status: "failed" } : o)),
      );
    }
  }

  function submit() {
    if (!canSend) return;
    const item: Outgoing = {
      tempId: randomUUID(),
      body: text.trim(),
      mentionIds: mentionIds(text, mentioned),
      attachmentIds: files.map((f) => f.id),
      previews: files.filter((f) => !f.video).map((f) => f.uri),
      status: "sending",
    };
    setOutgoing((list) => [...list, item]);
    setText("");
    setFromProton(false);
    setFiles([]);
    setMentioned([]);
    setWarning(null);
    void deliver(item);
  }

  async function addFiles(source: "camera" | "library") {
    setError(null);
    const room = MAX_ATTACHMENTS - files.length;
    if (room <= 0) return;
    try {
      const result = await pickMedia(source, { videos: true, limit: room });
      if (result.status === "denied") {
        setError("Turn on the camera and photos for ID InDetails in your phone's settings.");
        return;
      }
      if (result.status !== "picked") return;
      const network = await NetInfo.fetch();
      if (
        network.type === "cellular" &&
        result.media.some((m) => m.kind === "video" && (m.sizeBytes ?? 0) > LARGE_VIDEO_BYTES)
      ) {
        setWarning("That video is over 20 MB and you're on mobile data.");
      }
      for (const media of result.media) {
        setUploading((n) => n + 1);
        try {
          const saved = await uploadMedia(media);
          setFiles((list) => [
            ...list,
            { id: saved.id, uri: media.uri, video: media.kind === "video" },
          ]);
        } catch (e) {
          setError(toApiError(e).message);
        } finally {
          setUploading((n) => n - 1);
        }
      }
    } catch (e) {
      setError(toApiError(e).message);
    }
  }

  return (
    <Screen
      scroll={false}
      padded={false}
      edges={["top", "left", "right", "bottom"]}
      header={<ScreenHeader title={title} subtitle={subtitle} onBack={back} />}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        {thread.isError && !thread.data ? (
          <View style={styles.pad}>
            <InlineError
              what="the messages"
              message={toApiError(thread.error).message}
              onRetry={() => void thread.refetch()}
            />
          </View>
        ) : !thread.data ? (
          <View style={styles.pad}>
            <Skeleton lines={6} height={18} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.fill}>
            <EmptyState art="search" title="No messages yet" text="Say hello." />
          </View>
        ) : (
          <FlatList
            inverted
            data={rows}
            keyExtractor={(row) => row.key}
            contentContainerStyle={styles.list}
            onEndReached={() => {
              if (thread.hasNextPage && !thread.isFetchingNextPage) void thread.fetchNextPage();
            }}
            onEndReachedThreshold={0.3}
            renderItem={({ item }) =>
              item.outgoing ? (
                <OutgoingBubble
                  outgoing={item.outgoing}
                  mine
                  imageSource={thumbSource}
                  onRetry={() => item.outgoing && void deliver(item.outgoing)}
                />
              ) : item.message ? (
                <MessageBubble
                  message={item.message}
                  mine={item.message.sender.id === me.id}
                  showSender={!!item.showSender}
                  senderPhoto={photoOf(item.message.sender.photoFileId)}
                  mentionNames={mentionNames}
                  imageSource={thumbSource}
                />
              ) : null
            }
          />
        )}
        <Composer
          text={text}
          onTextChange={setText}
          mentionCandidates={candidates}
          onMention={(person) => {
            setText(insertMention(text, person.name));
            setMentioned((list) => [...list, person]);
          }}
          files={files}
          uploading={uploading}
          onRemoveFile={(id) => setFiles((list) => list.filter((f) => f.id !== id))}
          onCamera={() => void addFiles("camera")}
          onLibrary={() => void addFiles("library")}
          canAddFiles={files.length + uploading < MAX_ATTACHMENTS}
          warning={warning}
          error={error}
          canSend={canSend}
          onSend={submit}
          fromProton={fromProton}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { flex: 1, padding: spacing.l },
  list: { paddingVertical: spacing.m },
});
