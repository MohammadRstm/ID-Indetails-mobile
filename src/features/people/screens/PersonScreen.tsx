import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type PersonScreenProps = {
  personId: number;
};

/** One person's profile. Placeholder until Phase 3 builds it. */
export function PersonScreen(props: PersonScreenProps) {
  return <PlaceholderScreen title="Person" phase="3" />;
}
