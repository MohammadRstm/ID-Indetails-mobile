import { NewMeetingScreen } from "@/features/meetings/screens/NewMeetingScreen";
import { useIdParam } from "@/navigation/params";

export default function NewMeetingRoute() {
  const projectId = useIdParam("projectId");
  return <NewMeetingScreen projectId={projectId} />;
}
