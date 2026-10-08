import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type WorkEntryScreenProps = {
  entryId: number;
};

/** One work entry's details. Placeholder until Phase 2 builds it. */
export function WorkEntryScreen(props: WorkEntryScreenProps) {
  return <PlaceholderScreen title="Entry" phase="2" />;
}
