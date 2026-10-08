import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type InvoiceScreenProps = {
  invoiceId: number;
};

/** One invoice. Placeholder until Phase 4 builds it. */
export function InvoiceScreen(props: InvoiceScreenProps) {
  return <PlaceholderScreen title="Invoice" phase="4" />;
}
