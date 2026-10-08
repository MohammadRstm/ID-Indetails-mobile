import { Redirect } from "expo-router";
import { PersonScreen } from "@/features/people/screens/PersonScreen";
import { useIdParam } from "@/navigation/params";

export default function PersonRoute() {
  const personId = useIdParam("id");
  if (personId == null) return <Redirect href="/not-available" />;
  return <PersonScreen personId={personId} />;
}
