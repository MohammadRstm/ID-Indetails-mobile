import { useConversations, useTeamMembers } from "../api";
import { ChatThread } from "./ChatThread";

export type TeamChatScreenProps = {
  teamId: number;
};

/** A team's chat: the team's people, their domain's admins and the super admins. */
export function TeamChatScreen({ teamId }: TeamChatScreenProps) {
  const conversations = useConversations();
  const members = useTeamMembers(teamId);
  const team = conversations.data?.find((c) => c.team?.id === teamId)?.team;
  const count = members.data?.length;
  return (
    <ChatThread
      chat={{ kind: "team", teamId }}
      title={team?.name ?? "Team chat"}
      subtitle={count ? `${count} people` : undefined}
    />
  );
}
