import { router, useIsFocused } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import { ProtonEntry } from "@/features/proton/slots/ProtonEntry";
import { photoOf } from "@/features/work/photos";
import { useOfflineBanner } from "@/offline/useOnline";
import {
  Avatar,
  Card,
  EmptyState,
  IconButton,
  InlineError,
  ListRow,
  Screen,
  ScreenHeader,
  Section,
  Sheet,
  Skeleton,
  TextField,
} from "@/ui";
import { useContacts, useConversations, usePresence, type Chat } from "../api";
import { ConversationRow } from "../components/ConversationRow";
import { chatOf } from "../model";

function openChat(chat: Chat) {
  if (chat.kind === "team") {
    router.push({ pathname: "/messages/team/[teamId]", params: { teamId: String(chat.teamId) } });
  } else {
    router.push({ pathname: "/messages/direct/[userId]", params: { userId: String(chat.userId) } });
  }
}

/** Team chats, then direct chats, newest first, with unread counts; and starting a chat with someone. */
export function ConversationsScreen() {
  const focused = useIsFocused();
  const conversations = useConversations();
  const presence = usePresence(focused);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const contacts = useContacts(picking);
  const banner = useOfflineBanner(conversations.dataUpdatedAt);
  const online = new Set(presence.data ?? []);
  const list = conversations.data ?? [];
  const teams = list.filter((c) => c.type === "group");
  const direct = list.filter((c) => c.type !== "group");
  const needle = search.trim().toLowerCase();
  const people = (contacts.data ?? []).filter(
    (c) => !needle || c.name.toLowerCase().includes(needle),
  );

  const section = (title: string, items: typeof list) =>
    items.length === 0 ? null : (
      <Section title={title}>
        <Card padded={false}>
          {items.map((c, i) => {
            const chat = chatOf(c);
            return (
              <ConversationRow
                key={c.team ? `t${c.team.id}` : `d${c.person?.id}`}
                conversation={c}
                photo={photoOf(c.person?.photoFileId)}
                online={c.person ? online.has(c.person.id) : false}
                divider={i < items.length - 1}
                onPress={() => chat && openChat(chat)}
              />
            );
          })}
        </Card>
      </Section>
    );

  return (
    <Screen
      header={
        <ScreenHeader
          title="Messages"
          actions={
            <>
              <ProtonEntry page="messages" compact />
              <IconButton
                icon="edit"
                accessibilityLabel="New message"
                onPress={() => setPicking(true)}
              />
            </>
          }
        />
      }
      banner={banner}
      refreshing={conversations.isRefetching}
      onRefresh={() => void conversations.refetch()}
    >
      {conversations.isError && !conversations.data ? (
        <InlineError
          what="your chats"
          message={toApiError(conversations.error).message}
          onRetry={() => void conversations.refetch()}
        />
      ) : !conversations.data ? (
        <Skeleton lines={6} height={20} />
      ) : list.length === 0 ? (
        <EmptyState art="search" title="No chats yet" text="Start one with the pencil above." />
      ) : (
        <>
          {section("Teams", teams)}
          {section("Direct", direct)}
        </>
      )}
      <Sheet visible={picking} onClose={() => setPicking(false)} title="New message">
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Search people"
          accessibilityLabel="Search people"
          autoCorrect={false}
        />
        {contacts.isError ? (
          <InlineError
            message={toApiError(contacts.error).message}
            onRetry={() => void contacts.refetch()}
          />
        ) : !contacts.data ? (
          <Skeleton lines={4} />
        ) : (
          people.map((person) => (
            <ListRow
              key={person.id}
              title={person.name}
              subtitle={person.position ?? undefined}
              leading={
                <Avatar
                  name={person.name}
                  photo={photoOf(person.photoFileId)}
                  size={32}
                  presence={online.has(person.id) ? "online" : undefined}
                />
              }
              onPress={() => {
                setPicking(false);
                openChat({ kind: "direct", userId: person.id });
              }}
            />
          ))
        )}
      </Sheet>
    </Screen>
  );
}
