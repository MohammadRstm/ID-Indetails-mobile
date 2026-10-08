import { Redirect } from "expo-router";
import { TeamChatScreen } from "@/features/messages/screens/TeamChatScreen";
import { useIdParam } from "@/navigation/params";

export default function TeamChatRoute() {
  const teamId = useIdParam("teamId");
  if (teamId == null) return <Redirect href="/not-available" />;
  return <TeamChatScreen teamId={teamId} />;
}
