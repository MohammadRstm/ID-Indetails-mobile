import { Redirect } from "expo-router";
import { InvoiceScreen } from "@/features/billing/screens/InvoiceScreen";
import { useIdParam } from "@/navigation/params";

export default function InvoiceRoute() {
  const invoiceId = useIdParam("id");
  if (invoiceId == null) return <Redirect href="/not-available" />;
  return <InvoiceScreen invoiceId={invoiceId} />;
}
