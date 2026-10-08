import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type MeetingScreenProps = {
  meetingId: number;
};

/** One meeting. Placeholder until Phase 2 builds it. */
export function MeetingScreen(props: MeetingScreenProps) {
  return <PlaceholderScreen title="Meeting" phase="2" />;
}
