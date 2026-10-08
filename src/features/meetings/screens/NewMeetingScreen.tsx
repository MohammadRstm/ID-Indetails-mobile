import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type NewMeetingScreenProps = {
  projectId: number | null;
};

/** Scheduling a meeting; the project comes from `?projectId` when opened from a project. Placeholder until Phase 2 builds it. */
export function NewMeetingScreen(props: NewMeetingScreenProps) {
  return <PlaceholderScreen title="New meeting" phase="2" />;
}
