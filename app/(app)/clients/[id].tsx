import { Redirect } from "expo-router";
import { ClientScreen } from "@/features/clients/screens/ClientScreen";
import { useIdParam } from "@/navigation/params";

export default function ClientRoute() {
  const clientId = useIdParam("id");
  if (clientId == null) return <Redirect href="/not-available" />;
  return <ClientScreen clientId={clientId} />;
}
