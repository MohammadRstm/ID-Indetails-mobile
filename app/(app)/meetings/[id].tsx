import { Redirect } from "expo-router";
import { MeetingScreen } from "@/features/meetings/screens/MeetingScreen";
import { useIdParam } from "@/navigation/params";

export default function MeetingRoute() {
  const meetingId = useIdParam("id");
  if (meetingId == null) return <Redirect href="/not-available" />;
  return <MeetingScreen meetingId={meetingId} />;
}
