import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type ClientScreenProps = {
  clientId: number;
};

/** One client. Placeholder until Phase 3 builds it. */
export function ClientScreen(props: ClientScreenProps) {
  return <PlaceholderScreen title="Client" phase="3" />;
}
