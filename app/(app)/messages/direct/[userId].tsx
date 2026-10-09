import { Redirect } from "expo-router";
import { DirectChatScreen } from "@/features/messages/screens/DirectChatScreen";
import { useIdParam } from "@/navigation/params";

export default function DirectChatRoute() {
  const userId = useIdParam("userId");
  if (userId == null) return <Redirect href="/not-available" />;
  return <DirectChatScreen userId={userId} />;
}
