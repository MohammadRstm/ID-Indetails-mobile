import { RecordPaymentScreen } from "@/features/billing/screens/RecordPaymentScreen";
import { useIdParam } from "@/navigation/params";

export default function RecordPaymentRoute() {
  const invoiceId = useIdParam("invoiceId");
  return <RecordPaymentScreen invoiceId={invoiceId} />;
}
