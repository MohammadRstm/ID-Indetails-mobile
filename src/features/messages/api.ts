import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { Conversation, Message, MessagePage, MessagesBadge, Schemas } from "@/api/types";

/*
 * Team chats and direct messages (the API's messaging.md). Every key starts with "messages", so the live
 * signal and a message push reload all of them.
 */

export type Contact = Schemas["ContactResponse"];
export type SendBody = Schemas["SendMessageRequest"];

/** A chat: a team's chat, or the direct chat with one person. */
export type Chat = { kind: "team"; teamId: number } | { kind: "direct"; userId: number };

export const chatPath = (chat: Chat) =>
  chat.kind === "team" ? `/messages/teams/${chat.teamId}` : `/messages/direct/${chat.userId}`;
const chatId = (chat: Chat) =>
  chat.kind === "team" ? `team-${chat.teamId}` : `direct-${chat.userId}`;

export const messageKeys = {
  all: ["messages"] as const,
  conversations: ["messages", "conversations"] as const,
  badge: ["messages", "badge"] as const,
  contacts: ["messages", "contacts"] as const,
  members: (teamId: number) => ["messages", "members", teamId] as const,
  thread: (chat: Chat) => ["messages", "thread", chatId(chat)] as const,
};
export const presenceKey = ["presence"] as const;

export function useConversations() {
  return useQuery({
    queryKey: messageKeys.conversations,
    queryFn: async () => (await http.get<Conversation[]>("/messages/conversations")).data,
  });
}

/** Unread messages, and whether one mentions the person: the Messages tab's count. */
export function useMessagesBadge() {
  return useQuery({
    queryKey: messageKeys.badge,
    queryFn: async () => (await http.get<MessagesBadge>("/messages/badge")).data,
  });
}

export function useContacts(enabled = true) {
  return useQuery({
    queryKey: messageKeys.contacts,
    queryFn: async () => (await http.get<Contact[]>("/messages/contacts")).data,
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** A team chat's members, who can be mentioned in it. */
export function useTeamMembers(teamId: number | null) {
  return useQuery({
    queryKey: messageKeys.members(teamId ?? 0),
    queryFn: async () => (await http.get<Contact[]>(`/messages/teams/${teamId}/members`)).data,
    enabled: teamId != null,
    staleTime: 5 * 60_000,
  });
}

const PAGE = 50;

/** A chat's messages: the newest page first, older ones on request. Each page is oldest first. */
export function useThread(chat: Chat) {
  return useInfiniteQuery({
    queryKey: messageKeys.thread(chat),
    queryFn: async ({ pageParam }) =>
      (
        await http.get<MessagePage>(chatPath(chat), {
          params: { before: pageParam ?? undefined, limit: PAGE },
        })
      ).data,
    initialPageParam: null as number | null,
    getNextPageParam: (page) => (page.hasMore && page.items.length ? page.items[0].id : undefined),
    // The latest page stays in memory a while, so reopening a chat shows it at once.
    gcTime: 30 * 60_000,
  });
}

/** Marks the chat read up to its latest message; the new badge comes back with the answer. */
export function useMarkChatRead(chat: Chat) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await http.post<MessagesBadge>(`${chatPath(chat)}/read`)).data,
    onSuccess: (badge) => {
      queryClient.setQueryData(messageKeys.badge, badge);
      void queryClient.invalidateQueries({ queryKey: messageKeys.conversations });
    },
  });
}

export function useSendMessage(chat: Chat) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SendBody) => (await http.post<Message>(chatPath(chat), body)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.thread(chat) });
      void queryClient.invalidateQueries({ queryKey: messageKeys.conversations });
    },
  });
}

/** Who is online now, asked again each minute while `enabled` (the screen is on show). */
export function usePresence(enabled: boolean) {
  return useQuery({
    queryKey: presenceKey,
    queryFn: async () => (await http.get<Schemas["PresenceResponse"]>("/presence")).data.online,
    refetchInterval: enabled ? 60_000 : false,
    enabled,
  });
}
