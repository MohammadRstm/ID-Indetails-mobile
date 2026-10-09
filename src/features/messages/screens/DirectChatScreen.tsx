import { useIsFocused } from "expo-router";
import { useContacts, useConversations, usePresence } from "../api";
import { ChatThread } from "./ChatThread";

export type DirectChatScreenProps = {
  userId: number;
};

/** A direct chat with one person, with whether they are online now. */
export function DirectChatScreen({ userId }: DirectChatScreenProps) {
  const focused = useIsFocused();
  const conversations = useConversations();
  const contacts = useContacts();
  const presence = usePresence(focused);
  const person =
    conversations.data?.find((c) => c.person?.id === userId)?.person ??
    contacts.data?.find((c) => c.id === userId);
  const online = presence.data?.includes(userId);
  return (
    <ChatThread
      chat={{ kind: "direct", userId }}
      title={person?.name ?? "Chat"}
      subtitle={online ? "Online now" : (person?.position ?? undefined)}
    />
  );
}
