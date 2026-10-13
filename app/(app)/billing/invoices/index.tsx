import { INVOICE_FILTER_VALUES, InvoicesScreen } from "@/features/billing/screens/InvoicesScreen";
import { useChoiceParam } from "@/navigation/params";

export default function InvoicesRoute() {
  const filter = useChoiceParam("filter", INVOICE_FILTER_VALUES);
  // keyed, so a link that arrives while the list is open starts it on its filter
  return <InvoicesScreen key={filter ?? "all"} initialFilter={filter} />;
}
