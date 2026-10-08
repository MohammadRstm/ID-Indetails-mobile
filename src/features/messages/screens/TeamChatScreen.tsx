import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type TeamChatScreenProps = {
  teamId: number;
};

/** A team's chat. Placeholder until Phase 2 builds it. */
export function TeamChatScreen(props: TeamChatScreenProps) {
  return <PlaceholderScreen title="Team chat" phase="2" />;
}
