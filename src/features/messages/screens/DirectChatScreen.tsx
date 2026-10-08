import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type DirectChatScreenProps = {
  userId: number;
};

/** A direct chat with one person. Placeholder until Phase 2 builds it. */
export function DirectChatScreen(props: DirectChatScreenProps) {
  return <PlaceholderScreen title="Chat" phase="2" />;
}
