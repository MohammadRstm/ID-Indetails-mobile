import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type RecordPaymentScreenProps = {
  invoiceId: number | null;
};

/** Recording a payment; `?invoiceId` when opened from an invoice. Placeholder until Phase 4 builds it. */
export function RecordPaymentScreen(props: RecordPaymentScreenProps) {
  return <PlaceholderScreen title="Record a payment" phase="4" />;
}
