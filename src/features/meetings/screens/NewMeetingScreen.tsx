import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import { useProjects } from "@/features/projects/api";
import { companyToday, fmtDayDate, fmtRange } from "@/format/time";
import { Button, InlineError, Screen, ScreenHeader, Section, toast } from "@/ui";
import { useCreateMeeting } from "../api";
import { MeetingForm } from "../components/MeetingForm";
import { meetingBody, meetingProblem, type MeetingDraft } from "../model";

export type NewMeetingScreenProps = {
  projectId: number | null;
};

const close = () => (router.canGoBack() ? router.back() : router.replace("/meetings"));

/** Scheduling a meeting on a project (meeting:create); the project comes from where it was opened. */
export function NewMeetingScreen({ projectId }: NewMeetingScreenProps) {
  const projects = useProjects({});
  const create = useCreateMeeting();
  const [draft, setDraft] = useState<MeetingDraft>({
    projectId,
    day: companyToday(),
    startMin: 10 * 60,
    endMin: 11 * 60,
    topic: "",
    description: "",
  });
  const [problem, setProblem] = useState<string | null>(null);
  const open = (projects.data?.items ?? []).filter(
    (p) => p.status === "active" || p.status === "hold",
  );

  async function save() {
    const issue = meetingProblem(draft);
    if (issue || draft.projectId == null) {
      setProblem(issue);
      return;
    }
    try {
      const body = meetingBody(draft);
      const meeting = await create.mutateAsync({ projectId: draft.projectId, body });
      toast({
        text: "Meeting scheduled",
        sub: `${meeting.project.title} · ${fmtDayDate(body.startsAt)} · ${fmtRange(body.startsAt, body.endsAt)}`,
        icon: "calendar",
      });
      close();
    } catch (error) {
      const apiError = toApiError(error);
      setProblem(
        apiError.code === "project_closed"
          ? "This project is closed, so it takes no meetings."
          : apiError.message,
      );
    }
  }

  return (
    <Screen header={<ScreenHeader title="New meeting" onBack={close} />}>
      <Section>
        <MeetingForm
          draft={draft}
          onChange={(next) => {
            setDraft(next);
            setProblem(null);
          }}
          projectOptions={
            projectId == null ? open.map((p) => ({ value: p.id, label: p.title })) : null
          }
        />
      </Section>
      {problem ? <InlineError message={problem} /> : null}
      <Button
        label="Schedule"
        variant="primary"
        size="large"
        fullWidth
        loading={create.isPending}
        onPress={() => void save()}
      />
    </Screen>
  );
}
